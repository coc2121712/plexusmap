/**
 * PlexusMap — Import Mapfre Medical Network from PDF
 *
 * Downloads and parses the Mapfre Panama medical network PDF,
 * extracting doctors with their specialty, location, and phone.
 *
 * Usage: npx tsx scripts/import-mapfre.ts
 * Output: scripts/output/mapfre-raw.json
 */

import * as fs from 'fs';
import * as path from 'path';

const PDF_URL = 'https://www.mapfre.com.pa/media/RED-MEDICA-GLOBAL_01052023.pdf';
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'mapfre-raw.json');

interface MapfreDoctor {
  name: string;
  specialty: string;
  location: string;
  phone: string;
  province: string;
}

async function downloadPdf(url: string): Promise<Buffer> {
  console.log(`Downloading PDF from: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  console.log(`Downloaded: ${(arrayBuffer.byteLength / 1024).toFixed(0)} KB`);
  return Buffer.from(arrayBuffer);
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\u00AD/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"');
}

// ─── Known specialties in Mapfre PDFs ───
const KNOWN_SPECIALTIES = new Set([
  'ALGIOLOGÍA', 'ALERGOLOGÍA', 'ANESTESIOLOGÍA',
  'CARDIOLOGÍA', 'CARDIOLOGÍA PEDÍATRICA', 'CARDIOLOGÍA PEDIÁTRICA',
  'CIRUGÍA CARDIOVASCULAR', 'CIRUGÍA GENERAL', 'CIRUGÍA GENERAL PEDIÁTRICA',
  'CIRUGÍA HEPATOBILIAR', 'CIRUGÍA MAXILO FACIAL', 'CIRUGÍA ONCOLÓGICA',
  'CIRUGÍA PLÁSTICA', 'CIRUGÍA VASCULAR',
  'COLOPROCTOLOGÍA', 'DERMATOLOGÍA', 'ENDOCRINOLOGÍA',
  'GASTROENTEROLOGÍA', 'GERIATRÍA', 'GINECOLOGÍA',
  'HEMATOLOGÍA', 'INFECTOLOGÍA',
  'MEDICINA FAMILIAR', 'MEDICINA FÍSICA Y REHABILITACIÓN',
  'MEDICINA INTENSIVA', 'MEDICINA INTERNA',
  'NEFROLOGÍA', 'NEUMOLOGÍA', 'NEUMOLOGÍA PEDIÁTRICA',
  'NEUROCIRUGÍA', 'NEUROFISIOLOGÍA', 'NEUROLOGÍA',
  'OFTALMOLOGÍA', 'ONCOLOGÍA',
  'ORTOPEDIA Y TRAUMATOLOGÍA', 'ORTOPEDAS DE COLUMNA',
  'OTORRINOLARINGOLOGÍA', 'PATOLOGÍA',
  'PEDIATRÍA', 'PEDIATRÍA/NEONATOLOGÍA', 'PEDIATRÍA / NEONATOLOGÍA',
  'PSIQUIATRÍA',
  'RADIOLOGÍA INTERVENCIONISTA', 'REUMATOLOGÍA',
  'UROLOGÍA', 'UROGINECOLOGÍA',
]);

// Known hospital/clinic names that appear alone on lines (not specialties)
const KNOWN_LOCATIONS = [
  'CLÍNICA HOSPITAL SAN FERNANDO', 'HOSPITAL NACIONAL', 'PACÍFICA SALUD',
  'THE PANAMÁ CLINIC', 'THE PANAMA CLINIC', 'CONSULTORIOS MÉDICOS PAITILLA',
  'HOSPITAL PAITILLA', 'HOSPITAL SANTA FÉ', 'HOSPITAL SANTA FE',
  'CONSULTORIOS AMÉRICA', 'CENTRO MÉDICO ESP. SAN FERNANDO',
  'CONS. MÉDICOS ROYAL CENTER', 'CONS. MÉDICOS SAN JUDAS TADEO',
  'CONSULTORIOS MÉDICOS SAN JUDAS TADEO', 'CENTRO ESP. SAN FERNANDO',
  'PAITILLA BAL HARBOUR', 'DENTAL WORKS', 'HOSPITAL BRISAS',
  'CLÍNICA BOYD', 'INSTITUTO DE SALUD FEMENINA', 'CLÍNICA CONDADO',
  'MEDIC GYM ROYAL CENTER', 'HOSPITAL PANAMERICANO',
  'CENTRO HEMATO ONCOLOGICO PANAMÁ', 'CENTRO HEMATO ONCOLÓGICO PANAMÁ',
  'CLÍNCA HOSPITAL BRISAS', 'CLÍNICA HOSPITAL BRISAS',
  'HOSPITAL CUATRO ALTOS', 'CENTRO MÉDICO DEL CARIBE',
  'SERVICIOS MÉDICOS AGUADULCE', 'CLÍNICA HOSPITAL ZARATÍ',
  'CONSULTORIOS ROYAL CENTER',
];

// Known provinces
const PROVINCES = [
  'PANAMÁ', 'PANAMA', 'CHIRIQUÍ', 'CHIRIQUI',
  'COCLÉ', 'COCLE', 'COLÓN', 'COLON',
  'HERRERA', 'LOS SANTOS', 'VERAGUAS',
  'BOCAS DEL TORO', 'DARIÉN', 'DARIEN',
  'PANAMÁ OESTE', 'PANAMA OESTE',
];

function normalizeProvince(prov: string): string {
  return prov
    .replace(/^PANAMA$/i, 'PANAMÁ')
    .replace(/^CHIRIQUI$/i, 'CHIRIQUÍ')
    .replace(/^COCLE$/i, 'COCLÉ')
    .replace(/^COLON$/i, 'COLÓN')
    .replace(/^DARIEN$/i, 'DARIÉN');
}

function isProvinceLine(line: string): string | null {
  const trimmed = line.trim().toUpperCase().replace(/\*$/, '');
  for (const prov of PROVINCES) {
    if (trimmed === prov || trimmed === `PROVINCIA DE ${prov}`) {
      return normalizeProvince(prov);
    }
  }
  return null;
}

function isSpecialtyLine(line: string): boolean {
  const trimmed = line.trim().replace(/\*$/, ''); // remove trailing asterisk
  return KNOWN_SPECIALTIES.has(trimmed);
}

function isTableHeader(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === 'NOMBREUBICACIÓNTELÉFONO' ||
    trimmed === 'NOMBREUBICACIÓN' ||
    trimmed === 'TELÉFONO';
}

function isPageHeader(line: string): boolean {
  return /^\s*Version:\s/i.test(line);
}

function isPhoneLine(line: string): boolean {
  const trimmed = line.trim();
  // Pure phone line: starts with digits, Whatsapp, or is mostly digits
  if (/^(?:Whatsapp\s+)?\+?\d[\d\s\-\.\/ext]+$/i.test(trimmed)) return true;
  if (/^\d{3,4}[\s\-]?\d{4}/.test(trimmed)) return true;
  return false;
}

function extractPhone(line: string): string {
  const trimmed = line.trim().replace(/^Whatsapp\s+/i, '');
  const match = trimmed.match(/(?:\+?507[\s\-.]?)?\d{3,4}[\s\-.]?\d{4}/);
  return match ? match[0].replace(/[\s.]/g, '').trim() : '';
}

function isLocationLine(line: string): boolean {
  const upper = line.trim().toUpperCase();
  return KNOWN_LOCATIONS.some(loc => upper.startsWith(loc));
}

/**
 * Split a line that has NAME + LOCATION merged (e.g., "BARRERA, OLGA M.CLÍNICA HOSPITAL SAN FERNANDO")
 * Returns [name, location] or null if not a doctor+location line.
 */
function splitDoctorLocationLine(line: string): [string, string] | null {
  const trimmed = line.trim();

  // Try to find a known location name within the line
  for (const loc of KNOWN_LOCATIONS) {
    const idx = trimmed.toUpperCase().indexOf(loc);
    if (idx > 5) { // At least 5 chars for name
      const name = trimmed.substring(0, idx).trim();
      const location = trimmed.substring(idx).trim();
      // Name should contain a comma (Last, First format) or have multiple words
      if (name.includes(',') || name.split(/\s+/).length >= 2) {
        return [name, location];
      }
    }
  }

  // Also check for "TODOS LOS HOSPITALES" pattern
  const todosIdx = trimmed.toUpperCase().indexOf('TODOS LOS HOSPITALES');
  if (todosIdx > 5) {
    const name = trimmed.substring(0, todosIdx).trim();
    if (name.includes(',') || name.split(/\s+/).length >= 2) {
      return [name, 'TODOS LOS HOSPITALES'];
    }
  }

  return null;
}

/**
 * Check if a line is a doctor name (standalone, without location)
 */
function isDoctorName(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 5) return false;
  // Must contain a comma (Last, First format)
  if (!trimmed.includes(',')) return false;
  // Should not be all caps (those are likely headers) - unless it has a comma (names are often all caps too)
  // Should not start with digits
  if (/^\d/.test(trimmed)) return false;
  // Should not be a known location, specialty, province, or header
  if (isTableHeader(trimmed) || isPageHeader(trimmed) || isPhoneLine(trimmed)) return false;
  if (isSpecialtyLine(trimmed) || isProvinceLine(trimmed) !== null) return false;
  if (isLocationLine(trimmed)) return false;
  return true;
}

function parsePdfText(text: string): MapfreDoctor[] {
  const doctors: MapfreDoctor[] = [];
  const lines = cleanText(text).split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // ── Phase 1: Build a specialty queue from the order specialties appear ──
  // The PDF structure has specialty names in the text. Between NOMBREUBICACIÓNTELÉFONO headers,
  // there are doctor sections. We assign specialties to sections using a queue approach.

  // Collect specialty headers and their line positions
  const specialtyQueue: { specialty: string; line: number }[] = [];
  const seenSpecialties = new Map<string, number>(); // track duplicates

  for (let i = 0; i < lines.length; i++) {
    if (isSpecialtyLine(lines[i])) {
      const spec = lines[i].trim().replace(/\*$/, '');
      // Track how many times we've seen this specialty (some appear multiple times for different provinces)
      const count = (seenSpecialties.get(spec) || 0) + 1;
      seenSpecialties.set(spec, count);
      specialtyQueue.push({ specialty: spec, line: i });
    }
  }

  console.log(`Found ${specialtyQueue.length} specialty markers in text`);

  // ── Phase 2: Parse sections between NOMBREUBICACIÓNTELÉFONO headers ──
  // Each section belongs to one specialty. Also handle lines BEFORE the first header.

  let currentProvince = 'PANAMÁ';
  let currentSpecialty = '';
  let specQueueIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip page headers
    if (isPageHeader(line)) continue;

    // Check for province
    const province = isProvinceLine(line);
    if (province) {
      currentProvince = province;
      continue;
    }

    // Check for specialty header - advance the specialty
    if (isSpecialtyLine(line)) {
      currentSpecialty = line.trim().replace(/\*$/, '');
      continue;
    }

    // Skip table headers
    if (isTableHeader(line)) {
      // A new NOMBREUBICACIÓNTELÉFONO means we're entering the next specialty section
      // If we haven't set a specialty yet, try to get it from the queue
      // But only if the NEXT specialty in queue is "ahead" of current position
      // This handles the case where specialty names appear AFTER the table header
      // Look ahead to find the next specialty name
      if (!currentSpecialty && specQueueIdx < specialtyQueue.length) {
        currentSpecialty = specialtyQueue[specQueueIdx].specialty;
        specQueueIdx++;
      }
      continue;
    }

    // Skip phone-only lines (they'll be picked up by doctor parsing)
    if (isPhoneLine(line)) continue;

    // Skip standalone location lines (not part of a doctor entry)
    if (isLocationLine(line) && !line.includes(',')) continue;

    // ── Try to parse as doctor entry ──

    // Case 1: Doctor name + location merged on one line (e.g., "BARRERA, OLGA M.CLÍNICA HOSPITAL SAN FERNANDO")
    const split = splitDoctorLocationLine(line);
    if (split) {
      const [name, location] = split;

      // Look for phone on next line(s)
      let phone = '';
      let j = i + 1;
      while (j < lines.length && j <= i + 3) {
        const nextLine = lines[j].trim();
        if (isPhoneLine(nextLine)) {
          phone = extractPhone(nextLine);
          break;
        }
        // Stop if we hit a doctor line, header, or specialty
        if (splitDoctorLocationLine(nextLine) || isDoctorName(nextLine) ||
            isTableHeader(nextLine) || isSpecialtyLine(nextLine)) break;
        j++;
      }

      if (name.length >= 5) {
        doctors.push({
          name: cleanDoctorName(name),
          specialty: currentSpecialty || 'SIN ESPECIALIDAD',
          location,
          phone,
          province: currentProvince,
        });
      }
      continue;
    }

    // Case 2: Doctor name on its own line, location and phone on following lines
    if (isDoctorName(line)) {
      let name = line;
      let location = '';
      let phone = '';

      let j = i + 1;
      // Look ahead for location and phone (up to 4 lines)
      while (j < lines.length && j <= i + 4) {
        const nextLine = lines[j].trim();

        // Stop conditions
        if (isTableHeader(nextLine) || isSpecialtyLine(nextLine) || isProvinceLine(nextLine) !== null) break;
        if (splitDoctorLocationLine(nextLine)) break; // next doctor with location
        if (isDoctorName(nextLine) && (location || phone)) break; // next doctor

        if (isPhoneLine(nextLine)) {
          if (!phone) phone = extractPhone(nextLine);
        } else if (isLocationLine(nextLine) || nextLine.toUpperCase().startsWith('TODOS LOS HOSPITALES')) {
          if (!location) location = nextLine.trim();
          else location += ', ' + nextLine.trim();
        } else if (nextLine.length > 3 && !isPageHeader(nextLine)) {
          // Could be a continuation of name or location
          if (!location) location = nextLine.trim();
          else location += ', ' + nextLine.trim();
        }

        j++;
      }

      if (name.length >= 5) {
        doctors.push({
          name: cleanDoctorName(name),
          specialty: currentSpecialty || 'SIN ESPECIALIDAD',
          location: location || 'No especificada',
          phone,
          province: currentProvince,
        });
      }
      continue;
    }
  }

  return doctors;
}

function cleanDoctorName(name: string): string {
  return name
    .replace(/,\s*$/, '')  // trailing comma
    .replace(/\s+/g, ' ')  // collapse whitespace
    .trim();
}

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — Mapfre PDF Importer');
  console.log('============================================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await downloadPdf(PDF_URL);
  } catch (err) {
    console.error('Failed to download PDF:', err);
    console.log('\nTrying alternative: reading from local file...');
    const localPath = path.join(process.cwd(), 'scripts', 'RED-MEDICA-GLOBAL.pdf');
    if (fs.existsSync(localPath)) {
      pdfBuffer = fs.readFileSync(localPath);
      console.log(`Read local file: ${(pdfBuffer.length / 1024).toFixed(0)} KB`);
    } else {
      console.error('No local PDF found either. Exiting.');
      process.exit(1);
    }
  }

  // Parse PDF (using pdf-parse v1.x)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');

  console.log('\nParsing PDF...');
  let pdfData: { text: string; numpages: number };
  try {
    pdfData = await pdfParse(pdfBuffer);
  } catch (err) {
    console.error('Failed to parse PDF:', err);
    process.exit(1);
  }

  console.log(`Pages: ${pdfData.numpages}`);
  console.log(`Text length: ${pdfData.text.length} chars\n`);

  // Save raw text for debugging
  const textPath = path.join(OUTPUT_DIR, 'mapfre-raw-text.txt');
  fs.writeFileSync(textPath, pdfData.text);
  console.log(`Raw text saved to: ${textPath}`);

  // Parse doctors
  const doctors = parsePdfText(pdfData.text);

  console.log(`\n============================================`);
  console.log(`Total doctors extracted: ${doctors.length}`);

  // Stats by specialty
  const bySpecialty = new Map<string, number>();
  const byProvince = new Map<string, number>();
  for (const d of doctors) {
    bySpecialty.set(d.specialty, (bySpecialty.get(d.specialty) || 0) + 1);
    byProvince.set(d.province, (byProvince.get(d.province) || 0) + 1);
  }

  console.log('\nBy specialty:');
  for (const [spec, count] of [...bySpecialty.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${spec}: ${count}`);
  }

  console.log('\nBy province:');
  for (const [prov, count] of [...byProvince.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${prov}: ${count}`);
  }

  // Show sample entries
  console.log('\nSample entries (first 5):');
  for (const d of doctors.slice(0, 5)) {
    console.log(`  ${d.name} | ${d.specialty} | ${d.location} | ${d.phone} | ${d.province}`);
  }

  // Save JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(doctors, null, 2));
  console.log(`\nSaved to: ${OUTPUT_FILE}`);
  console.log('Done!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
