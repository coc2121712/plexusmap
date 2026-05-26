/**
 * PlexusMap — Cross-reference SURA providers with PlexusMap DB
 *
 * Usage: npx tsx scripts/cross-reference-sura.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { normalizeName, combinedSimilarity } from './utils/normalize';

const prisma = new PrismaClient();
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const INPUT_FILE = path.join(OUTPUT_DIR, 'sura-raw.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'sura-matched.json');
const NEW_FILE = path.join(OUTPUT_DIR, 'sura-new.json');
const STATS_FILE = path.join(OUTPUT_DIR, 'sura-stats.json');
const SIMILARITY_THRESHOLD = 0.7;

interface SuraEntry {
  name: string; type: string; specialty: string; province: string;
  district: string; address: string; phone: string; whatsapp: string; source: string;
}

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — SURA Cross-Reference');
  console.log('============================================\n');

  if (!fs.existsSync(INPUT_FILE)) { console.error('Run import-sura.ts first.'); process.exit(1); }

  const suraEntries: SuraEntry[] = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${suraEntries.length} SURA entries`);

  const plexusPros = await prisma.professional.findMany({
    select: { id: true, name: true, slug: true, insurances: { include: { insurance: true } } },
  });
  console.log(`Loaded ${plexusPros.length} PlexusMap professionals\n`);

  const plexusNorm = plexusPros.map(p => ({
    ...p,
    normalized: normalizeName(p.name),
    hasSura: p.insurances.some(pi => {
      const n = pi.insurance.name.toLowerCase();
      return n.includes('seguros sura') || (n.includes('sura') && !n.includes('assurance'));
    }),
  }));

  const matched: any[] = [];
  const newEntries: any[] = [];
  let skippedDupes = 0;
  const seenNames = new Set<string>();

  for (const entry of suraEntries) {
    const norm = normalizeName(entry.name);
    if (seenNames.has(norm)) { skippedDupes++; continue; }
    seenNames.add(norm);

    let bestMatch: (typeof plexusNorm)[0] | null = null;
    let bestSim = 0;
    for (const p of plexusNorm) {
      const sim = combinedSimilarity(entry.name, p.name);
      if (sim > bestSim) { bestSim = sim; bestMatch = p; }
    }

    if (bestMatch && bestSim >= SIMILARITY_THRESHOLD) {
      matched.push({ ...entry, plexusMapId: bestMatch.id, plexusMapName: bestMatch.name, similarity: Math.round(bestSim * 1000) / 1000, hasSura: bestMatch.hasSura });
    } else {
      newEntries.push({ ...entry, bestMatchName: bestMatch?.name || null, bestMatchSimilarity: Math.round(bestSim * 1000) / 1000 });
    }
  }

  const needSura = matched.filter((m: any) => !m.hasSura);
  const newByType = new Map<string, number>();
  for (const d of newEntries) newByType.set(d.type, (newByType.get(d.type) || 0) + 1);

  console.log('============================================');
  console.log(`  Total: ${suraEntries.length}, Unique: ${suraEntries.length - skippedDupes}`);
  console.log(`  Matched: ${matched.length} (need SURA: ${needSura.length}, already: ${matched.length - needSura.length})`);
  console.log(`  New: ${newEntries.length}`);
  console.log('\nNew by type:');
  for (const [t, c] of [...newByType.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${t}: ${c}`);

  const closeMisses = newEntries.filter((d: any) => d.bestMatchSimilarity >= 0.5 && d.bestMatchSimilarity < 0.7).slice(0, 10);
  if (closeMisses.length > 0) {
    console.log('\nClose misses:');
    closeMisses.forEach((d: any) => console.log(`  "${d.name}" ~ "${d.bestMatchName}" (${d.bestMatchSimilarity})`));
  }

  fs.writeFileSync(MATCHED_FILE, JSON.stringify(matched, null, 2));
  fs.writeFileSync(NEW_FILE, JSON.stringify(newEntries, null, 2));
  fs.writeFileSync(STATS_FILE, JSON.stringify({ total: suraEntries.length, matched: matched.length, needSura: needSura.length, new: newEntries.length }, null, 2));

  console.log(`\nSaved: ${MATCHED_FILE}, ${NEW_FILE}, ${STATS_FILE}`);
  await prisma.$disconnect();
  console.log('Done!');
}

main().catch(async e => { console.error('Fatal:', e); await prisma.$disconnect(); process.exit(1); });
