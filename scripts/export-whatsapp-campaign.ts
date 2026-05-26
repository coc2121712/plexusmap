/**
 * Export CSV for WhatsApp outreach campaign.
 * Targets professionals who have a whatsappPhone but haven't claimed their profile.
 *
 * Usage:
 *   npx tsx scripts/export-whatsapp-campaign.ts
 *
 * Output: scripts/output/campaign-whatsapp.csv
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

function escapeCsv(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

async function main() {
  const professionals = await prisma.professional.findMany({
    where: {
      whatsappPhone: { not: null },
      isClaimed: false,
    },
    include: { specialty: true },
    orderBy: [{ specialty: { name: 'asc' } }, { name: 'asc' }],
  });

  console.log(`\n📊 WhatsApp Campaign Export`);
  console.log(`   Found ${professionals.length} unclaimed professionals with WhatsApp\n`);

  if (professionals.length === 0) {
    console.log('   No professionals match criteria. Run classify-phones.ts first.');
    return;
  }

  // Build CSV
  const header = 'name,slug,whatsappPhone,specialty,fullUrl';
  const rows = professionals.map(p => [
    escapeCsv(p.name),
    escapeCsv(p.slug),
    escapeCsv(p.whatsappPhone!),
    escapeCsv(p.specialty.name),
    escapeCsv(`https://plexusmap.com/${p.slug}`),
  ].join(','));

  const csv = [header, ...rows].join('\n');

  // Write file
  const outputDir = join(__dirname, 'output');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'campaign-whatsapp.csv');
  writeFileSync(outputPath, csv, 'utf-8');

  // Stats by specialty
  const bySpecialty: Record<string, number> = {};
  for (const p of professionals) {
    const name = p.specialty.name;
    bySpecialty[name] = (bySpecialty[name] || 0) + 1;
  }

  console.log(`   Breakdown by specialty:`);
  const sorted = Object.entries(bySpecialty).sort((a, b) => b[1] - a[1]);
  for (const [spec, count] of sorted) {
    console.log(`     ${spec}: ${count}`);
  }

  console.log(`\n   ✅ Exported to: ${outputPath}`);
  console.log(`   Total rows: ${professionals.length}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
