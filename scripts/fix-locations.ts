/**
 * PlexusMap — Fix Location Coordinates for Imported Professionals
 *
 * Updates lat/lng of imported (unclaimed) professionals to match
 * the real coordinates of their hospital/clinic, instead of generic
 * province-center coordinates.
 *
 * Usage:
 *   npx tsx scripts/fix-locations.ts --dry-run   (preview changes)
 *   npx tsx scripts/fix-locations.ts --execute    (apply to DB)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// ═══════════════════════════════════════════
// Known Locations — Real coordinates
// ═══════════════════════════════════════════

interface KnownLocation {
  lat: number;
  lng: number;
  canonicalAddress: string; // clean address for the DB
}

const KNOWN_LOCATIONS: Record<string, KnownLocation> = {
  // ── Panama City — Major hospitals ──
  'PACÍFICA SALUD': {
    lat: 8.9820, lng: -79.5101,
    canonicalAddress: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá',
  },
  'PACIFICA SALUD': {
    lat: 8.9820, lng: -79.5101,
    canonicalAddress: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá',
  },
  'PACÍFICA SALUD, INSTITUTO DE SALUD FEMENINA': {
    lat: 8.9820, lng: -79.5101,
    canonicalAddress: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá',
  },
  'PACÍFICA SALUD/INSTITUTO EUROPEO DEL, SUEÑO': {
    lat: 8.9820, lng: -79.5101,
    canonicalAddress: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá',
  },
  'HOSPITAL NACIONAL': {
    lat: 8.9706, lng: -79.5336,
    canonicalAddress: 'Hospital Nacional, Avenida Cuba, Bella Vista, Ciudad de Panamá',
  },
  'CLÍNICA HOSPITAL SAN FERNANDO': {
    lat: 9.0031, lng: -79.5166,
    canonicalAddress: 'Clínica Hospital San Fernando, Carrasquilla, Ciudad de Panamá',
  },
  'CLINICA HOSPITAL SAN FERNANDO': {
    lat: 9.0031, lng: -79.5166,
    canonicalAddress: 'Clínica Hospital San Fernando, Carrasquilla, Ciudad de Panamá',
  },
  'CLÍNICA HOSPITAL SAN FERNANDO, PACÍFICA SALUD': {
    lat: 9.0031, lng: -79.5166,
    canonicalAddress: 'Clínica Hospital San Fernando, Carrasquilla, Ciudad de Panamá',
  },
  'CENTRO MÉDICO ESP. SAN FERNANDO': {
    lat: 9.0031, lng: -79.5166,
    canonicalAddress: 'Centro Médico Especializado San Fernando, Carrasquilla, Ciudad de Panamá',
  },
  'CENTRO ESP. SAN FERNANDO': {
    lat: 9.0031, lng: -79.5166,
    canonicalAddress: 'Centro Especializado San Fernando, Carrasquilla, Ciudad de Panamá',
  },
  'HOSPITAL SANTA FE': {
    lat: 8.9759, lng: -79.5384,
    canonicalAddress: 'Hospital Santa Fe, Calidonia, Ciudad de Panamá',
  },
  'HOSPITAL SANTA FÉ': {
    lat: 8.9759, lng: -79.5384,
    canonicalAddress: 'Hospital Santa Fe, Calidonia, Ciudad de Panamá',
  },
  'HOSPITAL PUNTA PACÍFICA': {
    lat: 8.9820, lng: -79.5101,
    canonicalAddress: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá',
  },
  'HOSPITAL PUNTA PACIFICA': {
    lat: 8.9820, lng: -79.5101,
    canonicalAddress: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá',
  },
  'PUNTA PACÍFICA': {
    lat: 8.9820, lng: -79.5101,
    canonicalAddress: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá',
  },
  'PUNTA PACIFICA': {
    lat: 8.9820, lng: -79.5101,
    canonicalAddress: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá',
  },
  'CONSULTORIOS MÉDICOS PAITILLA': {
    lat: 8.9780, lng: -79.5179,
    canonicalAddress: 'Consultorios Médicos Paitilla, Calle 53 Este, Ciudad de Panamá',
  },
  'HOSPITAL PAITILLA': {
    lat: 8.9780, lng: -79.5179,
    canonicalAddress: 'Hospital Paitilla, Calle 53, Paitilla, Ciudad de Panamá',
  },
  'CENTRO MÉDICO PAITILLA': {
    lat: 8.9780, lng: -79.5179,
    canonicalAddress: 'Centro Médico Paitilla, Calle 53 Este, Paitilla, Ciudad de Panamá',
  },
  'THE PANAMÁ CLINIC': {
    lat: 8.9944, lng: -79.5103,
    canonicalAddress: 'The Panama Clinic, Calle Ramón H. Jurado, Ciudad de Panamá',
  },
  'THE PANAMA CLINIC': {
    lat: 8.9944, lng: -79.5103,
    canonicalAddress: 'The Panama Clinic, Calle Ramón H. Jurado, Ciudad de Panamá',
  },
  'CONS. MÉDICOS ROYAL CENTER': {
    lat: 8.9840, lng: -79.5176,
    canonicalAddress: 'Consultorios Médicos Royal Center, Calle 53, Marbella, Ciudad de Panamá',
  },
  'CONSULTORIOS ROYAL CENTER': {
    lat: 8.9840, lng: -79.5176,
    canonicalAddress: 'Consultorios Médicos Royal Center, Calle 53, Marbella, Ciudad de Panamá',
  },
  'CONSULTORIOS ROYAL CENTER; THE PANAMA, CLINIC': {
    lat: 8.9840, lng: -79.5176,
    canonicalAddress: 'Consultorios Médicos Royal Center, Calle 53, Marbella, Ciudad de Panamá',
  },
  'CONS. MÉDICOS ROYAL CENTER204-8312': {
    lat: 8.9840, lng: -79.5176,
    canonicalAddress: 'Consultorios Médicos Royal Center, Calle 53, Marbella, Ciudad de Panamá',
  },
  'MEDIC GYM ROYAL CENTER': {
    lat: 8.9840, lng: -79.5176,
    canonicalAddress: 'Medic Gym Royal Center, Calle 53, Marbella, Ciudad de Panamá',
  },
  'CENTRO MÉDICO NACIONAL': {
    lat: 8.9820, lng: -79.5310,
    canonicalAddress: 'Centro Médico Nacional, Avenida Cuba, Ciudad de Panamá',
  },
  'CONSULTORIOS MÉDICOS SAN JUDAS TADEO': {
    lat: 8.9870, lng: -79.5135,
    canonicalAddress: 'Consultorios Médicos San Judas Tadeo, Villa Lucre, Ciudad de Panamá',
  },
  'CONS. MÉDICOS SAN JUDAS TADEO': {
    lat: 8.9870, lng: -79.5135,
    canonicalAddress: 'Consultorios Médicos San Judas Tadeo, Villa Lucre, Ciudad de Panamá',
  },
  'CONSULTORIOS AMÉRICA': {
    lat: 8.9810, lng: -79.5280,
    canonicalAddress: 'Consultorios América, Avenida Cuba, Ciudad de Panamá',
  },
  'CLÍNICA BOYD': {
    lat: 8.9830, lng: -79.5230,
    canonicalAddress: 'Clínica Boyd, Calle 50 y Ave. Venezuela, Ciudad de Panamá',
  },
  'HOSPITAL BRISAS': {
    lat: 9.0695, lng: -79.4598,
    canonicalAddress: 'Hospital Brisas, Brisas del Golf, Ciudad de Panamá',
  },
  'CLÍNICA CONDADO': {
    lat: 8.9750, lng: -79.5010,
    canonicalAddress: 'Clínica Condado, Condado del Rey, Ciudad de Panamá',
  },
  'CENTRO HEMATO ONCOLOGICO PANAMÁ': {
    lat: 8.9944, lng: -79.5103,
    canonicalAddress: 'Centro Hemato Oncológico, The Panama Clinic, Ciudad de Panamá',
  },
  'CENTRO HEMATO ONCOLÓGICO PANAMÁ': {
    lat: 8.9944, lng: -79.5103,
    canonicalAddress: 'Centro Hemato Oncológico, The Panama Clinic, Ciudad de Panamá',
  },
  'HOSPITAL PANAMERICANO': {
    lat: 9.0050, lng: -79.5220,
    canonicalAddress: 'Hospital Panamericano, Juan Díaz, Ciudad de Panamá',
  },

  // ── Colón ──
  'HOSPITAL CUATRO ALTOS': {
    lat: 9.3545, lng: -79.8980,
    canonicalAddress: 'Hospital Cuatro Altos, Colón',
  },
  'CENTRO MÉDICO DEL CARIBE': {
    lat: 9.3560, lng: -79.9005,
    canonicalAddress: 'Centro Médico del Caribe, Colón',
  },

  // ── Coclé ──
  'SERVICIOS MÉDICOS AGUADULCE': {
    lat: 8.2445, lng: -80.5440,
    canonicalAddress: 'Servicios Médicos Aguadulce, Coclé',
  },
  'CLÍNICA HOSPITAL ZARATÍ': {
    lat: 8.5125, lng: -80.1620,
    canonicalAddress: 'Clínica Hospital Zaratí, Penonomé, Coclé',
  },
  'CLÍNICA DE ESPECIALIDADES MÉDICAS,, PENONOMÉ': {
    lat: 8.5125, lng: -80.1620,
    canonicalAddress: 'Clínica de Especialidades Médicas, Penonomé, Coclé',
  },

  // ── Chiriquí ──
  'HOSPITAL CHIRIQUÍ': {
    lat: 8.4312, lng: -82.4310,
    canonicalAddress: 'Hospital Chiriquí, David, Chiriquí',
  },
  'CENTRO MÉDICO MAE LEWIS': {
    lat: 8.4340, lng: -82.4260,
    canonicalAddress: 'Centro Médico Mae Lewis, David, Chiriquí',
  },

  // ── Herrera ──
  'CLINICA DE ESPECIALIDADES PEDIATRICAS, CHITRÉ': {
    lat: 7.9700, lng: -80.4280,
    canonicalAddress: 'Clínica de Especialidades Pediátricas, Chitré, Herrera',
  },

  // ── Special patterns ──
  'TODOS LOS HOSPITALES': {
    lat: 8.9936, lng: -79.5197,
    canonicalAddress: 'TODOS LOS HOSPITALES',
  },
  'No especificada': {
    lat: 8.9936, lng: -79.5197,
    canonicalAddress: 'Ciudad de Panamá',
  },
};

// ═══════════════════════════════════════════
// Fuzzy location matching
// ═══════════════════════════════════════════

function normalizeAddress(addr: string): string {
  return addr
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchLocation(address: string): KnownLocation | null {
  // 1. Exact match (case-insensitive)
  const upper = address.trim().toUpperCase();
  for (const [key, loc] of Object.entries(KNOWN_LOCATIONS)) {
    if (upper === key.toUpperCase()) {
      return loc;
    }
  }

  // 2. Contains match — check if any known location name appears in the address
  const normalized = normalizeAddress(address);
  const containsMatches: { key: string; loc: KnownLocation; priority: number }[] = [];

  for (const [key, loc] of Object.entries(KNOWN_LOCATIONS)) {
    const normKey = normalizeAddress(key);
    if (normalized.includes(normKey) || normKey.includes(normalized)) {
      // Higher priority for longer/more specific matches
      containsMatches.push({ key, loc, priority: normKey.length });
    }
  }

  if (containsMatches.length > 0) {
    // Return the most specific (longest key) match
    containsMatches.sort((a, b) => b.priority - a.priority);
    return containsMatches[0].loc;
  }

  // 3. Partial keyword matching for common patterns
  const patterns: [RegExp, string][] = [
    [/PACIFICA\s*SALUD|PAC[IÍ]FICA\s*SALUD/i, 'PACÍFICA SALUD'],
    [/PUNTA\s*PAC[IÍ]FICA/i, 'PUNTA PACÍFICA'],
    [/SAN\s*FERNANDO/i, 'CLÍNICA HOSPITAL SAN FERNANDO'],
    [/HOSPITAL\s*NACIONAL/i, 'HOSPITAL NACIONAL'],
    [/PAITILLA/i, 'CONSULTORIOS MÉDICOS PAITILLA'],
    [/PANAMA\s*CLINIC/i, 'THE PANAMA CLINIC'],
    [/PANAM[AÁ]\s*CLINIC/i, 'THE PANAMÁ CLINIC'],
    [/ROYAL\s*CENTER/i, 'CONS. MÉDICOS ROYAL CENTER'],
    [/SANTA\s*F[EÉ]/i, 'HOSPITAL SANTA FE'],
    [/CUATRO\s*ALTOS/i, 'HOSPITAL CUATRO ALTOS'],
    [/SAN\s*JUDAS/i, 'CONSULTORIOS MÉDICOS SAN JUDAS TADEO'],
    [/BOYD/i, 'CLÍNICA BOYD'],
    [/BRISAS/i, 'HOSPITAL BRISAS'],
    [/AMERICA/i, 'CONSULTORIOS AMÉRICA'],
    [/DEL\s*CARIBE/i, 'CENTRO MÉDICO DEL CARIBE'],
    [/AGUADULCE/i, 'SERVICIOS MÉDICOS AGUADULCE'],
    [/ZARAT[IÍ]/i, 'CLÍNICA HOSPITAL ZARATÍ'],
    [/CHIRIQUI|CHIRIQUÍ/i, 'HOSPITAL CHIRIQUÍ'],
    [/MAE\s*LEWIS/i, 'CENTRO MÉDICO MAE LEWIS'],
    [/PANAMERICANO/i, 'HOSPITAL PANAMERICANO'],
    [/CONDADO/i, 'CLÍNICA CONDADO'],
    [/HEMATO/i, 'CENTRO HEMATO ONCOLOGICO PANAMÁ'],
  ];

  for (const [regex, locKey] of patterns) {
    if (regex.test(address)) {
      const loc = KNOWN_LOCATIONS[locKey];
      if (loc) return loc;
    }
  }

  return null;
}

// ═══════════════════════════════════════════
// Google Geocoding fallback
// ═══════════════════════════════════════════

const geocodeCache = new Map<string, { lat: number; lng: number } | null>();
let geocodeApiCalls = 0;

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!GOOGLE_API_KEY) return null;
  if (geocodeCache.has(address)) return geocodeCache.get(address) || null;

  geocodeApiCalls++;
  if (geocodeApiCalls % 10 === 0) {
    await new Promise(r => setTimeout(r, 1100)); // rate limit
  }

  try {
    const query = `${address}, Panamá`;
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
      const result = { lat: loc.lat, lng: loc.lng };
      geocodeCache.set(address, result);
      return result;
    }
  } catch (err) {
    console.warn(`  [WARN] Geocode failed for "${address}": ${err}`);
  }

  geocodeCache.set(address, null);
  return null;
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');
  const includeAll = args.includes('--all'); // also fix claimed professionals

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  npx tsx scripts/fix-locations.ts --dry-run [--all]   (preview changes)');
    console.log('  npx tsx scripts/fix-locations.ts --execute [--all]   (apply to DB)');
    console.log('  --all: also fix claimed professionals (default: unclaimed only)');
    process.exit(0);
  }

  console.log('============================================');
  console.log(`  PlexusMap — Fix Location Coordinates`);
  console.log(`  Mode: ${isDryRun ? 'DRY RUN (no DB changes)' : 'EXECUTE (writing to DB)'}`);
  console.log(`  Scope: ${includeAll ? 'ALL professionals' : 'unclaimed only'}`);
  console.log('============================================\n');

  // Load professionals
  const professionals = await prisma.professional.findMany({
    where: includeAll ? {} : { isClaimed: false },
    select: { id: true, name: true, address: true, lat: true, lng: true },
    orderBy: { address: 'asc' },
  });

  console.log(`Total unclaimed professionals: ${professionals.length}`);
  console.log(`Google Geocoding API: ${GOOGLE_API_KEY ? 'available' : 'NOT available'}\n`);

  // Group by address
  const groups = new Map<string, typeof professionals>();
  for (const pro of professionals) {
    const addr = pro.address;
    if (!groups.has(addr)) groups.set(addr, []);
    groups.get(addr)!.push(pro);
  }
  console.log(`Unique addresses: ${groups.size}\n`);

  // ── Phase 1: Match addresses to known locations ──
  const plan: {
    address: string;
    count: number;
    newLat: number;
    newLng: number;
    source: 'known' | 'geocoded' | 'skip';
    canonicalAddress?: string;
    ids: string[];
  }[] = [];

  let matchedCount = 0;
  let geocodedCount = 0;
  let skippedCount = 0;
  let alreadyCorrectCount = 0;

  for (const [address, pros] of groups) {
    // Try known location match
    const known = matchLocation(address);

    if (known) {
      // Check if first professional already has correct coords (from Google Places import with real coords)
      const sample = pros[0];
      const isAlreadyCorrect =
        Math.abs(sample.lat - known.lat) < 0.001 && Math.abs(sample.lng - known.lng) < 0.001;

      if (isAlreadyCorrect) {
        alreadyCorrectCount += pros.length;
        continue;
      }

      plan.push({
        address,
        count: pros.length,
        newLat: known.lat,
        newLng: known.lng,
        source: 'known',
        canonicalAddress: known.canonicalAddress,
        ids: pros.map(p => p.id),
      });
      matchedCount += pros.length;
      continue;
    }

    // Try geocoding for unmatched addresses that look like real addresses
    // Skip if address looks like a name (parser artifact) or generic
    const looksLikeRealAddress =
      /(?:calle|ave|via|plaza|edif|torre|piso|consult|local|urb)/i.test(address) ||
      /Provincia/i.test(address) ||
      /Panama City/i.test(address) ||
      /Panamá$/i.test(address);

    if (looksLikeRealAddress && GOOGLE_API_KEY) {
      const geocoded = await geocodeAddress(address);
      if (geocoded) {
        plan.push({
          address,
          count: pros.length,
          newLat: geocoded.lat,
          newLng: geocoded.lng,
          source: 'geocoded',
          ids: pros.map(p => p.id),
        });
        geocodedCount += pros.length;
        continue;
      }
    }

    // Can't resolve — skip
    skippedCount += pros.length;
  }

  // ── Phase 2: Summary ──
  console.log('============================================');
  console.log('PLAN SUMMARY');
  console.log('============================================\n');

  console.log(`Will update (known locations):  ${matchedCount} professionals`);
  console.log(`Will update (geocoded):         ${geocodedCount} professionals`);
  console.log(`Already correct:                ${alreadyCorrectCount} professionals`);
  console.log(`Skipped (unresolvable):         ${skippedCount} professionals`);
  console.log(`Geocoding API calls made:       ${geocodeApiCalls}\n`);

  // Show the plan grouped by location
  const sortedPlan = plan.sort((a, b) => b.count - a.count);

  console.log('Updates by location:\n');
  for (const entry of sortedPlan) {
    const label = entry.canonicalAddress || entry.address;
    const src = entry.source === 'known' ? '📍' : '🌐';
    console.log(`  ${src} ${label}`);
    console.log(`     ${entry.count} professionals → [${entry.newLat.toFixed(4)}, ${entry.newLng.toFixed(4)}]`);
    if (entry.address !== entry.canonicalAddress && entry.canonicalAddress) {
      console.log(`     (from: "${entry.address}")`);
    }
  }

  const totalToUpdate = matchedCount + geocodedCount;
  console.log(`\nTotal to update: ${totalToUpdate} professionals across ${plan.length} locations`);

  if (isDryRun) {
    console.log('\n[DRY RUN] No changes applied. Run with --execute to apply.');
    await prisma.$disconnect();
    return;
  }

  // ── Phase 3: Execute updates ──
  console.log('\n--- Applying updates ---\n');

  let updated = 0;
  let errors = 0;

  for (const entry of sortedPlan) {
    const updateData: { lat: number; lng: number; address?: string } = {
      lat: entry.newLat,
      lng: entry.newLng,
    };

    // Update the address to canonical form if we have one and the original is ALL CAPS shorthand
    if (entry.canonicalAddress && entry.address === entry.address.toUpperCase() && entry.address !== 'TODOS LOS HOSPITALES') {
      updateData.address = entry.canonicalAddress;
    }

    try {
      const result = await prisma.professional.updateMany({
        where: {
          id: { in: entry.ids },
        },
        data: updateData,
      });

      updated += result.count;

      if (result.count > 0) {
        console.log(`  ✅ ${entry.canonicalAddress || entry.address}: ${result.count} updated → [${entry.newLat.toFixed(4)}, ${entry.newLng.toFixed(4)}]`);
      }
    } catch (err) {
      console.error(`  ❌ Error updating "${entry.address}": ${err}`);
      errors += entry.ids.length;
    }
  }

  console.log('\n============================================');
  console.log('RESULTS:');
  console.log(`  Updated:  ${updated}`);
  console.log(`  Errors:   ${errors}`);
  console.log(`  Skipped:  ${skippedCount}`);
  console.log('============================================');

  await prisma.$disconnect();
  console.log('Done!');
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
