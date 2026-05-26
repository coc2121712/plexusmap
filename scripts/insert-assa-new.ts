/**
 * PlexusMap — Insert new ASSA entries into PlexusMap DB
 *
 * Reads assa-new.json and for each entry:
 * - Maps specialty to closest PlexusMap specialty
 * - Geocodes address (known locations first, then Google API)
 * - Creates Professional + ProfessionalInsurance (ASSA)
 *
 * Also processes assa-matched.json to add ASSA insurance to existing pros.
 *
 * Usage:
 *   npx tsx scripts/insert-assa-new.ts --dry-run   (preview only)
 *   npx tsx scripts/insert-assa-new.ts --execute    (insert into DB)
 *
 * Requires:
 *   - scripts/output/assa-new.json (from cross-reference-assa.ts)
 *   - scripts/output/assa-matched.json
 *   - DATABASE_URL env var
 *   - GOOGLE_MAPS_API_KEY env var (optional, for geocoding)
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { generateSlug, findBestSpecialtySlug } from './utils/normalize';
import { geocode } from './utils/geocode';

const prisma = new PrismaClient();

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const NEW_FILE = path.join(OUTPUT_DIR, 'assa-new.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'assa-matched.json');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'assa-insert-results.json');

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface NewEntry {
  name: string;
  specialty: string;
  location: string;
  phone: string;
  province: string;
  website?: string;
  source: string;
  bestMatchName: string | null;
  bestMatchSimilarity: number;
}

interface MatchedEntry {
  name: string;
  specialty: string;
  plexusMapId: string;
  plexusMapName: string;
  hasAssa: boolean;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  npx tsx scripts/insert-assa-new.ts --dry-run   (preview only)');
    console.log('  npx tsx scripts/insert-assa-new.ts --execute   (insert into DB)');
    process.exit(0);
  }

  console.log('============================================');
  console.log(`  PlexusMap — Insert ASSA Professionals`);
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no DB changes)' : 'EXECUTE (writing to DB)'}`);
  console.log('============================================\n');

  // Load data
  if (!fs.existsSync(NEW_FILE)) {
    console.error(`File not found: ${NEW_FILE}`);
    console.error('Run cross-reference-assa.ts first.');
    process.exit(1);
  }

  const newEntries: NewEntry[] = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
  console.log(`New entries to insert: ${newEntries.length}`);

  let matchedEntries: MatchedEntry[] = [];
  if (fs.existsSync(MATCHED_FILE)) {
    matchedEntries = JSON.parse(fs.readFileSync(MATCHED_FILE, 'utf8'));
    const needAssa = matchedEntries.filter(m => !m.hasAssa);
    console.log(`Matched entries needing ASSA: ${needAssa.length}`);
  }

  // Load specialties from DB
  const specialties = await prisma.specialty.findMany({
    select: { id: true, slug: true, name: true },
  });
  const specMap = new Map(specialties.map(s => [s.slug, s.id]));
  console.log(`PlexusMap specialties: ${specialties.length}`);

  // Find or create ASSA insurance
  let assaInsurance = await prisma.insurance.findFirst({
    where: { name: { contains: 'ASSA', mode: 'insensitive' } },
  });

  if (!assaInsurance && isExecute) {
    assaInsurance = await prisma.insurance.create({
      data: { name: 'ASSA Compañía de Seguros' },
    });
    console.log('Created ASSA insurance record');
  }
  const assaInsuranceId = assaInsurance?.id;
  console.log(`ASSA insurance ID: ${assaInsuranceId || '(will create on execute)'}`);
  console.log(`Google Geocoding API: ${GOOGLE_API_KEY ? 'available' : 'NOT available'}\n`);

  // Get existing slugs
  const existingSlugs = new Set(
    (await prisma.professional.findMany({ select: { slug: true } })).map(p => p.slug)
  );

  console.log('--- Processing new entries ---\n');

  const results = {
    inserted: 0,
    skipped: 0,
    geocoded: 0,
    defaultCoords: 0,
    errors: 0,
    specialtyMapping: {} as Record<string, number>,
    insuranceAdded: 0,
  };

  // Part 1: Insert new professionals
  for (let i = 0; i < newEntries.length; i++) {
    const entry = newEntries[i];

    // Map specialty
    const specSlug = findBestSpecialtySlug(entry.specialty, specialties);
    const specId = specMap.get(specSlug);

    if (!specId) {
      console.warn(`  [SKIP] No specialty mapping for: ${entry.specialty}`);
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

    // Geocode
    const { lat, lng, geocoded } = await geocode(entry.location, entry.province, GOOGLE_API_KEY);
    if (geocoded) results.geocoded++;
    else results.defaultCoords++;

    const phone = entry.phone || null;

    if (isDryRun) {
      if (i < 10 || i % 20 === 0) {
        console.log(`  [DRY] ${entry.name}`);
        console.log(`         Type: ${entry.specialty} → ${specSlug}`);
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
            address: entry.location || `${entry.province}, Panamá`,
            lat,
            lng,
            phone,
            rating: 0,
            reviewCount: 0,
            isVerified: false,
            isClaimed: false,
            photos: [],
            ...(assaInsuranceId ? {
              insurances: {
                create: { insuranceId: assaInsuranceId },
              },
            } : {}),
          },
        });

        if ((i + 1) % 20 === 0 || i < 5) {
          console.log(`  [${i + 1}/${newEntries.length}] ${entry.name} → ${specSlug}`);
        }

        results.inserted++;
      } catch (err) {
        console.error(`  [ERROR] ${entry.name}: ${err}`);
        results.errors++;
      }
    }
  }

  // Part 2: Add ASSA insurance to matched professionals
  if (assaInsuranceId) {
    const needAssa = matchedEntries.filter(m => !m.hasAssa);
    console.log(`\n--- Adding ASSA insurance to ${needAssa.length} existing professionals ---\n`);

    for (const matched of needAssa) {
      if (isDryRun) {
        if (results.insuranceAdded < 10) {
          console.log(`  [DRY] Add ASSA to: ${matched.plexusMapName} (${matched.plexusMapId})`);
        }
        results.insuranceAdded++;
      } else {
        try {
          const existing = await prisma.professionalInsurance.findUnique({
            where: {
              professionalId_insuranceId: {
                professionalId: matched.plexusMapId,
                insuranceId: assaInsuranceId,
              },
            },
          });

          if (!existing) {
            await prisma.professionalInsurance.create({
              data: {
                professionalId: matched.plexusMapId,
                insuranceId: assaInsuranceId,
              },
            });
            results.insuranceAdded++;
          }
        } catch (err) {
          console.warn(`  [WARN] Could not add ASSA to ${matched.plexusMapName}: ${err}`);
        }
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
  console.log(`  ASSA insurance ${isDryRun ? 'would be' : ''} added to existing: ${results.insuranceAdded}`);

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
