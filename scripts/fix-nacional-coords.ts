/**
 * Fix GPS coordinates for Hospital Nacional and Centro Médico Nacional
 *
 * Hospital Nacional: 8.972604, -79.533500 (was 8.9706, -79.5336 — ~220m off)
 * Centro Médico Nacional: 8.971995, -79.533502 (was 8.9820, -79.5310 — ~1.1km off!)
 *
 * Both are on Calle 38-39 Este & Avenida Cuba, Bella Vista
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOSPITAL_NACIONAL = {
  lat: 8.972604,
  lng: -79.533500,
  address: 'Hospital Nacional, Avenida Cuba y Calle 39 Este, Bella Vista, Ciudad de Panamá',
};

const CENTRO_MEDICO_NACIONAL = {
  lat: 8.971995,
  lng: -79.533502,
  address: 'Centro Médico Nacional, Calle 38 Este, Bella Vista, Ciudad de Panamá',
};

async function main() {
  // Fix professionals at Hospital Nacional (address contains "Hospital Nacional")
  const hospitalNacional = await prisma.professional.updateMany({
    where: {
      address: { contains: 'Hospital Nacional' },
    },
    data: {
      lat: HOSPITAL_NACIONAL.lat,
      lng: HOSPITAL_NACIONAL.lng,
      address: HOSPITAL_NACIONAL.address,
    },
  });
  console.log(`Hospital Nacional: ${hospitalNacional.count} professionals updated`);

  // Fix professionals at Centro Médico Nacional (address contains "Centro Médico Nacional")
  const centroMedico = await prisma.professional.updateMany({
    where: {
      address: { contains: 'Centro Médico Nacional' },
    },
    data: {
      lat: CENTRO_MEDICO_NACIONAL.lat,
      lng: CENTRO_MEDICO_NACIONAL.lng,
      address: CENTRO_MEDICO_NACIONAL.address,
    },
  });
  console.log(`Centro Médico Nacional: ${centroMedico.count} professionals updated`);

  // Also fix any with "Consultorios Nacionales" in address
  const consultoriosNacionales = await prisma.professional.updateMany({
    where: {
      address: { contains: 'Consultorios Nacionales' },
    },
    data: {
      lat: CENTRO_MEDICO_NACIONAL.lat,
      lng: CENTRO_MEDICO_NACIONAL.lng,
      address: CENTRO_MEDICO_NACIONAL.address,
    },
  });
  console.log(`Consultorios Nacionales: ${consultoriosNacionales.count} professionals updated`);

  console.log('\nDone!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
