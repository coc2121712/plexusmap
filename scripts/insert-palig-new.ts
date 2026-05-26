/**
 * PlexusMap — Insert new PALIG professionals into PlexusMap DB
 *
 * PALIG data is special: it already includes lat/lng from the API,
 * so we prefer those over geocoding.
 *
 * Usage:
 *   npx tsx scripts/insert-palig-new.ts --dry-run   (preview only)
 *   npx tsx scripts/insert-palig-new.ts --execute    (insert into DB)
 *
 * Requires:
 *   - scripts/output/palig-new.json (from cross-reference-palig.ts)
 *   - scripts/output/palig-matched.json
 *   - DATABASE_URL env var
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { generateSlug, findBestSpecialtySlug, SPECIALTY_MAP } from './utils/normalize';
import { geocode, matchKnownLocation, PROVINCE_COORDS, DEFAULT_LAT, DEFAULT_LNG } from './utils/geocode';

const prisma = new PrismaClient();

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const NEW_FILE = path.join(OUTPUT_DIR, 'palig-new.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'palig-matched.json');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'palig-insert-results.json');

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

// PALIG insurance ID in PlexusMap
const PALIG_INSURANCE_ID = 'cfc8849b-181c-4df1-a3e7-a958aeefcb12'; // "Pan American Life"

// Additional specialty mappings for PALIG-specific types
const PALIG_SPECIALTY_MAP: Record<string, string> = {
  'HOSPITALES Y CLINICAS': 'medicina-general',
  'MEDICOS': 'medicina-general',
  'LABORATORIOS': 'medicina-general',
  'IMAGENOLOGIA': 'medicina-general',
  'CENTRO DE CIRUGIA AMBULATORIA': 'medicina-general',
  'CENTRO MEDICO': 'medicina-general',
  'FARMACIAS - DROGUERIAS': 'medicina-general',
  'OTRAS EMPRESAS PRESTADORAS DE SALUD': 'medicina-general',
  'OTROS PROFESIONALES DE LA SALUD': 'medicina-general',
  'ATENCION DOMICILIARIA': 'medicina-general',
  // Specialties from the API
  'MEDICINA GENERAL': 'medicina-general',
  'MEDICINA INTERNA': 'medicina-general',
  'CARDIOLOGIA': 'cardiologia',
  'CARDIOLOGÍA': 'cardiologia',
  'CIRUGIA GENERAL': 'medicina-general',
  'CIRUGIA CARDIOVASCULAR': 'cardiologia',
  'DERMATOLOGIA': 'dermatologia',
  'DERMATOLOGÍA': 'dermatologia',
  'ENDOCRINOLOGIA': 'medicina-general',
  'GASTROENTEROLOGIA': 'medicina-general',
  'GINECOLOGIA Y OBSTETRICIA': 'ginecologia',
  'GINECOLOGÍA Y OBSTETRICIA': 'ginecologia',
  'NEUROLOGIA': 'neurologia',
  'NEUROLOGÍA': 'neurologia',
  'NEUROCIRUGIA': 'neurologia',
  'NEUROCIRUGÍA': 'neurologia',
  'OFTALMOLOGIA': 'oftalmologia',
  'OFTALMOLOGÍA': 'oftalmologia',
  'ORTOPEDIA': 'ortopedia',
  'ORTOPEDIA Y TRAUMATOLOGIA': 'ortopedia',
  'ORTOPEDIA Y TRAUMATOLOGÍA': 'ortopedia',
  'OTORRINOLARINGOLOGIA': 'medicina-general',
  'PEDIATRIA': 'pediatria',
  'PEDIATRÍA': 'pediatria',
  'PSICOLOGIA': 'psicologia',
  'PSICOLOGÍA': 'psicologia',
  'PSIQUIATRIA': 'psicologia',
  'PSIQUIATRÍA': 'psicologia',
  'UROLOGIA': 'medicina-general',
  'UROLOGÍA': 'medicina-general',
  'FISIOTERAPIA': 'fisioterapia',
  'NUTRICION': 'nutricion',
  'NUTRICIÓN': 'nutricion',
  'ODONTOLOGIA': 'odontologia-general',
  'ODONTOLOGÍA': 'odontologia-general',
};

interface PaligNewEntry {
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
  bestMatchName: string | null;
  bestMatchSimilarity: number;
}

interface PaligMatchedEntry {
  name: string;
  plexusMapId: string;
  plexusMapName: string;
  hasPalig: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  npx tsx scripts/insert-palig-new.ts --dry-run');
    console.log('  npx tsx scripts/insert-palig-new.ts --execute');
    process.exit(0);
  }

  console.log('============================================');
  console.log(`  PlexusMap — Insert PALIG Professionals`);
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no DB changes)' : 'EXECUTE (writing to DB)'}`);
  console.log('============================================\n');

  if (!fs.existsSync(NEW_FILE)) {
    console.error(`File not found: ${NEW_FILE}`);
    console.error('Run cross-reference-palig.ts first.');
    process.exit(1);
  }

  const newEntries: PaligNewEntry[] = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
  console.log(`New entries to insert: ${newEntries.length}`);

  let matchedEntries: PaligMatchedEntry[] = [];
  if (fs.existsSync(MATCHED_FILE)) {
    matchedEntries = JSON.parse(fs.readFileSync(MATCHED_FILE, 'utf8'));
    const needPalig = matchedEntries.filter(m => !m.hasPalig);
    console.log(`Matched entries needing PALIG: ${needPalig.length}`);
  }

  // Load specialties
  const specialties = await prisma.specialty.findMany({
    select: { id: true, slug: true, name: true },
  });
  const specMap = new Map(specialties.map(s => [s.slug, s.id]));
  console.log(`PlexusMap specialties: ${specialties.length}`);

  // Verify PALIG insurance
  const paligInsurance = await prisma.insurance.findUnique({ where: { id: PALIG_INSURANCE_ID } });
  if (!paligInsurance) {
    console.error(`PALIG insurance not found with ID ${PALIG_INSURANCE_ID}`);
    process.exit(1);
  }
  console.log(`PALIG insurance: ${paligInsurance.name} (${PALIG_INSURANCE_ID})`);

  // Get existing slugs
  const existingSlugs = new Set(
    (await prisma.professional.findMany({ select: { slug: true } })).map(p => p.slug)
  );

  console.log('\n--- Processing new entries ---\n');

  const results = {
    inserted: 0,
    skipped: 0,
    withApiCoords: 0,
    geocoded: 0,
    defaultCoords: 0,
    errors: 0,
    specialtyMapping: {} as Record<string, number>,
    insuranceAdded: 0,
  };

  const allSpecMap = { ...SPECIALTY_MAP, ...PALIG_SPECIALTY_MAP };

  for (let i = 0; i < newEntries.length; i++) {
    const entry = newEntries[i];

    // Map specialty
    const upper = entry.specialty.toUpperCase().trim();
    // Try first word of multi-specialty
    const firstSpec = upper.split(',')[0].trim();
    let specSlug = allSpecMap[firstSpec] || allSpecMap[upper] || findBestSpecialtySlug(entry.specialty, specialties);
    const specId = specMap.get(specSlug);

    if (!specId) {
      if (i < 5) console.warn(`  [SKIP] No specialty mapping for: ${entry.specialty}`);
      results.skipped++;
      continue;
    }

    results.specialtyMapping[specSlug] = (results.specialtyMapping[specSlug] || 0) + 1;

    // Generate unique slug
    let slug = generateSlug(entry.name);
    let slugCounter = 1;
    while (existingSlugs.has(slug)) {
      slug = `${generateSlug(entry.name)}-${++slugCounter}`;
    }
    existingSlugs.add(slug);

    // Coordinates: prefer API coords, then known locations, then geocode
    let lat: number;
    let lng: number;
    let coordSource: string;

    if (entry.lat && entry.lng && entry.lat !== 0 && entry.lng !== 0) {
      lat = entry.lat;
      lng = entry.lng;
      coordSource = 'api';
      results.withApiCoords++;
    } else {
      // Try known location match from name/address
      const known = matchKnownLocation(entry.name) || matchKnownLocation(entry.location || entry.address);
      if (known) {
        lat = known.lat;
        lng = known.lng;
        coordSource = 'known';
        results.geocoded++;
      } else if (GOOGLE_API_KEY) {
        const geo = await geocode(entry.address || entry.location, entry.province, GOOGLE_API_KEY);
        lat = geo.lat;
        lng = geo.lng;
        coordSource = geo.geocoded ? 'google' : 'default';
        if (geo.geocoded) results.geocoded++;
        else results.defaultCoords++;
      } else {
        const coords = PROVINCE_COORDS[entry.province] || { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
        lat = coords.lat + (Math.random() - 0.5) * 0.02;
        lng = coords.lng + (Math.random() - 0.5) * 0.02;
        coordSource = 'default';
        results.defaultCoords++;
      }
    }

    // Phone: combine phone + mobile
    const phone = entry.phone || entry.mobile || null;

    if (isDryRun) {
      if (i < 15 || i % 100 === 0) {
        console.log(`  [DRY] ${entry.name}`);
        console.log(`         Type: ${entry.type} | Specialty: ${entry.specialty} → ${specSlug}`);
        console.log(`         Location: ${entry.address || entry.location} → [${lat.toFixed(4)}, ${lng.toFixed(4)}] (${coordSource})`);
        console.log(`         Slug: ${slug}`);
      }
    } else {
      try {
        await prisma.professional.create({
          data: {
            slug,
            name: entry.name,
            specialtyId: specId,
            address: entry.address || entry.location || `${entry.city}, ${entry.province}`,
            lat,
            lng,
            phone,
            rating: 0,
            reviewCount: 0,
            isVerified: false,
            isClaimed: false,
            photos: [],
            insurances: {
              create: { insuranceId: PALIG_INSURANCE_ID },
            },
          },
        });

        if ((i + 1) % 100 === 0 || i < 5) {
          console.log(`  [${i + 1}/${newEntries.length}] ${entry.name} → ${specSlug}`);
        }

        results.inserted++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          console.warn(`  [DUP] ${entry.name}: unique constraint`);
        } else {
          console.error(`  [ERROR] ${entry.name}: ${err.message}`);
        }
        results.errors++;
      }
    }
  }

  // Part 2: Add PALIG insurance to matched professionals
  const needPalig = matchedEntries.filter(m => !m.hasPalig);
  console.log(`\n--- Adding PALIG insurance to ${needPalig.length} existing professionals ---\n`);

  const seenIds = new Set<string>();

  for (const matched of needPalig) {
    if (seenIds.has(matched.plexusMapId)) continue;
    seenIds.add(matched.plexusMapId);

    if (isDryRun) {
      if (results.insuranceAdded < 10) {
        console.log(`  [DRY] Add PALIG to: ${matched.plexusMapName} (${matched.plexusMapId})`);
      }
      results.insuranceAdded++;
    } else {
      try {
        const existing = await prisma.professionalInsurance.findUnique({
          where: {
            professionalId_insuranceId: {
              professionalId: matched.plexusMapId,
              insuranceId: PALIG_INSURANCE_ID,
            },
          },
        });

        if (!existing) {
          await prisma.professionalInsurance.create({
            data: {
              professionalId: matched.plexusMapId,
              insuranceId: PALIG_INSURANCE_ID,
            },
          });
          results.insuranceAdded++;
        }
      } catch (err: any) {
        console.warn(`  [WARN] Could not add PALIG to ${matched.plexusMapName}: ${err.message}`);
      }
    }
  }

  // Summary
  console.log('\n============================================');
  console.log('SUMMARY:');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`  New entries ${isDryRun ? 'would be' : ''} inserted: ${isDryRun ? newEntries.length - results.skipped : results.inserted}`);
  console.log(`  Skipped (no specialty): ${results.skipped}`);
  console.log(`  With API coordinates: ${results.withApiCoords}`);
  console.log(`  Geocoded (known/google): ${results.geocoded}`);
  console.log(`  Default coordinates: ${results.defaultCoords}`);
  console.log(`  Errors: ${results.errors}`);
  console.log(`  PALIG insurance ${isDryRun ? 'would be' : ''} added to existing: ${results.insuranceAdded}`);

  console.log('\nBy specialty:');
  for (const [spec, count] of Object.entries(results.specialtyMapping).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${spec}: ${count}`);
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${RESULTS_FILE}`);

  await prisma.$disconnect();
  console.log('Done!');
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
