/**
 * PlexusMap — Import Blue Cross Blue Shield Panama Medical Network
 *
 * Downloads the provider JSON from redprov.mingoname.com (BCBS provider search)
 * and normalizes the data for cross-referencing and insertion.
 *
 * Data source: https://redprov.mingoname.com/output.json
 * (Same data as https://www.bcbspma.com/proveedores/ — their frontend loads this JSON)
 *
 * Also enriches with medired.html and pmi.html examiner data.
 *
 * Usage: npx tsx scripts/import-bcbs.ts
 * Output: scripts/output/bcbs-raw.json
 */

import * as fs from 'fs';
import * as path from 'path';

const JSON_URL = 'https://redprov.mingoname.com/output.json';
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'bcbs-raw.json');

interface BcbsEntry {
  name: string;
  specialty: string;
  subSpecialty: string | null;
  type: string; // Médico, Centro, Hospital, Clínica, Laboratorio, Clínica Satélite
  location: string;
  phone: string;
  area: string;
  province: string;
  source: string;
}

// ═══════════════════════════════════════════
// Area → Province mapping
// ═══════════════════════════════════════════
const AREA_TO_PROVINCE: Record<string, string> = {
  'panamá': 'PANAMÁ',
  'panama': 'PANAMÁ',
  'colón': 'COLÓN',
  'colon': 'COLÓN',
  'chiriquí': 'CHIRIQUÍ',
  'chiriqui': 'CHIRIQUÍ',
  'chitré': 'HERRERA',
  'chitre': 'HERRERA',
  'herrera': 'HERRERA',
  'los santos': 'LOS SANTOS',
  'veraguas': 'VERAGUAS',
  'coclé': 'COCLÉ',
  'cocle': 'COCLÉ',
  'penonomé': 'COCLÉ',
  'penonome': 'COCLÉ',
  'aguadulce': 'COCLÉ',
  'bocas del toro': 'BOCAS DEL TORO',
  'la chorrera': 'PANAMÁ OESTE',
  'darién': 'DARIÉN',
  'darien': 'DARIÉN',
};

// ═══════════════════════════════════════════
// Specialty normalization
// The BCBS JSON has very messy specialty names with line breaks, truncation, etc.
// This function cleans them into canonical forms.
// ═══════════════════════════════════════════
function normalizeSpecialty(raw: string): string {
  if (!raw) return 'MEDICINA GENERAL';

  let s = raw
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

  // Fix truncated/broken specialty names from the JSON
  const SPECIALTY_FIXES: [RegExp, string][] = [
    [/^CARDIOVASCULA\s*R?$/, 'CARDIOLOGÍA'],
    [/^CARDIOLOGIA$/, 'CARDIOLOGÍA'],
    [/^CIRUGIA CARDIOVASCULA\s*R?$/, 'CIRUGÍA CARDIOVASCULAR'],
    [/^CIRUGÍA_CIRUGI\s*A CARDIOVASCUL.*$/, 'CIRUGÍA CARDIOVASCULAR'],
    [/^CIRUGIA GENERAL[_\-]GASTR.*$/, 'GASTROENTEROLOGÍA'],
    [/^CIRUGIA GENERAL[_\-]LAPAR.*$/, 'CIRUGÍA GENERAL'],
    [/^CIRUGIA GENERAL[_\-]MANO.*$/, 'CIRUGÍA DE MANO'],
    [/^CIRUGIA GENERAL[_\-]PROC.*$/, 'CIRUGÍA GENERAL'],
    [/^CIRUGIA HEPATO.*BILIAR.*$/, 'CIRUGÍA GENERAL'],
    [/^CIRUGIA HEPATO.*PANC.*$/, 'CIRUGÍA GENERAL'],
    [/^CIRUGÍA_CIRUGI\s*A HEPATO.*$/, 'CIRUGÍA GENERAL'],
    [/^CIRUGIA MAXILO\s*FACIAL$/, 'CIRUGÍA MAXILOFACIAL'],
    [/^CIRUGÍA_CIRUGI\s*A MAXILO\s*FACIAL$/, 'CIRUGÍA MAXILOFACIAL'],
    [/^CIRUGIA PEDIATRICA$/, 'CIRUGÍA PEDIÁTRICA'],
    [/^CIRUGIA PLASTICA$/, 'CIRUGÍA PLÁSTICA'],
    [/^CIRUGÍA_CIRUGI\s*A PLASTICA$/, 'CIRUGÍA PLÁSTICA'],
    [/^CIRUGIA VASCULAR\s*PERIF.*$/, 'CIRUGÍA VASCULAR'],
    [/^CIRUGÍA_LAPARO.*$/, 'CIRUGÍA GENERAL'],
    [/^CIRUGÍA$/, 'CIRUGÍA GENERAL'],
    [/^DERMATOLOGIA$/, 'DERMATOLOGÍA'],
    [/^ENDOCRINOLOGI\s*A$/, 'ENDOCRINOLOGÍA'],
    [/^FISIOTERAPIA$/, 'FISIOTERAPIA'],
    [/^GERIATRIA$/, 'GERIATRÍA'],
    [/^GASTROENTEROLOG[IÍ]A$/, 'GASTROENTEROLOGÍA'],
    [/^GINECOLOG[IÍ]A Y OBSTETRICIA.*$/, 'GINECOLOGÍA Y OBSTETRICIA'],
    [/^HEMATOLOGIA$/, 'HEMATOLOGÍA'],
    [/^INFECTOLOGIA$/, 'INFECTOLOGÍA'],
    [/^MEDICINA CRITICA$/, 'MEDICINA INTERNA'],
    [/^MEDICINA FAMILIAR$/, 'MEDICINA FAMILIAR'],
    [/^MEDICINA FISICA.*$/, 'FISIOTERAPIA'],
    [/^MEDICINA GENERAL$/, 'MEDICINA GENERAL'],
    [/^MEDICINA INTERNA.*$/, 'MEDICINA INTERNA'],
    [/^MEDICINA INVASIVA.*$/, 'RADIOLOGÍA'],
    [/^MEDICINA NUCLEAR$/, 'RADIOLOGÍA'],
    [/^NEFROLOGIA$/, 'NEFROLOGÍA'],
    [/^NEUMOLOGIA$/, 'NEUMOLOGÍA'],
    [/^NEUROCIRUGIA$/, 'NEUROCIRUGÍA'],
    [/^NEUROFISIOLOGI\s*A$/, 'NEUROLOGÍA'],
    [/^NEUROLOG[IÍ]A.*$/, 'NEUROLOGÍA'],
    [/^OFTALMOLOGIA.*$/, 'OFTALMOLOGÍA'],
    [/^ONCOLOGIA$/, 'ONCOLOGÍA'],
    [/^ONGCOLOGIA.*$/, 'ONCOLOGÍA'],
    [/^OTORRINOLARIN\s*GOLOGIA.*$/, 'OTORRINOLARINGOLOGÍA'],
    [/^ORTOPEDIA Y TRAUMATOLOG[IÍ]A.*$/, 'ORTOPEDIA Y TRAUMATOLOGÍA'],
    [/^PEDIATR[IÍ]A.*$/, 'PEDIATRÍA'],
    [/^PROCEDIMIENTO\s*S AMBULATORIO$/, 'CENTRO AMBULATORIO'],
    [/^RADIO[\s-]*ONCOLOGIA$/, 'ONCOLOGÍA'],
    [/^RADIOLOGIA$/, 'RADIOLOGÍA'],
    [/^RADIOTERAPIA$/, 'ONCOLOGÍA'],
    [/^RESONANCIA MAGN[EÉ]TICA$/, 'RADIOLOGÍA'],
    [/^TERAPIA INTENSIVA$/, 'MEDICINA INTERNA'],
    [/^UROLOG[IÍ]A.*$/, 'UROLOGÍA'],
    [/^ALERGIA$/, 'ALERGOLOGÍA'],
    [/^ANESTESIOLOG[IÍ]A.*$/, 'ANESTESIOLOGÍA'],
    // Facility types
    [/^CENTRO AMBULATORIO$/, 'CENTRO AMBULATORIO'],
    [/^CENTRO M[EÉ]DICO$/, 'CENTRO MÉDICO'],
    [/^CL[IÍ]NICA$/, 'CLÍNICA'],
    [/^CL[IÍ]NICA SAT[EÉ]LITE$/, 'CLÍNICA SATÉLITE'],
    [/^HOSPITAL$/, 'HOSPITAL'],
    [/^LABORATORIO$/, 'LABORATORIO'],
  ];

  for (const [regex, replacement] of SPECIALTY_FIXES) {
    if (regex.test(s)) {
      return replacement;
    }
  }

  return s;
}

// ═══════════════════════════════════════════
// Name normalization for BCBS format
// Names in the JSON are "LASTNAME, FIRSTNAME" format
// ═══════════════════════════════════════════
function formatName(raw: string): string {
  if (!raw) return '';

  let name = raw.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  // If it looks like "LASTNAME, FIRSTNAME" → convert to "Firstname Lastname"
  const commaMatch = name.match(/^([A-ZÁÉÍÓÚÜÑ\s]+),\s*(.+)$/);
  if (commaMatch) {
    const lastName = commaMatch[1].trim();
    const firstName = commaMatch[2].trim();
    name = `${titleCase(firstName)} ${titleCase(lastName)}`;
  } else {
    // Already in a reasonable format (e.g., facility names)
    name = titleCase(name);
  }

  return name;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map(w => {
      // Keep short words lowercase unless they start a name
      if (['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e'].includes(w)) return w;
      // Handle initials like "A." or "J."
      if (w.length <= 2 && w.endsWith('.')) return w.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ')
    // Fix "S.a." → "S.A."
    .replace(/\bS\.a\./gi, 'S.A.')
    // Capitalize after "("
    .replace(/\((\w)/g, (_, c) => `(${c.toUpperCase()}`);
}

function normalizePhone(raw: string | number | null): string {
  if (!raw) return '';
  let phone = String(raw).replace(/\n/g, ' / ').trim();
  // Clean up common patterns
  phone = phone.replace(/\s*\/\s*/g, ' / ');
  return phone;
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — BCBS Network Importer');
  console.log('============================================\n');

  // 1. Download JSON
  console.log(`Fetching JSON from: ${JSON_URL}`);
  const response = await fetch(JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  const rawData = await response.json();
  const records = Object.values(rawData) as Record<string, any>[];
  console.log(`  Downloaded: ${records.length} records\n`);

  // 2. Parse and normalize
  const entries: BcbsEntry[] = [];
  const specialtyCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();

  for (const rec of records) {
    const rawArea = (rec['Área'] || rec['\u00c1rea'] || '').trim();
    const rawType = (rec['Tipo Proveedor'] || '').trim();
    const rawSpecialty = (rec['Especialidad'] || '').trim();
    const rawSubSpecialty = (rec['Sub- Especialidad'] || '').trim();
    const rawName = (rec['Nombre del Proveedor'] || '').trim();
    const rawLocation = (rec['Centro de Atención'] || rec['Centro de Atenci\u00f3n'] || '').trim();
    const rawPhone = rec['Teléfono'] || rec['Tel\u00e9fono'] || '';

    if (!rawName) continue;

    const specialty = normalizeSpecialty(rawSpecialty);
    const area = rawArea || 'Panamá';
    const province = AREA_TO_PROVINCE[area.toLowerCase()] || 'PANAMÁ';
    const type = rawType || 'Médico';

    const entry: BcbsEntry = {
      name: formatName(rawName),
      specialty,
      subSpecialty: rawSubSpecialty || null,
      type,
      location: rawLocation.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim(),
      phone: normalizePhone(rawPhone),
      area,
      province,
      source: 'redprov-json',
    };

    entries.push(entry);

    specialtyCounts.set(specialty, (specialtyCounts.get(specialty) || 0) + 1);
    areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  }

  // 3. Deduplicate by name + location
  const seen = new Map<string, number>();
  const deduped: BcbsEntry[] = [];
  let dupes = 0;

  for (const entry of entries) {
    const key = `${entry.name.toLowerCase()}|${entry.location.toLowerCase()}`;
    if (seen.has(key)) {
      dupes++;
      continue;
    }
    // More nuanced: same name at same center = dupe
    const nameLocKey = `${entry.name.toLowerCase()}|${entry.location.toLowerCase()}|${entry.specialty}`;
    if (seen.has(nameLocKey)) { continue; }
    seen.set(nameLocKey, deduped.length);
    deduped.push(entry);
  }

  // Actually, let's do proper dedup
  const dedupMap = new Map<string, BcbsEntry>();
  for (const entry of entries) {
    // A doctor at the same location with same specialty is a duplicate
    const key = `${entry.name.toLowerCase()}|${entry.location.toLowerCase()}|${entry.specialty.toLowerCase()}`;
    if (!dedupMap.has(key)) {
      dedupMap.set(key, entry);
    }
  }

  const finalEntries = [...dedupMap.values()];
  const dupeCount = entries.length - finalEntries.length;

  // 4. Output
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalEntries, null, 2));

  console.log('============================================');
  console.log(`Total records parsed: ${entries.length}`);
  console.log(`After deduplication: ${finalEntries.length} (removed ${dupeCount} dupes)`);

  console.log(`\nBy type:`);
  for (const [type, count] of [...typeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  console.log(`\nBy specialty (top 20):`);
  const sortedSpecs = [...specialtyCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [spec, count] of sortedSpecs.slice(0, 20)) {
    console.log(`  ${spec}: ${count}`);
  }
  if (sortedSpecs.length > 20) {
    console.log(`  ... and ${sortedSpecs.length - 20} more specialties`);
  }

  console.log(`\nBy area:`);
  for (const [area, count] of [...areaCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${area}: ${count}`);
  }

  console.log(`\nSample entries (first 5):`);
  for (const e of finalEntries.slice(0, 5)) {
    console.log(`  ${e.name} | ${e.specialty} | ${e.location} | ${e.phone} | ${e.province}`);
  }

  console.log(`\nSaved to: ${OUTPUT_FILE}`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
