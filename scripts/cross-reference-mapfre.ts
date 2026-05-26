/**
 * PlexusMap — Cross-reference Mapfre doctors with PlexusMap DB
 *
 * Reads mapfre-raw.json and compares against the PlexusMap database
 * using fuzzy name matching (Levenshtein distance).
 *
 * Usage: npx tsx scripts/cross-reference-mapfre.ts
 *
 * Requires:
 *   - scripts/output/mapfre-raw.json (from import-mapfre.ts)
 *   - DATABASE_URL env var
 *
 * Output:
 *   - scripts/output/mapfre-matched.json  (existing in PlexusMap)
 *   - scripts/output/mapfre-new.json      (new, not in PlexusMap)
 *   - scripts/output/mapfre-stats.json    (summary)
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { distance } from 'fastest-levenshtein';

const prisma = new PrismaClient();

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const INPUT_FILE = path.join(OUTPUT_DIR, 'mapfre-raw.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'mapfre-matched.json');
const NEW_FILE = path.join(OUTPUT_DIR, 'mapfre-new.json');
const STATS_FILE = path.join(OUTPUT_DIR, 'mapfre-stats.json');

const SIMILARITY_THRESHOLD = 0.7;

interface MapfreDoctor {
  name: string;
  specialty: string;
  location: string;
  phone: string;
  province: string;
}

interface MatchedDoctor extends MapfreDoctor {
  plexusMapId: string;
  plexusMapName: string;
  plexusMapSlug: string;
  similarity: number;
  hasMapfre: boolean;
}

interface NewDoctor extends MapfreDoctor {
  bestMatchName: string | null;
  bestMatchSimilarity: number;
}

/**
 * Normalize a name for comparison:
 * - Remove accents, lowercase, trim
 * - Remove titles (DR., DRA., LIC., etc.)
 * - Remove punctuation
 * - Collapse whitespace
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\b(dr|dra|lic|lcdo|lcda|ing|prof|sra|sr)\b\.?/gi, '') // remove titles
    .replace(/[,.\-()]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses Levenshtein distance normalized by the longer string length
 */
function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1.0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  const dist = distance(na, nb);
  return 1 - dist / maxLen;
}

/**
 * Additional token-based matching: check if most words in the shorter name
 * appear in the longer name (handles reordered names)
 */
function tokenSimilarity(a: string, b: string): number {
  const tokensA = normalizeName(a).split(' ').filter(t => t.length > 1);
  const tokensB = normalizeName(b).split(' ').filter(t => t.length > 1);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Check how many tokens from the shorter name appear in the longer name
  const [shorter, longer] = tokensA.length <= tokensB.length
    ? [tokensA, tokensB]
    : [tokensB, tokensA];

  let matchedTokens = 0;
  for (const token of shorter) {
    // Check if any token in longer is similar enough to this token
    if (longer.some(lt => {
      if (lt === token) return true;
      if (lt.length > 2 && token.length > 2) {
        const d = distance(lt, token);
        return d <= 1; // Allow 1 char difference per token
      }
      return false;
    })) {
      matchedTokens++;
    }
  }

  return matchedTokens / shorter.length;
}

/**
 * Combined similarity score (max of Levenshtein and token-based)
 */
function combinedSimilarity(a: string, b: string): number {
  return Math.max(similarity(a, b), tokenSimilarity(a, b));
}

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — Mapfre Cross-Reference');
  console.log('============================================\n');

  // 1. Load Mapfre data
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    console.error('Run import-mapfre.ts first.');
    process.exit(1);
  }

  const mapfreDoctors: MapfreDoctor[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${mapfreDoctors.length} Mapfre doctors`);

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
    hasMapfre: p.insurances.some(pi => pi.insurance.name.toLowerCase().includes('mapfre')),
  }));

  // 3. Cross-reference
  const matched: MatchedDoctor[] = [];
  const newDoctors: NewDoctor[] = [];
  let skippedDuplicates = 0;
  const seenMapfreNames = new Set<string>();

  for (const doctor of mapfreDoctors) {
    // Deduplicate by normalized name within Mapfre data
    const normalizedMapfreName = normalizeName(doctor.name);
    if (seenMapfreNames.has(normalizedMapfreName)) {
      skippedDuplicates++;
      continue;
    }
    seenMapfreNames.add(normalizedMapfreName);

    // Find best match in PlexusMap
    let bestMatch: (typeof plexusNormalized)[0] | null = null;
    let bestSim = 0;

    for (const plexus of plexusNormalized) {
      const sim = combinedSimilarity(doctor.name, plexus.name);
      if (sim > bestSim) {
        bestSim = sim;
        bestMatch = plexus;
      }
    }

    if (bestMatch && bestSim >= SIMILARITY_THRESHOLD) {
      matched.push({
        ...doctor,
        plexusMapId: bestMatch.id,
        plexusMapName: bestMatch.name,
        plexusMapSlug: bestMatch.slug,
        similarity: Math.round(bestSim * 1000) / 1000,
        hasMapfre: bestMatch.hasMapfre,
      });
    } else {
      newDoctors.push({
        ...doctor,
        bestMatchName: bestMatch?.name || null,
        bestMatchSimilarity: Math.round(bestSim * 1000) / 1000,
      });
    }
  }

  // 4. Stats
  const matchedNeedingMapfre = matched.filter(m => !m.hasMapfre);

  const newBySpecialty = new Map<string, number>();
  for (const d of newDoctors) {
    newBySpecialty.set(d.specialty, (newBySpecialty.get(d.specialty) || 0) + 1);
  }

  const matchedBySpecialty = new Map<string, number>();
  for (const d of matched) {
    matchedBySpecialty.set(d.specialty, (matchedBySpecialty.get(d.specialty) || 0) + 1);
  }

  const stats = {
    totalExtracted: mapfreDoctors.length,
    uniqueAfterDedup: mapfreDoctors.length - skippedDuplicates,
    skippedDuplicates,
    matched: matched.length,
    matchedNeedingMapfre: matchedNeedingMapfre.length,
    matchedAlreadyHaveMapfre: matched.length - matchedNeedingMapfre.length,
    newProfessionals: newDoctors.length,
    similarityThreshold: SIMILARITY_THRESHOLD,
    bySpecialty: {
      matched: Object.fromEntries(matchedBySpecialty),
      new: Object.fromEntries(newBySpecialty),
    },
  };

  // 5. Output
  console.log('============================================');
  console.log('RESULTS:');
  console.log(`  Total extracted from Mapfre PDF: ${stats.totalExtracted}`);
  console.log(`  Unique (after dedup): ${stats.uniqueAfterDedup}`);
  console.log(`  Matched in PlexusMap: ${stats.matched}`);
  console.log(`    - Need Mapfre insurance added: ${stats.matchedNeedingMapfre}`);
  console.log(`    - Already have Mapfre: ${stats.matchedAlreadyHaveMapfre}`);
  console.log(`  New (not in PlexusMap): ${stats.newProfessionals}`);

  console.log('\nNew professionals by specialty:');
  for (const [spec, count] of [...newBySpecialty.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${spec}: ${count}`);
  }

  // Sample of close matches that weren't above threshold
  const closeMisses = newDoctors
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
  fs.writeFileSync(NEW_FILE, JSON.stringify(newDoctors, null, 2));
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
