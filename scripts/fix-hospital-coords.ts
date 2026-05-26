/**
 * Fix GPS coordinates for hospitals with wrong locations
 * Verified against Waze April 2026
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FIXES = [
  {
    // Minimed Centennial is at 9.0309, but the hospital on Vía Ricardo J. Alfaro
    // (where we imported doctors from) is a different location.
    // The Waze "MiniMed Centennial" is on Vía España area.
    // Let's use the Calle 50 / Bella Vista location which is the main hospital.
    pattern: 'Minimed',
    lat: 8.9790,
    lng: -79.5250,
    address: 'Hospital Minimed, Vía Ricardo J. Alfaro, Ciudad de Panamá',
    skip: true, // Keep current — needs manual verification of which Minimed branch
  },
  {
    // Consultorios América — was on Av. Cuba coords, but actual location is on Vía España
    pattern: 'Consultorios América',
    lat: 9.001048,
    lng: -79.516533,
    address: 'Consultorios América, Vía España, Ciudad de Panamá',
  },
  {
    pattern: 'CONSULTORIOS AMERICA',
    lat: 9.001048,
    lng: -79.516533,
    address: 'Consultorios América, Vía España, Ciudad de Panamá',
  },
  {
    // Clínica Boyd — Calle Nicanor de Obarrio (Calle 50 y Ave. Venezuela)
    pattern: 'Boyd',
    lat: 8.978427,
    lng: -79.530127,
    address: 'Clínica Boyd, Calle 50 y Ave. Venezuela, Bella Vista, Ciudad de Panamá',
  },
  {
    // The Panama Clinic — Pacific Center, C. Ramón H. Jurado
    pattern: 'Panama Clinic',
    lat: 8.977864,
    lng: -79.511540,
    address: 'The Panama Clinic, Pacific Center, Calle Ramón H. Jurado, San Francisco, Ciudad de Panamá',
  },
  {
    pattern: 'THE PANAMA CLINIC',
    lat: 8.977864,
    lng: -79.511540,
    address: 'The Panama Clinic, Pacific Center, Calle Ramón H. Jurado, San Francisco, Ciudad de Panamá',
  },
  {
    // Also fix the 30 "Centro Médico NACIONAL" that weren't caught before (different address format)
    pattern: 'Centro Médico NACIONAL',
    lat: 8.971995,
    lng: -79.533502,
    address: 'Centro Médico Nacional, Calle 38 Este, Bella Vista, Ciudad de Panamá',
  },
];

async function main() {
  for (const fix of FIXES) {
    if (fix.skip) {
      console.log(`SKIPPED: ${fix.pattern} (needs manual verification)`);
      continue;
    }

    const result = await prisma.professional.updateMany({
      where: {
        address: { contains: fix.pattern, mode: 'insensitive' },
      },
      data: {
        lat: fix.lat,
        lng: fix.lng,
        address: fix.address,
      },
    });
    console.log(`${fix.pattern}: ${result.count} professionals updated → ${fix.lat}, ${fix.lng}`);
  }

  console.log('\nDone!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
