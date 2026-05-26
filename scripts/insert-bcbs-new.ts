/**
 * PlexusMap — Insert new BCBS professionals into PlexusMap DB
 *
 * Reads bcbs-new.json and for each professional:
 * - Maps specialty to closest PlexusMap specialty
 * - Geocodes address using known locations map + Google API
 * - Creates Professional + ProfessionalInsurance (BCBS)
 *
 * Also processes bcbs-matched.json to add BCBS insurance to existing pros.
 *
 * Usage:
 *   npx tsx scripts/insert-bcbs-new.ts --dry-run   (preview only)
 *   npx tsx scripts/insert-bcbs-new.ts --execute    (insert into DB)
 *
 * Requires:
 *   - scripts/output/bcbs-new.json (from cross-reference-bcbs.ts)
 *   - scripts/output/bcbs-matched.json
 *   - DATABASE_URL env var
 *   - GOOGLE_MAPS_API_KEY env var (optional, for geocoding)
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { generateSlug, findBestSpecialtySlug, SPECIALTY_MAP } from './utils/normalize';
import { geocode } from './utils/geocode';

const prisma = new PrismaClient();

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const NEW_FILE = path.join(OUTPUT_DIR, 'bcbs-new.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'bcbs-matched.json');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'bcbs-insert-results.json');

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// BCBS Insurance ID in PlexusMap
const BCBS_INSURANCE_ID = '258d17fa-f94f-4108-af98-8bed4b30c486';

// Additional specialty mappings for BCBS-specific names
const BCBS_SPECIALTY_MAP: Record<string, string> = {
  // Facility types → map to medicina-general or skip
  'CENTRO AMBULATORIO': 'medicina-general',
  'CENTRO MÉDICO': 'medicina-general',
  'CLÍNICA': 'medicina-general',
  'CLÍNICA SATÉLITE': 'medicina-general',
  'HOSPITAL': 'medicina-general',
  'LABORATORIO': 'medicina-general',
  // Clinical specialties
  'ALERGOLOGÍA': 'medicina-general',
  'ANESTESIOLOGÍA': 'medicina-general',
  'CIRUGÍA CARDIOVASCULAR': 'cardiologia',
  'CIRUGÍA DE MANO': 'ortopedia',
  'CIRUGÍA GENERAL': 'medicina-general',
  'CIRUGÍA MAXILOFACIAL': 'odontologia-general',
  'CIRUGÍA PEDIÁTRICA': 'pediatria',
  'CIRUGÍA PLÁSTICA': 'dermatologia',
  'CIRUGÍA VASCULAR': 'cardiologia',
  'GASTROENTEROLOGÍA': 'medicina-general',
  'NEFROLOGÍA': 'medicina-general',
  'NEUMOLOGÍA': 'medicina-general',
  'NEUROCIRUGÍA': 'neurologia',
  'OTORRINOLARINGOLOGÍA': 'medicina-general',
  'ONCOLOGÍA': 'medicina-general',
  'RADIOLOGÍA': 'medicina-general',
  'MEDICINA FAMILIAR': 'medicina-general',
  'INFECTOLOGÍA': 'medicina-general',
  'GERIATRÍA': 'medicina-general',
  'ENDOCRINOLOGÍA': 'medicina-general',
};

interface BcbsNewEntry {
  name: string;
  specialty: string;
  subSpecialty: string | null;
  type: string;
  location: string;
  phone: string;
  area: string;
  province: string;
  source: string;
  bestMatchName: string | null;
  bestMatchSimilarity: number;
}

interface BcbsMatchedEntry {
  name: string;
  specialty: string;
  plexusMapId: string;
  plexusMapName: string;
  hasBcbs: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  npx tsx scripts/insert-bcbs-new.ts --dry-run   (preview only)');
    console.log('  npx tsx scripts/insert-bcbs-new.ts --execute   (insert into DB)');
    process.exit(0);
  }

  console.log('============================================');
  console.log(`  PlexusMap — Insert BCBS Professionals`);
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no DB changes)' : 'EXECUTE (writing to DB)'}`);
  console.log('============================================\n');

  // Load data
  if (!fs.existsSync(NEW_FILE)) {
    console.error(`File not found: ${NEW_FILE}`);
    console.error('Run cross-reference-bcbs.ts first.');
    process.exit(1);
  }

  const newEntries: BcbsNewEntry[] = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
  console.log(`New entries to insert: ${newEntries.length}`);

  let matchedEntries: BcbsMatchedEntry[] = [];
  if (fs.existsSync(MATCHED_FILE)) {
    matchedEntries = JSON.parse(fs.readFileSync(MATCHED_FILE, 'utf8'));
    const needBcbs = matchedEntries.filter(m => !m.hasBcbs);
    console.log(`Matched entries needing BCBS: ${needBcbs.length}`);
  }

  // Load specialties from DB
  const specialties = await prisma.specialty.findMany({
    select: { id: true, slug: true, name: true },
  });
  const specMap = new Map(specialties.map(s => [s.slug, s.id]));
  console.log(`PlexusMap specialties: ${specialties.length}`);

  // Verify BCBS insurance exists
  const bcbsInsurance = await prisma.insurance.findUnique({ where: { id: BCBS_INSURANCE_ID } });
  if (!bcbsInsurance) {
    console.error(`BCBS insurance not found with ID ${BCBS_INSURANCE_ID}`);
    process.exit(1);
  }
  console.log(`BCBS insurance: ${bcbsInsurance.name} (${BCBS_INSURANCE_ID})`);

  if (GOOGLE_API_KEY) {
    console.log('Google Geocoding API: available');
  } else {
    console.log('Google Geocoding API: NOT available');
  }

  // Get existing slugs to avoid duplicates
  const existingSlugs = new Set(
    (await prisma.professional.findMany({ select: { slug: true } })).map(p => p.slug)
  );

  console.log('\n--- Processing new entries ---\n');

  const results = {
    inserted: 0,
    skipped: 0,
    geocoded: 0,
    defaultCoords: 0,
    errors: 0,
    specialtyMapping: {} as Record<string, number>,
    insuranceAdded: 0,
  };

  // Merge BCBS-specific mappings into the lookup
  const allSpecialtyMap = { ...SPECIALTY_MAP, ...BCBS_SPECIALTY_MAP };

  // Part 1: Insert new professionals
  for (let i = 0; i < newEntries.length; i++) {
    const entry = newEntries[i];

    // Map specialty
    const upper = entry.specialty.toUpperCase().trim();
    let specSlug = allSpecialtyMap[upper] || findBestSpecialtySlug(entry.specialty, specialties);
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

    // Build address from location + area for geocoding
    const addressForGeocode = entry.location
      ? `${entry.location}, ${entry.area}, Panamá`
      : `${entry.area}, Panamá`;

    // Geocode — use both entry.location and entry.name for known location matching
    // (many BCBS entries are facilities whose NAME matches known locations)
    const { lat, lng, geocoded } = await geocode(
      `${entry.name} ${entry.location}`,
      entry.province,
      GOOGLE_API_KEY
    );
    if (geocoded) results.geocoded++;
    else results.defaultCoords++;

    if (isDryRun) {
      if (i < 15 || i % 100 === 0) {
        console.log(`  [DRY] ${entry.name}`);
        console.log(`         Type: ${entry.type} | Specialty: ${entry.specialty} → ${specSlug}`);
        console.log(`         Location: ${entry.location} → [${lat.toFixed(4)}, ${lng.toFixed(4)}] ${geocoded ? '(geocoded)' : '(default)'}`);
        console.log(`         Slug: ${slug}`);
      }
    } else {
      try {
        await prisma.professional.create({
          data: {
            slug,
            name: entry.name,
            specialtyId: specId,
            address: entry.location || `${entry.area}, Panamá`,
            lat,
            lng,
            phone: entry.phone || null,
            rating: 0,
            reviewCount: 0,
            isVerified: false,
            isClaimed: false,
            photos: [],
            insurances: {
              create: { insuranceId: BCBS_INSURANCE_ID },
            },
          },
        });

        if ((i + 1) % 100 === 0 || i < 5) {
          console.log(`  [${i + 1}/${newEntries.length}] ${entry.name} → ${specSlug}`);
        }

        results.inserted++;
      } catch (err: any) {
        if (err.code === 'P2002') {
          // Unique constraint violation (slug or insurance link)
          console.warn(`  [DUP] ${entry.name}: unique constraint`);
        } else {
          console.error(`  [ERROR] ${entry.name}: ${err.message}`);
        }
        results.errors++;
      }
    }
  }

  // Part 2: Add BCBS insurance to matched professionals
  const needBcbs = matchedEntries.filter(m => !m.hasBcbs);
  console.log(`\n--- Adding BCBS insurance to ${needBcbs.length} existing professionals ---\n`);

  // Deduplicate matched by plexusMapId (same pro might match multiple BCBS entries)
  const seenIds = new Set<string>();

  for (const matched of needBcbs) {
    if (seenIds.has(matched.plexusMapId)) continue;
    seenIds.add(matched.plexusMapId);

    if (isDryRun) {
      if (results.insuranceAdded < 10) {
        console.log(`  [DRY] Add BCBS to: ${matched.plexusMapName} (${matched.plexusMapId})`);
      }
      results.insuranceAdded++;
    } else {
      try {
        const existing = await prisma.professionalInsurance.findUnique({
          where: {
            professionalId_insuranceId: {
              professionalId: matched.plexusMapId,
              insuranceId: BCBS_INSURANCE_ID,
            },
          },
        });

        if (!existing) {
          await prisma.professionalInsurance.create({
            data: {
              professionalId: matched.plexusMapId,
              insuranceId: BCBS_INSURANCE_ID,
            },
          });
          results.insuranceAdded++;
        }
      } catch (err: any) {
        console.warn(`  [WARN] Could not add BCBS to ${matched.plexusMapName}: ${err.message}`);
      }
    }
  }

  // Summary
  console.log('\n============================================');
  console.log('SUMMARY:');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`  New entries ${isDryRun ? 'would be' : ''} inserted: ${isDryRun ? newEntries.length - results.skipped : results.inserted}`);
  console.log(`  Skipped (no specialty): ${results.skipped}`);
  console.log(`  Geocoded: ${results.geocoded}`);
  console.log(`  Default coordinates: ${results.defaultCoords}`);
  console.log(`  Errors: ${results.errors}`);
  console.log(`  BCBS insurance ${isDryRun ? 'would be' : ''} added to existing: ${results.insuranceAdded}`);

  console.log('\nBy specialty:');
  for (const [spec, count] of Object.entries(results.specialtyMapping).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${spec}: ${count}`);
  }

  // Save results
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
