/**
 * PlexusMap — Insert new SURA professionals into PlexusMap DB
 *
 * Usage:
 *   npx tsx scripts/insert-sura-new.ts --dry-run
 *   npx tsx scripts/insert-sura-new.ts --execute
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { generateSlug, findBestSpecialtySlug, SPECIALTY_MAP } from './utils/normalize';
import { geocode } from './utils/geocode';

const prisma = new PrismaClient();
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const NEW_FILE = path.join(OUTPUT_DIR, 'sura-new.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'sura-matched.json');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'sura-insert-results.json');
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// SURA specialty mappings
const SURA_SPECIALTY_MAP: Record<string, string> = {
  ...SPECIALTY_MAP,
  'MEDICINA GENERAL': 'medicina-general',
  'TERAPIA FÍSICA': 'fisioterapia',
  'LABORATORIOS AMBULATORIOS': 'medicina-general',
  'LABORATORIO AMBULATORIO': 'medicina-general',
  'LABORATORIOS AMBULATORIO': 'medicina-general',
  'RAYOS X Y ULTRASONIDOS': 'medicina-general',
  'RAYOS X, ULTRASONIDOS': 'medicina-general',
  'ULTRASONIDOS': 'medicina-general',
  'ULTRASONIDOS, EKG, ELECTROENCEFALOGRAMAS': 'medicina-general',
  'CENTRO DE CIRUGÍA AMBULATORIA': 'medicina-general',
  'CIRUGÍA AMBULATORIA': 'medicina-general',
  'CIRUGÍAS AMBULATORIAS': 'medicina-general',
  'URGENCIAS, CIRUGÍAS AMBULATORIAS Y HOSPITALIZACIONES': 'medicina-general',
  'CONSULTAS MEDICINA GENERAL': 'medicina-general',
  'CONSULTA MEDICINA GENERAL Y URGENCIAS': 'medicina-general',
  'CIRUGÍA GENERAL': 'medicina-general',
  'CIRUGÍA GENERAL/ COLOPROCTOLOGÍA': 'medicina-general',
  'ANESTESIOLOGÍA': 'medicina-general',
  'ORTOPEDIA Y TRAUMATOLOGÍA': 'ortopedia',
  'OTORRINOLARINGOLOGÍA': 'medicina-general',
  'UROLOGÍA': 'medicina-general',
  'PATOLOGÍA': 'medicina-general',
  'MEDICINA INTERNA': 'medicina-general',
  'CENTRAL': 'medicina-general',
};

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');
  if (!isDryRun && !isExecute) {
    console.log('Usage: --dry-run | --execute');
    process.exit(0);
  }

  console.log('============================================');
  console.log(`  PlexusMap — Insert SURA Professionals`);
  console.log(`  Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('============================================\n');

  if (!fs.existsSync(NEW_FILE)) { console.error('Run cross-reference-sura.ts first.'); process.exit(1); }

  const newEntries: any[] = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
  console.log(`New entries: ${newEntries.length}`);

  let matchedEntries: any[] = [];
  if (fs.existsSync(MATCHED_FILE)) {
    matchedEntries = JSON.parse(fs.readFileSync(MATCHED_FILE, 'utf8'));
    console.log(`Matched needing SURA: ${matchedEntries.filter((m: any) => !m.hasSura).length}`);
  }

  const specialties = await prisma.specialty.findMany({ select: { id: true, slug: true, name: true } });
  const specMap = new Map(specialties.map(s => [s.slug, s.id]));

  // Find or create SURA insurance (avoid matching "Assurance" etc.)
  let suraIns = await prisma.insurance.findFirst({ where: { name: { contains: 'Seguros SURA', mode: 'insensitive' } } });
  if (!suraIns) suraIns = await prisma.insurance.findFirst({ where: { name: { startsWith: 'SURA', mode: 'insensitive' } } });
  if (!suraIns && isExecute) {
    suraIns = await prisma.insurance.create({ data: { name: 'Seguros SURA Panamá' } });
    console.log('Created SURA insurance record');
  }
  const suraId = suraIns?.id;
  console.log(`SURA insurance: ${suraIns?.name || '(will create)'} → ${suraId || 'TBD'}`);
  console.log(`Google API: ${GOOGLE_API_KEY ? 'available' : 'NOT available'}\n`);

  const existingSlugs = new Set(
    (await prisma.professional.findMany({ select: { slug: true } })).map(p => p.slug)
  );

  const results = { inserted: 0, skipped: 0, geocoded: 0, defaultCoords: 0, errors: 0, specialtyMapping: {} as Record<string, number>, insuranceAdded: 0 };

  console.log('--- Processing new entries ---\n');

  for (let i = 0; i < newEntries.length; i++) {
    const entry = newEntries[i];

    // Skip entries that are clearly parsing artifacts
    if (/^\d{3}-\d{4}/.test(entry.name) || entry.name.length < 3) {
      results.skipped++;
      continue;
    }
    // Skip entries with province/district/type fragments in the name (PDF parsing errors)
    if (/^(Chiriquí|Panamá|Coclé|Colón|Herrera|Veraguas|Bocas del Toro)/i.test(entry.name)) {
      console.warn(`  [SKIP] Parsing artifact: ${entry.name.substring(0, 60)}`);
      results.skipped++;
      continue;
    }
    if (/Profesionales de la Salud/i.test(entry.name)) {
      // Try to salvage if there's a real name before the artifact
      const cleanedName = entry.name.replace(/Profesionales de la Salud.*/i, '').trim();
      if (cleanedName.length >= 5 && !/^\d/.test(cleanedName)) {
        entry.name = cleanedName;
        console.log(`  [FIX] Cleaned name: "${cleanedName}" from artifact`);
      } else {
        console.warn(`  [SKIP] Parsing artifact: ${entry.name.substring(0, 60)}`);
        results.skipped++;
        continue;
      }
    }

    const upper = (entry.specialty || '').toUpperCase().trim();
    const specSlug = SURA_SPECIALTY_MAP[upper] || findBestSpecialtySlug(entry.specialty, specialties);
    const specId = specMap.get(specSlug);
    if (!specId) { results.skipped++; continue; }

    results.specialtyMapping[specSlug] = (results.specialtyMapping[specSlug] || 0) + 1;

    let slug = generateSlug(entry.name);
    while (existingSlugs.has(slug)) slug = `${generateSlug(entry.name)}-${++i}`;
    existingSlugs.add(slug);

    // Geocode using address + district + province
    const geoAddress = [entry.address, entry.district, entry.province].filter(Boolean).join(', ');
    const { lat, lng, geocoded } = await geocode(
      geoAddress || entry.name,
      entry.province || 'PANAMÁ',
      GOOGLE_API_KEY
    );
    if (geocoded) results.geocoded++;
    else results.defaultCoords++;

    const phone = entry.phone || null;

    if (isDryRun) {
      if (i < 10 || i % 50 === 0) {
        console.log(`  [DRY] ${entry.name} | ${entry.specialty} → ${specSlug} | [${lat.toFixed(4)},${lng.toFixed(4)}] ${geocoded ? '✓' : '○'}`);
      }
    } else {
      try {
        await prisma.professional.create({
          data: {
            slug, name: entry.name, specialtyId: specId,
            address: entry.address || `${entry.district}, ${entry.province}`,
            lat, lng, phone, rating: 0, reviewCount: 0, isVerified: false, isClaimed: false, photos: [],
            ...(suraId ? { insurances: { create: { insuranceId: suraId } } } : {}),
          },
        });
        if ((i + 1) % 50 === 0 || i < 5) console.log(`  [${i + 1}/${newEntries.length}] ${entry.name} → ${specSlug}`);
        results.inserted++;
      } catch (err: any) {
        if (err.code === 'P2002') console.warn(`  [DUP] ${entry.name}`);
        else console.error(`  [ERROR] ${entry.name}: ${err.message}`);
        results.errors++;
      }
    }
  }

  // Add SURA to matched
  if (suraId) {
    const needSura = matchedEntries.filter((m: any) => !m.hasSura);
    console.log(`\n--- Adding SURA insurance to ${needSura.length} existing ---\n`);
    const seenIds = new Set<string>();

    for (const m of needSura) {
      if (seenIds.has(m.plexusMapId)) continue;
      seenIds.add(m.plexusMapId);

      if (isDryRun) {
        if (results.insuranceAdded < 10) console.log(`  [DRY] Add SURA to: ${m.plexusMapName}`);
        results.insuranceAdded++;
      } else {
        try {
          const exists = await prisma.professionalInsurance.findUnique({
            where: { professionalId_insuranceId: { professionalId: m.plexusMapId, insuranceId: suraId } },
          });
          if (!exists) {
            await prisma.professionalInsurance.create({ data: { professionalId: m.plexusMapId, insuranceId: suraId } });
            results.insuranceAdded++;
          }
        } catch (err: any) {
          console.warn(`  [WARN] ${m.plexusMapName}: ${err.message}`);
        }
      }
    }
  }

  console.log('\n============================================');
  console.log(`  Inserted: ${isDryRun ? newEntries.length - results.skipped : results.inserted}`);
  console.log(`  Skipped: ${results.skipped}, Geocoded: ${results.geocoded}, Default: ${results.defaultCoords}`);
  console.log(`  Errors: ${results.errors}, SURA added: ${results.insuranceAdded}`);
  console.log('\nBy specialty:');
  for (const [s, c] of Object.entries(results.specialtyMapping).sort((a, b) => b[1] - a[1])) console.log(`  ${s}: ${c}`);

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  await prisma.$disconnect();
  console.log('Done!');
}

main().catch(async e => { console.error('Fatal:', e); await prisma.$disconnect(); process.exit(1); });
