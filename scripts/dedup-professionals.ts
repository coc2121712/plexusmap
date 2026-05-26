/**
 * PlexusMap — Deduplicate professionals
 *
 * Finds duplicates where:
 * 1. Name words are the same but in different order
 *    e.g. "Konstantinos Tserotas" == "Tserotas Konstantinos"
 * 2. Slug collision (already handled by DB unique constraint)
 *
 * Usage:
 *   npx tsx scripts/dedup-professionals.ts --dry-run   (preview)
 *   npx tsx scripts/dedup-professionals.ts --execute    (merge/delete)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Normalize a name: lowercase, no accents, sort words alphabetically */
function normalizeNameSorted(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .sort()
    .join(' ');
}

/** Normalize a name: lowercase, no accents, keep order */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  npx tsx scripts/dedup-professionals.ts --dry-run');
    console.log('  npx tsx scripts/dedup-professionals.ts --execute');
    process.exit(0);
  }

  console.log('============================================');
  console.log('  PlexusMap — Deduplication');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('============================================\n');

  const all = await prisma.professional.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      specialtyId: true,
      isVerified: true,
      isClaimed: true,
      reviewCount: true,
      rating: true,
    },
    orderBy: [{ isVerified: 'desc' }, { isClaimed: 'desc' }, { rating: 'desc' }],
  });

  console.log(`Total professionals: ${all.length}`);

  // Group by sorted-word normalized name
  const groups = new Map<string, typeof all>();
  for (const p of all) {
    const key = normalizeNameSorted(p.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  // Find groups with > 1 entry
  const duplicateGroups = [...groups.entries()].filter(([, group]) => group.length > 1);

  console.log(`Duplicate groups found: ${duplicateGroups.length}`);

  let toDelete = 0;
  const deleteIds: string[] = [];

  for (const [key, group] of duplicateGroups) {
    // Keep the first (most verified/claimed/rated), delete the rest
    const [keep, ...remove] = group;

    console.log(`\n  Group "${key}" (${group.length} entries):`);
    console.log(`    KEEP: "${keep.name}" [${keep.id}] verified=${keep.isVerified} claimed=${keep.isClaimed}`);
    for (const dup of remove) {
      console.log(`    DEL:  "${dup.name}" [${dup.id}] verified=${dup.isVerified} claimed=${dup.isClaimed}`);
      deleteIds.push(dup.id);
      toDelete++;
    }
  }

  console.log(`\n============================================`);
  console.log(`Would delete: ${toDelete} duplicates`);

  if (isExecute && deleteIds.length > 0) {
    // Delete reviews, insurance links etc. first (cascade not always set)
    await prisma.review.deleteMany({ where: { professionalId: { in: deleteIds } } });
    await prisma.professionalInsurance.deleteMany({ where: { professionalId: { in: deleteIds } } });
    await prisma.professional.deleteMany({ where: { id: { in: deleteIds } } });
    console.log(`Deleted: ${deleteIds.length}`);
  }

  console.log('============================================\n');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
