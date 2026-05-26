/**
 * PlexusMap — Cross-reference ASSA entries with PlexusMap DB
 *
 * Reads assa-raw.json and compares against the PlexusMap database
 * using fuzzy name matching (Levenshtein + token-based).
 *
 * Usage: npx tsx scripts/cross-reference-assa.ts
 *
 * Requires:
 *   - scripts/output/assa-raw.json (from import-assa.ts)
 *   - DATABASE_URL env var
 *
 * Output:
 *   - scripts/output/assa-matched.json
 *   - scripts/output/assa-new.json
 *   - scripts/output/assa-stats.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeName, combinedSimilarity } from './utils/normalize';

const prisma = new PrismaClient();

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const INPUT_FILE = path.join(OUTPUT_DIR, 'assa-raw.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'assa-matched.json');
const NEW_FILE = path.join(OUTPUT_DIR, 'assa-new.json');
const STATS_FILE = path.join(OUTPUT_DIR, 'assa-stats.json');

const SIMILARITY_THRESHOLD = 0.7;

interface AssaEntry {
  name: string;
  specialty: string;
  location: string;
  phone: string;
  province: string;
  website?: string;
  source: string;
}

interface MatchedEntry extends AssaEntry {
  plexusMapId: string;
  plexusMapName: string;
  plexusMapSlug: string;
  similarity: number;
  hasAssa: boolean;
}

interface NewEntry extends AssaEntry {
  bestMatchName: string | null;
  bestMatchSimilarity: number;
}

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — ASSA Cross-Reference');
  console.log('============================================\n');

  // 1. Load ASSA data
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    console.error('Run import-assa.ts first.');
    process.exit(1);
  }

  const assaEntries: AssaEntry[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${assaEntries.length} ASSA entries`);

  // 2. Load PlexusMap professionals
  const plexusPros = await prisma.professional.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      insurances: {
        include: { insurance: true },
      },
    },
  });
  console.log(`Loaded ${plexusPros.length} PlexusMap professionals\n`);

  // Pre-normalize PlexusMap names
  const plexusNormalized = plexusPros.map(p => ({
    ...p,
    normalized: normalizeName(p.name),
    hasAssa: p.insurances.some(pi => pi.insurance.name.toLowerCase().includes('assa')),
  }));

  // 3. Cross-reference
  const matched: MatchedEntry[] = [];
  const newEntries: NewEntry[] = [];
  let skippedDuplicates = 0;
  const seenNames = new Set<string>();

  for (const entry of assaEntries) {
    // Deduplicate by normalized name
    const normalizedName = normalizeName(entry.name);
    if (seenNames.has(normalizedName)) {
      skippedDuplicates++;
      continue;
    }
    seenNames.add(normalizedName);

    // Find best match in PlexusMap
    let bestMatch: (typeof plexusNormalized)[0] | null = null;
    let bestSim = 0;

    for (const plexus of plexusNormalized) {
      const sim = combinedSimilarity(entry.name, plexus.name);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = plexus;
      }
    }

    if (bestMatch && bestSim >= SIMILARITY_THRESHOLD) {
      matched.push({
        ...entry,
        plexusMapId: bestMatch.id,
        plexusMapName: bestMatch.name,
        plexusMapSlug: bestMatch.slug,
        similarity: Math.round(bestSim * 1000) / 1000,
        hasAssa: bestMatch.hasAssa,
      });
    } else {
      newEntries.push({
        ...entry,
        bestMatchName: bestMatch?.name || null,
        bestMatchSimilarity: Math.round(bestSim * 1000) / 1000,
      });
    }
  }

  // 4. Stats
  const matchedNeedingAssa = matched.filter(m => !m.hasAssa);

  const newBySpecialty = new Map<string, number>();
  for (const d of newEntries) {
    newBySpecialty.set(d.specialty, (newBySpecialty.get(d.specialty) || 0) + 1);
  }

  const stats = {
    totalExtracted: assaEntries.length,
    uniqueAfterDedup: assaEntries.length - skippedDuplicates,
    skippedDuplicates,
    matched: matched.length,
    matchedNeedingAssa: matchedNeedingAssa.length,
    matchedAlreadyHaveAssa: matched.length - matchedNeedingAssa.length,
    newEntries: newEntries.length,
    similarityThreshold: SIMILARITY_THRESHOLD,
  };

  // 5. Output
  console.log('============================================');
  console.log('RESULTS:');
  console.log(`  Total from ASSA pages: ${stats.totalExtracted}`);
  console.log(`  Unique (after dedup): ${stats.uniqueAfterDedup}`);
  console.log(`  Matched in PlexusMap: ${stats.matched}`);
  console.log(`    - Need ASSA insurance added: ${stats.matchedNeedingAssa}`);
  console.log(`    - Already have ASSA: ${stats.matchedAlreadyHaveAssa}`);
  console.log(`  New (not in PlexusMap): ${stats.newEntries}`);

  console.log('\nNew entries by specialty/type:');
  for (const [spec, count] of [...newBySpecialty.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${spec}: ${count}`);
  }

  // Close misses
  const closeMisses = newEntries
    .filter(d => d.bestMatchSimilarity >= 0.5 && d.bestMatchSimilarity < SIMILARITY_THRESHOLD)
    .slice(0, 10);

  if (closeMisses.length > 0) {
    console.log('\nClose misses (sim 0.5-0.7, review manually):');
    for (const d of closeMisses) {
      console.log(`  "${d.name}" ~ "${d.bestMatchName}" (${d.bestMatchSimilarity})`);
    }
  }

  // Save files
  fs.writeFileSync(MATCHED_FILE, JSON.stringify(matched, null, 2));
  fs.writeFileSync(NEW_FILE, JSON.stringify(newEntries, null, 2));
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));

  console.log(`\nFiles saved:`);
  console.log(`  ${MATCHED_FILE}`);
  console.log(`  ${NEW_FILE}`);
  console.log(`  ${STATS_FILE}`);

  await prisma.$disconnect();
  console.log('\nDone!');
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
