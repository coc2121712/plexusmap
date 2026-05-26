/**
 * PlexusMap — Cross-reference BCBS providers with PlexusMap DB
 *
 * Reads bcbs-raw.json and compares against the PlexusMap database
 * using fuzzy name matching (Levenshtein distance).
 *
 * Usage: npx tsx scripts/cross-reference-bcbs.ts
 *
 * Requires:
 *   - scripts/output/bcbs-raw.json (from import-bcbs.ts)
 *   - DATABASE_URL env var
 *
 * Output:
 *   - scripts/output/bcbs-matched.json  (existing in PlexusMap)
 *   - scripts/output/bcbs-new.json      (new, not in PlexusMap)
 *   - scripts/output/bcbs-stats.json    (summary)
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeName, combinedSimilarity } from './utils/normalize';

const prisma = new PrismaClient();

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const INPUT_FILE = path.join(OUTPUT_DIR, 'bcbs-raw.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'bcbs-matched.json');
const NEW_FILE = path.join(OUTPUT_DIR, 'bcbs-new.json');
const STATS_FILE = path.join(OUTPUT_DIR, 'bcbs-stats.json');

const SIMILARITY_THRESHOLD = 0.7;

interface BcbsEntry {
  name: string;
  specialty: string;
  subSpecialty: string | null;
  type: string;
  location: string;
  phone: string;
  area: string;
  province: string;
  source: string;
}

interface MatchedEntry extends BcbsEntry {
  plexusMapId: string;
  plexusMapName: string;
  similarity: number;
  hasBcbs: boolean;
}

interface NewEntry extends BcbsEntry {
  bestMatchName: string | null;
  bestMatchSimilarity: number;
}

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — BCBS Cross-Reference');
  console.log('============================================\n');

  // 1. Load BCBS data
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    console.error('Run import-bcbs.ts first.');
    process.exit(1);
  }

  const bcbsEntries: BcbsEntry[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${bcbsEntries.length} BCBS entries`);

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

  // Pre-normalize PlexusMap names for performance
  const plexusNormalized = plexusPros.map(p => ({
    ...p,
    normalized: normalizeName(p.name),
    hasBcbs: p.insurances.some(pi =>
      pi.insurance.name.toLowerCase().includes('blue cross') ||
      pi.insurance.name.toLowerCase().includes('bcbs')
    ),
  }));

  // 3. Cross-reference
  const matched: MatchedEntry[] = [];
  const newEntries: NewEntry[] = [];
  let skippedDuplicates = 0;
  const seenNames = new Set<string>();

  for (const entry of bcbsEntries) {
    // Deduplicate by normalized name within BCBS data
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
        similarity: Math.round(bestSim * 1000) / 1000,
        hasBcbs: bestMatch.hasBcbs,
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
  const matchedNeedingBcbs = matched.filter(m => !m.hasBcbs);

  const newBySpecialty = new Map<string, number>();
  for (const d of newEntries) {
    newBySpecialty.set(d.specialty, (newBySpecialty.get(d.specialty) || 0) + 1);
  }

  const newByType = new Map<string, number>();
  for (const d of newEntries) {
    newByType.set(d.type, (newByType.get(d.type) || 0) + 1);
  }

  const stats = {
    totalExtracted: bcbsEntries.length,
    uniqueAfterDedup: bcbsEntries.length - skippedDuplicates,
    skippedDuplicates,
    matched: matched.length,
    matchedNeedingBcbs: matchedNeedingBcbs.length,
    matchedAlreadyHaveBcbs: matched.length - matchedNeedingBcbs.length,
    newProfessionals: newEntries.length,
    similarityThreshold: SIMILARITY_THRESHOLD,
    bySpecialty: Object.fromEntries(newBySpecialty),
    byType: Object.fromEntries(newByType),
  };

  // 5. Output
  console.log('============================================');
  console.log('RESULTS:');
  console.log(`  Total from BCBS JSON: ${stats.totalExtracted}`);
  console.log(`  Unique (after dedup): ${stats.uniqueAfterDedup}`);
  console.log(`  Matched in PlexusMap: ${stats.matched}`);
  console.log(`    - Need BCBS insurance added: ${stats.matchedNeedingBcbs}`);
  console.log(`    - Already have BCBS: ${stats.matchedAlreadyHaveBcbs}`);
  console.log(`  New (not in PlexusMap): ${stats.newProfessionals}`);

  console.log('\nNew entries by specialty (top 15):');
  const sortedSpecs = [...newBySpecialty.entries()].sort((a, b) => b[1] - a[1]);
  for (const [spec, count] of sortedSpecs.slice(0, 15)) {
    console.log(`  ${spec}: ${count}`);
  }

  console.log('\nNew entries by type:');
  for (const [type, count] of [...newByType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  // Sample of close matches that weren't above threshold
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
