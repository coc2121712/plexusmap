import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.professional.updateMany({
    where: { address: { contains: 'Minimed', mode: 'insensitive' } },
    data: {
      lat: 9.001063,
      lng: -79.532812,
      address: 'Hospital Minimed, Vía Ricardo J. Alfaro, Ciudad de Panamá',
    },
  });
  console.log(`Minimed: ${r.count} professionals updated → 9.001063, -79.532812`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
