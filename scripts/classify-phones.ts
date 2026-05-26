/**
 * Classify Panama phone numbers and populate whatsappPhone field.
 *
 * Panama phone rules:
 *   - Mobile: 8 digits, starts with 6 (e.g. 6XXX-XXXX) → WhatsApp-capable
 *   - Landline: 7 digits, does NOT start with 6 (e.g. 2XX-XXXX, 3XX-XXXX)
 *   - Some entries have two numbers separated by / or , → parse both
 *
 * Usage:
 *   npx tsx scripts/classify-phones.ts --dry-run   # preview only
 *   npx tsx scripts/classify-phones.ts              # apply changes
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');

// ── Phone parsing ──────────────────────────────────────────────

interface ParsedPhone {
  raw: string;
  digits: string;
  type: 'mobile' | 'landline' | 'unknown';
  formatted: string; // cleaned display format
}

function cleanDigits(raw: string): string {
  // Strip country code prefix, spaces, dashes, parens, dots
  let d = raw.replace(/[\s\-\(\)\.]/g, '');
  // Remove +507 or 507 prefix
  if (d.startsWith('+507')) d = d.slice(4);
  else if (d.startsWith('507') && d.length > 8) d = d.slice(3);
  return d.replace(/\D/g, '');
}

function classifyNumber(digits: string): 'mobile' | 'landline' | 'unknown' {
  if (digits.length === 8 && digits.startsWith('6')) return 'mobile';
  if (digits.length === 7 && !digits.startsWith('6')) return 'landline';
  return 'unknown';
}

function formatPhone(digits: string, type: string): string {
  if (type === 'mobile' && digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  if (type === 'landline' && digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return digits;
}

function parsePhoneField(raw: string): ParsedPhone[] {
  // Split on common separators: /, |, ;, "o", comma followed by space+digit
  const parts = raw.split(/[\/\|;]|,\s*(?=\d)|\s+o\s+/i).map(s => s.trim()).filter(Boolean);
  return parts.map(part => {
    const digits = cleanDigits(part);
    const type = classifyNumber(digits);
    return { raw: part, digits, type, formatted: formatPhone(digits, type) };
  });
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log(`\n📱 Phone Classification for PlexusMap`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ LIVE (will update DB)'}\n`);

  const professionals = await prisma.professional.findMany({
    select: { id: true, name: true, phone: true, whatsappPhone: true },
  });

  let total = 0;
  let noPhone = 0;
  let mobileOnly = 0;
  let landlineOnly = 0;
  let bothNumbers = 0;
  let unknownFormat = 0;
  let alreadySet = 0;

  const updates: { id: string; name: string; phone: string | null; whatsappPhone: string | null }[] = [];
  const unknowns: { name: string; phone: string; parsed: ParsedPhone[] }[] = [];

  for (const pro of professionals) {
    total++;

    if (!pro.phone || pro.phone.trim() === '') {
      noPhone++;
      continue;
    }

    const parsed = parsePhoneField(pro.phone);
    const mobiles = parsed.filter(p => p.type === 'mobile');
    const landlines = parsed.filter(p => p.type === 'landline');
    const unknownsInEntry = parsed.filter(p => p.type === 'unknown');

    if (unknownsInEntry.length > 0 && mobiles.length === 0 && landlines.length === 0) {
      unknownFormat++;
      unknowns.push({ name: pro.name, phone: pro.phone, parsed });
      continue;
    }

    // Determine what to store
    let newPhone: string | null = pro.phone;
    let newWhatsapp: string | null = null;

    if (mobiles.length > 0 && landlines.length > 0) {
      // Both: landline in phone, mobile in whatsappPhone
      bothNumbers++;
      newPhone = landlines[0].formatted;
      newWhatsapp = mobiles[0].formatted;
    } else if (mobiles.length > 0) {
      // Mobile only: keep in phone, copy to whatsappPhone
      mobileOnly++;
      newPhone = mobiles[0].formatted;
      newWhatsapp = mobiles[0].formatted;
    } else if (landlines.length > 0) {
      // Landline only: keep in phone, no whatsapp
      landlineOnly++;
      newPhone = landlines[0].formatted;
      newWhatsapp = null;
    }

    // Track unknowns that also had valid numbers
    if (unknownsInEntry.length > 0) {
      unknowns.push({ name: pro.name, phone: pro.phone, parsed });
    }

    // Only update if something changed
    if (newPhone !== pro.phone || newWhatsapp !== pro.whatsappPhone) {
      updates.push({ id: pro.id, name: pro.name, phone: newPhone, whatsappPhone: newWhatsapp });
    } else if (pro.whatsappPhone) {
      alreadySet++;
    }
  }

  // ── Summary ────────────────────────────────────────────────

  console.log(`─── Summary ───────────────────────────────────`);
  console.log(`  Total professionals:    ${total}`);
  console.log(`  No phone:               ${noPhone}`);
  console.log(`  Mobile only (WhatsApp):  ${mobileOnly}`);
  console.log(`  Landline only:           ${landlineOnly}`);
  console.log(`  Both (landline+mobile):  ${bothNumbers}`);
  console.log(`  Unknown format:          ${unknownFormat}`);
  console.log(`  Already set (no change): ${alreadySet}`);
  console.log(`  Updates to apply:        ${updates.length}`);
  console.log(`───────────────────────────────────────────────\n`);

  // Show unknowns for manual review
  if (unknowns.length > 0) {
    console.log(`⚠️  Unknown formats (need manual review):`);
    for (const u of unknowns.slice(0, 20)) {
      console.log(`  ${u.name}`);
      console.log(`    raw: "${u.phone}"`);
      for (const p of u.parsed) {
        console.log(`    → "${p.raw}" → digits: ${p.digits} (${p.digits.length} chars) → ${p.type}`);
      }
    }
    if (unknowns.length > 20) {
      console.log(`  ... and ${unknowns.length - 20} more`);
    }
    console.log('');
  }

  // Show sample updates
  if (updates.length > 0) {
    console.log(`📋 Sample updates (first 10):`);
    for (const u of updates.slice(0, 10)) {
      console.log(`  ${u.name}`);
      console.log(`    phone: ${u.phone || '(null)'}`);
      console.log(`    whatsappPhone: ${u.whatsappPhone || '(null)'}`);
    }
    if (updates.length > 10) {
      console.log(`  ... and ${updates.length - 10} more`);
    }
    console.log('');
  }

  // ── Apply updates ──────────────────────────────────────────

  if (DRY_RUN) {
    console.log(`🔍 Dry run complete. Run without --dry-run to apply ${updates.length} updates.`);
  } else {
    console.log(`⚡ Applying ${updates.length} updates...`);
    let applied = 0;
    for (const u of updates) {
      await prisma.professional.update({
        where: { id: u.id },
        data: { phone: u.phone, whatsappPhone: u.whatsappPhone },
      });
      applied++;
      if (applied % 100 === 0) process.stdout.write(`  ${applied}/${updates.length}\r`);
    }
    console.log(`  ✅ Applied ${applied} updates.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
