/**
 * PlexusMap — Insert new Mapfre professionals into PlexusMap DB
 *
 * Reads mapfre-new.json and for each professional:
 * - Maps specialty to closest PlexusMap specialty
 * - Geocodes address (if API key available)
 * - Creates Professional + ProfessionalInsurance (Mapfre)
 *
 * Also processes mapfre-matched.json to add Mapfre insurance to existing pros.
 *
 * Usage:
 *   npx tsx scripts/insert-mapfre-new.ts --dry-run   (preview only)
 *   npx tsx scripts/insert-mapfre-new.ts --execute    (insert into DB)
 *
 * Requires:
 *   - scripts/output/mapfre-new.json (from cross-reference-mapfre.ts)
 *   - scripts/output/mapfre-matched.json
 *   - DATABASE_URL env var
 *   - GOOGLE_MAPS_API_KEY env var (optional, for geocoding)
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { distance } from 'fastest-levenshtein';

const prisma = new PrismaClient();

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const NEW_FILE = path.join(OUTPUT_DIR, 'mapfre-new.json');
const MATCHED_FILE = path.join(OUTPUT_DIR, 'mapfre-matched.json');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'mapfre-insert-results.json');

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Default coordinates: Panama City center
const DEFAULT_LAT = 8.9824;
const DEFAULT_LNG = -79.5199;

// Province approximate centers
const PROVINCE_COORDS: Record<string, { lat: number; lng: number }> = {
  'PANAMÁ': { lat: 8.9824, lng: -79.5199 },
  'CHIRIQUÍ': { lat: 8.4279, lng: -82.4312 },
  'COCLÉ': { lat: 8.5208, lng: -80.3626 },
  'COLÓN': { lat: 9.3547, lng: -79.9014 },
  'HERRERA': { lat: 7.9716, lng: -80.4295 },
  'LOS SANTOS': { lat: 7.7280, lng: -80.4162 },
  'VERAGUAS': { lat: 8.1125, lng: -81.0844 },
  'BOCAS DEL TORO': { lat: 9.3405, lng: -82.2420 },
  'DARIÉN': { lat: 8.0128, lng: -77.8413 },
  'PANAMÁ OESTE': { lat: 8.9113, lng: -79.6482 },
};

interface NewDoctor {
  name: string;
  specialty: string;
  location: string;
  phone: string;
  province: string;
  bestMatchName: string | null;
  bestMatchSimilarity: number;
}

interface MatchedDoctor {
  name: string;
  specialty: string;
  plexusMapId: string;
  plexusMapName: string;
  hasMapfre: boolean;
}

// ═══════════════════════════════════════════
// Specialty Mapping
// ═══════════════════════════════════════════

// Map Mapfre specialty names to PlexusMap specialty slugs
const SPECIALTY_MAP: Record<string, string> = {
  // Direct matches
  'ALERGOLOGÍA': 'medicina-general',
  'ALGIOLOGÍA': 'medicina-general',
  'ANESTESIOLOGÍA': 'medicina-general',
  'CARDIOLOGÍA': 'cardiologia',
  'CIRUGÍA CARDIOVASCULAR': 'cardiologia',
  'CIRUGÍA DE MANO': 'ortopedia',
  'CIRUGÍA GENERAL': 'medicina-general',
  'CIRUGÍA MAXILOFACIAL': 'odontologia-general',
  'CIRUGÍA ONCOLÓGICA': 'medicina-general',
  'CIRUGÍA PEDIÁTRICA': 'pediatria',
  'CIRUGÍA PLÁSTICA': 'dermatologia',
  'CIRUGÍA VASCULAR': 'cardiologia',
  'DERMATOLOGÍA': 'dermatologia',
  'ENDOCRINOLOGÍA': 'medicina-general',
  'ENDODONCIA': 'odontologia-general',
  'FISIATRÍA': 'fisioterapia',
  'FISIOTERAPIA': 'fisioterapia',
  'GASTROENTEROLOGÍA': 'medicina-general',
  'GERIATRÍA': 'medicina-general',
  'GINECOLOGÍA': 'ginecologia',
  'GINECOLOGÍA Y OBSTETRICIA': 'ginecologia',
  'HEMATOLOGÍA': 'medicina-general',
  'INFECTOLOGÍA': 'medicina-general',
  'MEDICINA FAMILIAR': 'medicina-general',
  'MEDICINA GENERAL': 'medicina-general',
  'MEDICINA INTERNA': 'medicina-general',
  'MEDICINA FÍSICA': 'fisioterapia',
  'NEFROLOGÍA': 'medicina-general',
  'NEONATOLOGÍA': 'pediatria',
  'NEUMOLOGÍA': 'medicina-general',
  'NEUROCIRUGÍA': 'neurologia',
  'NEUROLOGÍA': 'neurologia',
  'NUTRICIÓN': 'nutricion',
  'NUTRIOLOGÍA': 'nutricion',
  'ODONTOLOGÍA': 'odontologia-general',
  'ODONTOLOGÍA GENERAL': 'odontologia-general',
  'OFTALMOLOGÍA': 'oftalmologia',
  'ONCOLOGÍA': 'medicina-general',
  'OPTOMETRÍA': 'optometria',
  'ORTODONCIA': 'odontologia-general',
  'ORTOPEDIA': 'ortopedia',
  'ORTOPEDIA Y TRAUMATOLOGÍA': 'ortopedia',
  'OTORRINOLARINGOLOGÍA': 'medicina-general',
  'PATOLOGÍA': 'medicina-general',
  'PEDIATRÍA': 'pediatria',
  'PERIODONCIA': 'odontologia-general',
  'PROCTOLOGÍA': 'medicina-general',
  'PSICOLOGÍA': 'psicologia',
  'PSIQUIATRÍA': 'psicologia',
  'RADIOLOGÍA': 'medicina-general',
  'REUMATOLOGÍA': 'medicina-general',
  'TRAUMATOLOGÍA': 'ortopedia',
  'UROLOGÍA': 'medicina-general',
};

function findBestSpecialty(mapfreSpecialty: string, specialties: { slug: string; name: string }[]): string {
  const upper = mapfreSpecialty.toUpperCase().trim();

  // Direct map lookup
  if (SPECIALTY_MAP[upper]) {
    return SPECIALTY_MAP[upper];
  }

  // Fuzzy match against map keys
  let bestSlug = 'medicina-general'; // default
  let bestDist = Infinity;

  for (const [key, slug] of Object.entries(SPECIALTY_MAP)) {
    const d = distance(upper, key);
    if (d < bestDist) {
      bestDist = d;
      bestSlug = slug;
    }
  }

  // Also try fuzzy against PlexusMap specialty names
  for (const spec of specialties) {
    const d = distance(
      upper.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      spec.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );
    if (d < bestDist) {
      bestDist = d;
      bestSlug = spec.slug;
    }
  }

  return bestSlug;
}

// ═══════════════════════════════════════════
// Slug Generator
// ═══════════════════════════════════════════

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// ═══════════════════════════════════════════
// Geocoding
// ═══════════════════════════════════════════

const geocodeCache = new Map<string, { lat: number; lng: number }>();
let geocodeCount = 0;

async function geocode(address: string, province: string): Promise<{ lat: number; lng: number; geocoded: boolean }> {
  if (!GOOGLE_API_KEY || address === 'No especificada' || !address) {
    // Use province center as fallback
    const coords = PROVINCE_COORDS[province] || { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
    // Add small random offset to avoid all pins on same spot
    return {
      lat: coords.lat + (Math.random() - 0.5) * 0.02,
      lng: coords.lng + (Math.random() - 0.5) * 0.02,
      geocoded: false,
    };
  }

  const cacheKey = `${address}|${province}`;
  if (geocodeCache.has(cacheKey)) {
    return { ...geocodeCache.get(cacheKey)!, geocoded: true };
  }

  // Rate limit: max 10 requests per second
  geocodeCount++;
  if (geocodeCount % 10 === 0) {
    await new Promise(r => setTimeout(r, 1000));
  }

  try {
    const query = `${address}, ${province}, Panamá`;
    const params = new URLSearchParams({
      address: query,
      key: GOOGLE_API_KEY,
      region: 'pa',
      language: 'es',
    });

    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
    const data = await res.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const loc = data.results[0].geometry.location;
      geocodeCache.set(cacheKey, loc);
      return { lat: loc.lat, lng: loc.lng, geocoded: true };
    }
  } catch (err) {
    console.warn(`  [WARN] Geocode failed for "${address}": ${err}`);
  }

  // Fallback to province center
  const coords = PROVINCE_COORDS[province] || { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  return {
    lat: coords.lat + (Math.random() - 0.5) * 0.02,
    lng: coords.lng + (Math.random() - 0.5) * 0.02,
    geocoded: false,
  };
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  npx tsx scripts/insert-mapfre-new.ts --dry-run   (preview only)');
    console.log('  npx tsx scripts/insert-mapfre-new.ts --execute   (insert into DB)');
    process.exit(0);
  }

  console.log('============================================');
  console.log(`  PlexusMap — Insert Mapfre Professionals`);
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no DB changes)' : 'EXECUTE (writing to DB)'}`);
  console.log('============================================\n');

  // Load data
  if (!fs.existsSync(NEW_FILE)) {
    console.error(`File not found: ${NEW_FILE}`);
    console.error('Run cross-reference-mapfre.ts first.');
    process.exit(1);
  }

  const newDoctors: NewDoctor[] = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
  console.log(`New professionals to insert: ${newDoctors.length}`);

  let matchedDoctors: MatchedDoctor[] = [];
  if (fs.existsSync(MATCHED_FILE)) {
    matchedDoctors = JSON.parse(fs.readFileSync(MATCHED_FILE, 'utf8'));
    const needMapfre = matchedDoctors.filter(m => !m.hasMapfre);
    console.log(`Matched professionals needing Mapfre: ${needMapfre.length}`);
  }

  // Load specialties from DB
  const specialties = await prisma.specialty.findMany({
    select: { id: true, slug: true, name: true },
  });
  const specMap = new Map(specialties.map(s => [s.slug, s.id]));
  console.log(`PlexusMap specialties: ${specialties.length}`);

  // Find or create Mapfre insurance
  let mapfreInsurance = await prisma.insurance.findFirst({
    where: { name: { contains: 'Mapfre', mode: 'insensitive' } },
  });

  if (!mapfreInsurance && isExecute) {
    mapfreInsurance = await prisma.insurance.create({
      data: { name: 'Mapfre Panamá' },
    });
    console.log('Created Mapfre insurance record');
  }
  const mapfreInsuranceId = mapfreInsurance?.id;
  console.log(`Mapfre insurance ID: ${mapfreInsuranceId || '(will create on execute)'}`);

  if (GOOGLE_API_KEY) {
    console.log('Google Geocoding API: available');
  } else {
    console.log('Google Geocoding API: NOT available (will use province centers)');
  }

  // Get existing slugs to avoid duplicates
  const existingSlugs = new Set(
    (await prisma.professional.findMany({ select: { slug: true } })).map(p => p.slug)
  );

  console.log('\n--- Processing new professionals ---\n');

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
  for (let i = 0; i < newDoctors.length; i++) {
    const doctor = newDoctors[i];

    // Map specialty
    const specSlug = findBestSpecialty(doctor.specialty, specialties);
    const specId = specMap.get(specSlug);

    if (!specId) {
      console.warn(`  [SKIP] No specialty mapping for: ${doctor.specialty}`);
      results.skipped++;
      continue;
    }

    results.specialtyMapping[specSlug] = (results.specialtyMapping[specSlug] || 0) + 1;

    // Generate unique slug
    let slug = generateSlug(doctor.name);
    let slugCounter = 1;
    while (existingSlugs.has(slug)) {
      slug = `${generateSlug(doctor.name)}-${++slugCounter}`;
    }
    existingSlugs.add(slug);

    // Geocode
    const { lat, lng, geocoded } = await geocode(doctor.location, doctor.province);
    if (geocoded) results.geocoded++;
    else results.defaultCoords++;

    // Format phone
    const phone = doctor.phone
      ? (doctor.phone.startsWith('+') ? doctor.phone : doctor.phone)
      : null;

    if (isDryRun) {
      if (i < 20 || i % 50 === 0) {
        console.log(`  [DRY] ${doctor.name}`);
        console.log(`         Specialty: ${doctor.specialty} → ${specSlug}`);
        console.log(`         Location: ${doctor.location} → ${lat.toFixed(4)}, ${lng.toFixed(4)} ${geocoded ? '(geocoded)' : '(default)'}`);
        console.log(`         Slug: ${slug}`);
      }
    } else {
      try {
        const pro = await prisma.professional.create({
          data: {
            slug,
            name: doctor.name,
            specialtyId: specId,
            address: doctor.location || `${doctor.province}, Panamá`,
            lat,
            lng,
            phone,
            rating: 0,
            reviewCount: 0,
            isVerified: false,
            isClaimed: false,
            photos: [],
            ...(mapfreInsuranceId ? {
              insurances: {
                create: { insuranceId: mapfreInsuranceId },
              },
            } : {}),
          },
        });

        if ((i + 1) % 50 === 0 || i < 5) {
          console.log(`  [${i + 1}/${newDoctors.length}] ${pro.name} → ${specSlug}`);
        }

        results.inserted++;
      } catch (err) {
        console.error(`  [ERROR] ${doctor.name}: ${err}`);
        results.errors++;
      }
    }
  }

  // Part 2: Add Mapfre insurance to matched professionals
  if (mapfreInsuranceId) {
    const needMapfre = matchedDoctors.filter(m => !m.hasMapfre);
    console.log(`\n--- Adding Mapfre insurance to ${needMapfre.length} existing professionals ---\n`);

    for (const matched of needMapfre) {
      if (isDryRun) {
        if (results.insuranceAdded < 10) {
          console.log(`  [DRY] Add Mapfre to: ${matched.plexusMapName} (${matched.plexusMapId})`);
        }
        results.insuranceAdded++;
      } else {
        try {
          // Check if already linked (race condition guard)
          const existing = await prisma.professionalInsurance.findUnique({
            where: {
              professionalId_insuranceId: {
                professionalId: matched.plexusMapId,
                insuranceId: mapfreInsuranceId,
              },
            },
          });

          if (!existing) {
            await prisma.professionalInsurance.create({
              data: {
                professionalId: matched.plexusMapId,
                insuranceId: mapfreInsuranceId,
              },
            });
            results.insuranceAdded++;
          }
        } catch (err) {
          console.warn(`  [WARN] Could not add Mapfre to ${matched.plexusMapName}: ${err}`);
        }
      }
    }
  }

  // Summary
  console.log('\n============================================');
  console.log('SUMMARY:');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log(`  New professionals ${isDryRun ? 'would be' : ''} inserted: ${isDryRun ? newDoctors.length - results.skipped : results.inserted}`);
  console.log(`  Skipped (no specialty): ${results.skipped}`);
  console.log(`  Geocoded: ${results.geocoded}`);
  console.log(`  Default coordinates: ${results.defaultCoords}`);
  console.log(`  Errors: ${results.errors}`);
  console.log(`  Mapfre insurance ${isDryRun ? 'would be' : ''} added to existing: ${results.insuranceAdded}`);

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
