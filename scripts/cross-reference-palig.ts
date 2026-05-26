/**
 * PlexusMap — Cross-reference PALIG providers with PlexusMap DB
 *
 * Usage: npx tsx scripts/cross-reference-palig.ts
 *
 * Requires:
 *   - scripts/output/palig-raw.json (from import-palig.ts)
 *   - DATABASE_URL env var
 *
 * Output:
 *   - scripts/output/palig-matched.json
 *   - scripts/output/palig-new.json
 *   - scripts/output/palig-stats.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeName, combinedSimilarity } from './utils/normalize';

const prisma = new PrismaClient();

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const INPUT_FILE = path.join(OUTPUT_DIR, 'palig-raw.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'palig-matched.json');
const NEW_FILE = path.join(OUTPUT_DIR, 'palig-new.json');
const STATS_FILE = path.join(OUTPUT_DIR, 'palig-stats.json');

const SIMILARITY_THRESHOLD = 0.7;

// PALIG insurance ID from PlexusMap: "Pan American Life"
const PALIG_INSURANCE_NAME = 'Pan American Life';

interface PaligEntry {
  name: string;
  specialty: string;
  type: string;
  location: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  lat: number | null;
  lng: number | null;
  network: string;
  province: string;
  source: string;
}

interface MatchedEntry extends PaligEntry {
  plexusMapId: string;
  plexusMapName: string;
  similarity: number;
  hasPalig: boolean;
}

interface NewEntry extends PaligEntry {
  bestMatchName: string | null;
  bestMatchSimilarity: number;
}

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — PALIG Cross-Reference');
  console.log('============================================\n');

  // 1. Load PALIG data
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    console.error('Run import-palig.ts first.');
    process.exit(1);
  }

  const paligEntries: PaligEntry[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${paligEntries.length} PALIG entries`);

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

  // Pre-normalize
  const plexusNormalized = plexusPros.map(p => ({
    ...p,
    normalized: normalizeName(p.name),
    hasPalig: p.insurances.some(pi =>
      pi.insurance.name.toLowerCase().includes('pan american') ||
      pi.insurance.name.toLowerCase().includes('palig')
    ),
  }));

  // 3. Cross-reference
  const matched: MatchedEntry[] = [];
  const newEntries: NewEntry[] = [];
  let skippedDuplicates = 0;
  const seenNames = new Set<string>();

  for (const entry of paligEntries) {
    const normalizedName = normalizeName(entry.name);
    if (seenNames.has(normalizedName)) {
      skippedDuplicates++;
      continue;
    }
    seenNames.add(normalizedName);

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
        hasPalig: bestMatch.hasPalig,
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
  const matchedNeedingPalig = matched.filter(m => !m.hasPalig);

  const newByType = new Map<string, number>();
  for (const d of newEntries) {
    newByType.set(d.type, (newByType.get(d.type) || 0) + 1);
  }

  const newByProvince = new Map<string, number>();
  for (const d of newEntries) {
    newByProvince.set(d.province, (newByProvince.get(d.province) || 0) + 1);
  }

  const stats = {
    totalExtracted: paligEntries.length,
    uniqueAfterDedup: paligEntries.length - skippedDuplicates,
    skippedDuplicates,
    matched: matched.length,
    matchedNeedingPalig: matchedNeedingPalig.length,
    matchedAlreadyHavePalig: matched.length - matchedNeedingPalig.length,
    newProfessionals: newEntries.length,
    similarityThreshold: SIMILARITY_THRESHOLD,
    byType: Object.fromEntries(newByType),
    byProvince: Object.fromEntries(newByProvince),
  };

  // 5. Output
  console.log('============================================');
  console.log('RESULTS:');
  console.log(`  Total from PALIG API: ${stats.totalExtracted}`);
  console.log(`  Unique (after dedup): ${stats.uniqueAfterDedup}`);
  console.log(`  Matched in PlexusMap: ${stats.matched}`);
  console.log(`    - Need PALIG insurance added: ${stats.matchedNeedingPalig}`);
  console.log(`    - Already have PALIG: ${stats.matchedAlreadyHavePalig}`);
  console.log(`  New (not in PlexusMap): ${stats.newProfessionals}`);

  console.log('\nNew entries by type:');
  for (const [type, count] of [...newByType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('\nNew entries by province:');
  for (const [prov, count] of [...newByProvince.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${prov}: ${count}`);
  }

  const closeMisses = newEntries
    .filter(d => d.bestMatchSimilarity >= 0.5 && d.bestMatchSimilarity < SIMILARITY_THRESHOLD)
    .slice(0, 10);

  if (closeMisses.length > 0) {
    console.log('\nClose misses (sim 0.5-0.7, review manually):');
    for (const d of closeMisses) {
      console.log(`  "${d.name}" ~ "${d.bestMatchName}" (${d.bestMatchSimilarity})`);
    }
  }

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
