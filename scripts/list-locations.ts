import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const locations: any[] = await prisma.$queryRawUnsafe(`
    SELECT address, lat, lng, COUNT(*)::int as count
    FROM "Professional"
    GROUP BY address, lat, lng
    ORDER BY count DESC
    LIMIT 40
  `);

  console.log('=== Top locations by professional count ===\n');
  for (const l of locations) {
    console.log(`${String(l.count).padStart(4)}x | ${Number(l.lat).toFixed(6)}, ${Number(l.lng).toFixed(6)} | ${l.address}`);
  }
  console.log(`\nTotal unique locations: ${locations.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
