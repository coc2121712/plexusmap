/**
 * PlexusMap — Import Seguros SURA Panama Medical Network
 *
 * Parses the Red-AP PDF from segurossura.com.pa.
 *
 * Entry pattern in raw text (multi-line):
 *   Line: {Name}Profesionales de la Salud{Specialty}{Provincia}{Distrito}
 *   Next lines: {Address}
 *   Next line: {Phone}{WhatsApp}  (merged 7-digit numbers)
 *
 * Or for facilities:
 *   Line: {Name}Centro de {Type}{Specialty}{Provincia}{Distrito}
 *   Line: {Address}
 *   Line: {Phone}{WhatsApp}
 *
 * Usage: npx tsx scripts/import-sura.ts
 * Output: scripts/output/sura-raw.json
 */

import * as fs from 'fs';
import * as path from 'path';

const PDF_URL = 'https://segurossura.com.pa/wp-content/uploads/2024/08/Red-AP_may-jun24.pdf';
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'sura-raw.json');

interface SuraEntry {
  name: string;
  type: string;
  specialty: string;
  province: string;
  district: string;
  address: string;
  phone: string;
  whatsapp: string;
  source: string;
}

// Provider type patterns to split name from type
const TYPE_PATTERNS = [
  { regex: /Profesionales de la Salud/i, type: 'Profesionales de la Salud' },
  { regex: /Centro de Atención Integral Virtual/i, type: 'Centro de Atención Integral Virtual' },
  { regex: /Centro de Atenci[oó]n M[eé]dica\s+Primaria/i, type: 'Centro de Atención Médica Primaria' },
  { regex: /Centro de Atenci[oó]n Primaria/i, type: 'Centro de Atención Primaria' },
  { regex: /Centro de Cirug[ií]a Ambulatoria/i, type: 'Centro de Cirugía Ambulatoria' },
  { regex: /Centro de Imagenolog[ií]a/i, type: 'Centro de Imagenología' },
  { regex: /Centro de Imaginolog[ií]a/i, type: 'Centro de Imagenología' },
  { regex: /Centro de Terapia/i, type: 'Centro de Terapia' },
  { regex: /Cl[ií]nicas y\s+Hospitales/i, type: 'Clínicas y Hospitales' },
  { regex: /Consulta Virtual/i, type: 'Consulta Virtual' },
  { regex: /Laboratorio Cl[ií]nico/i, type: 'Laboratorio Clínico' },
  { regex: /Red de Farmacias/i, type: 'Red de Farmacias' },
];

// Known province values that appear IN the data rows
const PROVINCIAS = [
  'Bocas del Toro', 'Chiriquí', 'Coclé', 'Colón', 'Darién',
  'Herrera', 'Los Santos', 'Panamá', 'Panamá Oeste', 'Veraguas',
  'Todas las Provincias',
];

// Province section headers in the PDF
const SECTION_HEADERS = new Set([
  'TODAS LAS PROVINCIAS', 'AZUERO', 'BOCAS DEL TORO', 'CHIRIQUÍ',
  'CQA', 'COCLÉ', 'COLÓN', 'PANAMÁ', 'PANAMÁ OESTE', 'VERAGUAS',
]);

// Skip patterns
const SKIP_PATTERNS = [
  /^ProveedorTipo/,
  /Regulado y Supervisado/,
  /Asegúrate de vivir/,
  /Red de Aliados Médicos/,
  /Accidentes Personales/,
  /^CIDEQ\s*$/,
];

function sectionToProvince(s: string): string {
  const map: Record<string, string> = {
    'AZUERO': 'HERRERA', 'CQA': 'CHIRIQUÍ',
    'TODAS LAS PROVINCIAS': 'PANAMÁ',
  };
  return map[s] || s;
}

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — SURA Network Importer');
  console.log('============================================\n');

  // Load PDF
  const localFile = path.join(OUTPUT_DIR, 'sura-red-ap.pdf');
  let pdfBuffer: Buffer;
  if (fs.existsSync(localFile)) {
    console.log('Using cached PDF...');
    pdfBuffer = fs.readFileSync(localFile);
  } else {
    console.log(`Downloading PDF: ${PDF_URL}`);
    const r = await fetch(PDF_URL);
    if (!r.ok) throw new Error(`Failed: ${r.status}`);
    pdfBuffer = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(localFile, pdfBuffer);
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const pdfData = await pdfParse(pdfBuffer);
  console.log(`Pages: ${pdfData.numpages}, Text: ${pdfData.text.length} chars\n`);

  const lines = pdfData.text.split('\n');

  // Step 1: Find all "type lines" — lines that contain a TYPE_PATTERN
  // These are the anchor points for entries
  const typeLines: { lineIdx: number; name: string; type: string; afterType: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const tp of TYPE_PATTERNS) {
      const match = line.match(tp.regex);
      if (match && match.index !== undefined) {
        const name = line.substring(0, match.index).trim();
        const afterType = line.substring(match.index + match[0].length).trim();
        typeLines.push({ lineIdx: i, name, type: tp.type, afterType });
        break;
      }
    }
  }

  console.log(`Found ${typeLines.length} type-lines (entry anchors)\n`);

  // Step 2: For each type-line, parse the full entry
  // The entry consists of:
  //   - The type line: {Name}{Type}{Specialty}{Provincia}{Distrito}
  //   - Following lines until next type-line: {Address lines} then {Phone}{WhatsApp}
  // Name may wrap from previous non-type lines (e.g., "José Alberto Broce Guillén -\nCentro Médico San Juan Bautista")

  let currentSection = 'PANAMÁ';
  const entries: SuraEntry[] = [];

  for (let ti = 0; ti < typeLines.length; ti++) {
    const tl = typeLines[ti];
    const nextTlIdx = ti + 1 < typeLines.length ? typeLines[ti + 1].lineIdx : lines.length;

    // Check if current line is preceded by section header
    for (let h = Math.max(0, tl.lineIdx - 5); h < tl.lineIdx; h++) {
      const hLine = lines[h].trim().toUpperCase();
      if (SECTION_HEADERS.has(hLine)) {
        currentSection = sectionToProvince(hLine);
      }
    }

    // Collect name — may need previous lines if name wraps
    let fullName = tl.name;
    if (!fullName || fullName.length < 3) {
      // Name is on previous lines
      const prevLines: string[] = [];
      for (let p = tl.lineIdx - 1; p >= 0 && p >= tl.lineIdx - 3; p--) {
        const pl = lines[p].trim();
        if (!pl) break;
        if (SKIP_PATTERNS.some(r => r.test(pl))) break;
        if (SECTION_HEADERS.has(pl.toUpperCase())) break;
        // Check if this line belongs to the PREVIOUS entry (has phone numbers)
        if (/^\d{7,}/.test(pl)) break;
        prevLines.unshift(pl);
      }
      fullName = [...prevLines, fullName].join(' ').trim();
    }

    // Clean the name — remove trailing numbers that might be from the previous entry's phone
    fullName = fullName.replace(/\d{7,}.*$/, '').trim();

    if (!fullName || fullName.length < 2) continue;

    // Parse afterType: {Specialty}{Provincia}{Distrito}{maybe address+phone on same line}
    let specialty = '';
    let province = currentSection;
    let district = '';
    let restAfterDistrict = '';

    // Try to find a Provincia in afterType
    let foundProv = false;
    for (const prov of PROVINCIAS) {
      const provIdx = tl.afterType.indexOf(prov);
      if (provIdx >= 0) {
        specialty = tl.afterType.substring(0, provIdx).trim();
        const afterProv = tl.afterType.substring(provIdx + prov.length).trim();
        province = prov === 'Todas las Provincias' ? currentSection : normalizeProvince(prov);

        // afterProv starts with district, then maybe address+phone
        // District is usually a single word or known name
        const districtMatch = afterProv.match(/^([A-ZÁÉÍÓÚÜÑa-záéíóúüñ\s]+?)(?=[A-Z]|$)/);
        if (districtMatch) {
          district = districtMatch[1].trim();
          restAfterDistrict = afterProv.substring(district.length).trim();
        } else {
          district = afterProv;
        }

        foundProv = true;
        break;
      }
    }

    if (!foundProv) {
      specialty = tl.afterType.trim();
    }

    // Collect following lines (address + phone) until next type-line
    const followingLines: string[] = [];
    for (let f = tl.lineIdx + 1; f < nextTlIdx; f++) {
      const fl = lines[f].trim();
      if (!fl) continue;
      if (SKIP_PATTERNS.some(r => r.test(fl))) continue;
      if (SECTION_HEADERS.has(fl.toUpperCase())) {
        currentSection = sectionToProvince(fl.toUpperCase());
        continue;
      }
      followingLines.push(fl);
    }

    // Separate address lines from phone lines
    // Phone lines are mostly digits (7+ digits with maybe spaces/dashes)
    const addressParts: string[] = [];
    let phone = '';
    let whatsapp = '';

    if (restAfterDistrict) {
      // Check if rest has phone numbers at the end
      const phoneEnd = restAfterDistrict.match(/(\d{6,}.*)$/);
      if (phoneEnd) {
        const beforePhone = restAfterDistrict.substring(0, phoneEnd.index).trim();
        if (beforePhone) addressParts.push(beforePhone);
        const nums = extractPhones(phoneEnd[1]);
        phone = nums[0] || '';
        whatsapp = nums[1] || '';
      } else {
        addressParts.push(restAfterDistrict);
      }
    }

    for (const fl of followingLines) {
      // Check if this line is a phone number line
      const digitsOnly = fl.replace(/[\s\-\/,#()]+/g, '');
      if (/^\d{7,}$/.test(digitsOnly)) {
        const nums = extractPhones(fl);
        if (!phone) phone = nums[0] || '';
        if (!whatsapp) whatsapp = nums[1] || (nums.length > 1 ? nums[1] : '');
      } else if (/\d{7}/.test(fl) && fl.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '').length < 5) {
        // Mostly numbers
        const nums = extractPhones(fl);
        if (!phone) phone = nums[0] || '';
        if (!whatsapp) whatsapp = nums[1] || '';
      } else {
        addressParts.push(fl);
      }
    }

    const address = addressParts.join(', ').replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();

    entries.push({
      name: cleanName(fullName),
      type: tl.type,
      specialty: specialty || 'Medicina General',
      province,
      district: district.replace(/[,\s]+$/, '').trim(),
      address,
      phone: formatPhone(phone),
      whatsapp: formatPhone(whatsapp),
      source: 'red-ap-pdf',
    });
  }

  // Deduplicate
  const dedupMap = new Map<string, SuraEntry>();
  for (const e of entries) {
    const key = `${e.name.toLowerCase()}|${e.district.toLowerCase()}|${e.specialty.toLowerCase()}`;
    if (!dedupMap.has(key)) {
      dedupMap.set(key, e);
    } else {
      // Merge: keep the one with more data
      const existing = dedupMap.get(key)!;
      if (!existing.phone && e.phone) dedupMap.set(key, e);
      if (!existing.address && e.address) dedupMap.set(key, { ...existing, address: e.address });
    }
  }

  const finalEntries = [...dedupMap.values()];

  // Stats
  const typeCounts = new Map<string, number>();
  const provinceCounts = new Map<string, number>();
  for (const e of finalEntries) {
    typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1);
    provinceCounts.set(e.province, (provinceCounts.get(e.province) || 0) + 1);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalEntries, null, 2));

  console.log('============================================');
  console.log(`Total entries parsed: ${entries.length}`);
  console.log(`After deduplication: ${finalEntries.length} (removed ${entries.length - finalEntries.length})`);

  console.log(`\nBy type:`);
  for (const [t, c] of [...typeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${t}: ${c}`);
  }

  console.log(`\nBy province:`);
  for (const [p, c] of [...provinceCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${p}: ${c}`);
  }

  console.log(`\nSample entries (first 10):`);
  for (const e of finalEntries.slice(0, 10)) {
    console.log(`  ${e.name} | ${e.type} | ${e.specialty} | ${e.province} | ${e.district} | ${e.phone} | WA:${e.whatsapp}`);
  }

  console.log(`\nSaved to: ${OUTPUT_FILE}`);
  console.log('Done!');
}

function extractPhones(text: string): string[] {
  // Extract individual phone numbers from merged text like "6309392763093927" or "996-2360"
  const cleaned = text.replace(/[\s\-\/,#()]+/g, '');
  const phones: string[] = [];

  if (cleaned.length >= 14) {
    // Two 7-digit numbers merged
    phones.push(cleaned.substring(0, 7));
    phones.push(cleaned.substring(7, 14));
    if (cleaned.length > 14) phones.push(cleaned.substring(14));
  } else if (cleaned.length >= 8 && cleaned.length <= 8) {
    phones.push(cleaned);
  } else if (cleaned.length === 7) {
    phones.push(cleaned);
  } else if (cleaned.length > 14) {
    // Multiple numbers, try 7-digit chunks
    for (let i = 0; i < cleaned.length; i += 7) {
      const chunk = cleaned.substring(i, i + 7);
      if (chunk.length >= 7) phones.push(chunk);
    }
  } else {
    // Try to split by known patterns (800-xxxx, etc.)
    const matches = text.match(/\d{3,4}[\s\-]?\d{3,4}/g);
    if (matches) phones.push(...matches.map(m => m.replace(/[\s\-]/g, '')));
    else if (cleaned.length > 0) phones.push(cleaned);
  }

  return phones;
}

function formatPhone(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/[^\d]/g, '');
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return raw;
}

function cleanName(name: string): string {
  return name
    .replace(/\d{7,}.*$/, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,\-]+|[\s,\-]+$/g, '')
    .trim();
}

function normalizeProvince(raw: string): string {
  const map: Record<string, string> = {
    'Panamá': 'PANAMÁ', 'Chiriquí': 'CHIRIQUÍ', 'Coclé': 'COCLÉ',
    'Colón': 'COLÓN', 'Herrera': 'HERRERA', 'Los Santos': 'LOS SANTOS',
    'Veraguas': 'VERAGUAS', 'Bocas del Toro': 'BOCAS DEL TORO',
    'Darién': 'DARIÉN', 'Panamá Oeste': 'PANAMÁ OESTE',
  };
  return map[raw] || raw.toUpperCase();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
