/**
 * PlexusMap — Import doctors from The Panama Clinic & Pacífica Salud Costa del Este
 *
 * Sources:
 * - The Panama Clinic (Pacific Center, San Francisco) — ~35 doctors found
 * - Pacífica Salud / Consultorios Town Center (Costa del Este) — ~40 doctors found
 *
 * Usage:
 *   npx tsx scripts/import-panama-clinic-cde.ts --dry-run
 *   npx tsx scripts/import-panama-clinic-cde.ts --execute
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HospitalInfo {
  lat: number;
  lng: number;
  address: string;
  phone: string;
}

const HOSPITALS: Record<string, HospitalInfo> = {
  'PANAMA_CLINIC': {
    lat: 8.9944, lng: -79.5103,
    address: 'The Panama Clinic, Pacific Center, Calle Ramón H. Jurado, San Francisco, Ciudad de Panamá',
    phone: '+507-310-1111',
  },
  'COSTA_DEL_ESTE': {
    lat: 9.0715, lng: -79.3998,
    address: 'Pacífica Salud / Consultorios Town Center, Costa del Este, Ciudad de Panamá',
    phone: '+507-271-4800',
  },
};

const SPECIALTY_MAP: Record<string, string> = {
  'Cardiology': 'cardiologia',
  'Interventional Cardiology': 'cardiologia',
  'Cardiovascular Surgery': 'cardiologia',
  'Cardiovascular and Thoracic Surgery': 'cardiologia',
  'Dermatology': 'dermatologia',
  'Dermatopathology': 'dermatologia',
  'Plastic Surgery': 'dermatologia',
  'Aesthetic Surgery': 'dermatologia',
  'Ophthalmology': 'oftalmologia',
  'Gynecology-Obstetrics': 'ginecologia',
  'Gynecologic Oncology': 'ginecologia',
  'Reproductive Endocrinology': 'ginecologia',
  'Maternal-Fetal Medicine': 'ginecologia',
  'Pediatrics': 'pediatria',
  'Pediatric Pulmonology': 'pediatria',
  'Neonatology': 'pediatria',
  'Pediatric Surgery': 'pediatria',
  'Pediatric Neurosurgery': 'medicina-general',
  'Orthopedics': 'ortopedia',
  'Orthopedics and Traumatology': 'ortopedia',
  'Spine Surgery': 'ortopedia',
  'Urology': 'urologia',
  'Neurology': 'neurologia',
  'Neurosurgery': 'medicina-general',
  'Neurological Surgery': 'medicina-general',
  'Internal Medicine': 'medicina-general',
  'Pulmonology': 'medicina-general',
  'Gastroenterology': 'medicina-general',
  'General Surgery': 'medicina-general',
  'Bariatric Surgery': 'medicina-general',
  'Otolaryngology': 'medicina-general',
  'Otolaryngology (ENT)': 'medicina-general',
  'Anesthesiology': 'medicina-general',
  'Oncology': 'medicina-general',
  'Hematology': 'medicina-general',
  'Nephrology': 'medicina-general',
  'Rheumatology': 'medicina-general',
  'Allergology': 'medicina-general',
  'Allergology and Immunology': 'medicina-general',
  'Family Medicine': 'medicina-general',
  'Primary Care': 'medicina-general',
  'Physical Medicine and Rehabilitation': 'fisioterapia',
  'Physical Therapy': 'fisioterapia',
  'Psychiatry': 'psicologia',
  'Psychology': 'psicologia',
  'Dentistry': 'odontologia-general',
  'Orthodontics': 'odontologia-general',
  'Nutrition': 'nutricion',
  'Phonoaudiology': 'medicina-general',
};

interface RawDoctor {
  name: string;
  specialty: string;
  hospital: string;
}

// ── The Panama Clinic ──
const PANAMA_CLINIC_DOCTORS: RawDoctor[] = [
  // Gastroenterology / Internal Medicine
  { name: 'Erides Vergara Hernández', specialty: 'Gastroenterology', hospital: 'PANAMA_CLINIC' },
  { name: 'Calixto Duarte Chang', specialty: 'Gastroenterology', hospital: 'PANAMA_CLINIC' },
  { name: 'Eduardo Gabriel Hevia', specialty: 'Pulmonology', hospital: 'PANAMA_CLINIC' },
  // Neurology / Internal Medicine
  { name: 'Josefina Fletcher', specialty: 'Neurology', hospital: 'PANAMA_CLINIC' },
  // Otolaryngology
  { name: 'Yarineth Quintero Caballero', specialty: 'Otolaryngology (ENT)', hospital: 'PANAMA_CLINIC' },
  // Gynecology / Oncology
  { name: 'Alan Jair Juliào Torres', specialty: 'Gynecology-Obstetrics', hospital: 'PANAMA_CLINIC' },
  { name: 'Julio Godoy Byerly', specialty: 'Gynecologic Oncology', hospital: 'PANAMA_CLINIC' },
  // Surgery
  { name: 'Algis Herrera', specialty: 'General Surgery', hospital: 'PANAMA_CLINIC' },
  { name: 'Ricardo M. Jaramillo Guerrero', specialty: 'Cardiovascular and Thoracic Surgery', hospital: 'PANAMA_CLINIC' },
  { name: 'Gregorio De Los Ríos De Frías', specialty: 'Cardiovascular Surgery', hospital: 'PANAMA_CLINIC' },
  // Cardiology
  { name: 'Julio Effio', specialty: 'Cardiology', hospital: 'PANAMA_CLINIC' },
  // Ophthalmology
  { name: 'Rodolfo Yi', specialty: 'Ophthalmology', hospital: 'PANAMA_CLINIC' },
  // Plastic Surgery
  { name: 'Jacqueline Richa', specialty: 'Aesthetic Surgery', hospital: 'PANAMA_CLINIC' },
  { name: 'Luis Caballero', specialty: 'Plastic Surgery', hospital: 'PANAMA_CLINIC' },
  // Psychology
  { name: 'Kathina Melo', specialty: 'Psychology', hospital: 'PANAMA_CLINIC' },
  // COPAC Orthopedics (Centro Ortopédico Panamá Clinic)
  { name: 'Emilio Tufiño', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'José Castillo', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'Carlos Rebollón', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'Max Medina', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'José Molina', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'Juan Osorio', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'Raúl Arjona', specialty: 'Spine Surgery', hospital: 'PANAMA_CLINIC' },
  { name: 'Nelson Cedeño', specialty: 'Spine Surgery', hospital: 'PANAMA_CLINIC' },
  { name: 'Guillermo Julio Tatis', specialty: 'Spine Surgery', hospital: 'PANAMA_CLINIC' },
  { name: 'Neal Sampson Graham', specialty: 'Spine Surgery', hospital: 'PANAMA_CLINIC' },
  { name: 'Nicolás Gutiérrez', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'Kathiusca Chipantiza', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'Sebastián Tatis', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'Eduardo Badillo', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'Ricardo Gutiérrez', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  { name: 'Antonio Deng', specialty: 'Orthopedics', hospital: 'PANAMA_CLINIC' },
  // Fernando Márquez
  { name: 'Fernando Márquez', specialty: 'Pulmonology', hospital: 'PANAMA_CLINIC' },
];

// ── Pacífica Salud / Consultorios Town Center — Costa del Este ──
const COSTA_DEL_ESTE_DOCTORS: RawDoctor[] = [
  // Cardiology
  { name: 'Jonathan Rubin', specialty: 'Interventional Cardiology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Francisco Javier Iglesias Rozas', specialty: 'Cardiology', hospital: 'COSTA_DEL_ESTE' },
  // Gynecology & Reproductive Medicine
  { name: 'Alberto De Abate', specialty: 'Gynecology-Obstetrics', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Roberto Epifanio Malpassi', specialty: 'Reproductive Endocrinology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Carla Donado', specialty: 'Gynecology-Obstetrics', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Oscar Cerrud Botacio', specialty: 'Gynecology-Obstetrics', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Gabriel Arosemena', specialty: 'Gynecology-Obstetrics', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Pedro Antonio Ponce Barberena', specialty: 'Maternal-Fetal Medicine', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Raúl Correa Vizoso', specialty: 'Gynecology-Obstetrics', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Ricardo Alberto Ponce de Sedas', specialty: 'Reproductive Endocrinology', hospital: 'COSTA_DEL_ESTE' },
  // General & Bariatric Surgery
  { name: 'Emmy Arrue Del Cid', specialty: 'Bariatric Surgery', hospital: 'COSTA_DEL_ESTE' },
  // Orthopedics
  { name: 'Manuel Vallarino', specialty: 'Orthopedics and Traumatology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Gustavo Alemán Arjona', specialty: 'Orthopedics and Traumatology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Gustavo Adolfo Pinilla Bonilla', specialty: 'Orthopedics and Traumatology', hospital: 'COSTA_DEL_ESTE' },
  // Neurosurgery
  { name: 'José Antonio Molina Montañez', specialty: 'Neurological Surgery', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Rubén Batista Quintero', specialty: 'Neurological Surgery', hospital: 'COSTA_DEL_ESTE' },
  // Neurology / Internal Medicine
  { name: 'Nelson Novarro Escudero', specialty: 'Neurology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'David Roman Dondis Camaño', specialty: 'Neurology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Lisbeth López Moreno', specialty: 'Internal Medicine', hospital: 'COSTA_DEL_ESTE' },
  // Urology
  { name: 'Juan Carlos Arenas M.', specialty: 'Urology', hospital: 'COSTA_DEL_ESTE' },
  // ENT
  { name: 'Jolie Anna Crespo Chanis', specialty: 'Otolaryngology (ENT)', hospital: 'COSTA_DEL_ESTE' },
  // Ophthalmology
  { name: 'Gabriel Frederick', specialty: 'Ophthalmology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Maritza López Moreno', specialty: 'Ophthalmology', hospital: 'COSTA_DEL_ESTE' },
  // Allergology
  { name: 'Rosella Lee Ng', specialty: 'Allergology and Immunology', hospital: 'COSTA_DEL_ESTE' },
  // Dermatology
  { name: 'José Manuel Ríos Yuil', specialty: 'Dermatology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Karen Miller', specialty: 'Dermatology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Reynaldo Arosemena', specialty: 'Dermatology', hospital: 'COSTA_DEL_ESTE' },
  // Psychiatry
  { name: 'Elkirys Quintero R.', specialty: 'Psychiatry', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Karen González', specialty: 'Psychiatry', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Laura de Jongh', specialty: 'Psychiatry', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Fernando Javier Gómez Torrijos', specialty: 'Psychology', hospital: 'COSTA_DEL_ESTE' },
  // Family Medicine
  { name: 'Daymé T. Quintero', specialty: 'Family Medicine', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Demetrio Serracín Callender', specialty: 'Family Medicine', hospital: 'COSTA_DEL_ESTE' },
  // Pediatrics
  { name: 'Jenniffer Wittgreen', specialty: 'Pediatric Pulmonology', hospital: 'COSTA_DEL_ESTE' },
  { name: 'Darío Vallarino', specialty: 'Pediatrics', hospital: 'COSTA_DEL_ESTE' },
  // Physical Medicine
  { name: 'Ericka Batista', specialty: 'Physical Medicine and Rehabilitation', hospital: 'COSTA_DEL_ESTE' },
  // Nutrition
  { name: 'Sara Saldarriaga', specialty: 'Nutrition', hospital: 'COSTA_DEL_ESTE' },
  // Dentistry
  { name: 'Francisco Sousa-Lennox', specialty: 'Dentistry', hospital: 'COSTA_DEL_ESTE' },
];

const ALL_DOCTORS = [...PANAMA_CLINIC_DOCTORS, ...COSTA_DEL_ESTE_DOCTORS];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

/** Normalize name with words sorted — for dedup across name-order variants */
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

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  npx tsx scripts/import-panama-clinic-cde.ts --dry-run');
    console.log('  npx tsx scripts/import-panama-clinic-cde.ts --execute');
    process.exit(0);
  }

  console.log('============================================');
  console.log('  PlexusMap — Import Panama Clinic + CDE');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('============================================\n');

  const NEEDED_SPECIALTIES = [
    { slug: 'neurologia', name: 'Neurología', icon: '🧬' },
    { slug: 'nutricion', name: 'Nutrición y Dietética', icon: '🥗' },
    { slug: 'fisioterapia', name: 'Fisioterapia y Rehabilitación', icon: '🏃' },
    { slug: 'ortopedia', name: 'Ortopedia', icon: '🦿' },
    { slug: 'psicologia', name: 'Psicología y Psiquiatría', icon: '🧠' },
    { slug: 'odontologia-general', name: 'Odontología General', icon: '🦷' },
    { slug: 'optometria', name: 'Optometría', icon: '👁️' },
  ];
  for (const spec of NEEDED_SPECIALTIES) {
    await prisma.specialty.upsert({ where: { slug: spec.slug }, update: {}, create: spec });
  }

  const specialties = await prisma.specialty.findMany();
  const specialtyBySlug = new Map(specialties.map(s => [s.slug, s]));

  const existing = await prisma.professional.findMany({ select: { name: true, slug: true } });
  const existingSlugs = new Set(existing.map(p => p.slug));
  // Use SORTED normalization to catch inverted names
  const existingNamesSorted = new Set(existing.map(p => normalizeNameSorted(p.name)));

  console.log(`Doctors to import: ${ALL_DOCTORS.length}`);
  console.log(`  The Panama Clinic: ${PANAMA_CLINIC_DOCTORS.length}`);
  console.log(`  Costa del Este: ${COSTA_DEL_ESTE_DOCTORS.length}`);
  console.log(`Existing professionals: ${existing.length}\n`);

  let created = 0;
  let duplicates = 0;
  const unmappedSpecialties = new Set<string>();

  for (const doc of ALL_DOCTORS) {
    const sortedKey = normalizeNameSorted(doc.name);
    if (existingNamesSorted.has(sortedKey)) {
      duplicates++;
      continue;
    }

    const cleanName = doc.name.replace(/^(Lcda\.\s*|Lic\.\s*|Dra?\.\s*)/i, '').trim();
    const specialtySlug = SPECIALTY_MAP[doc.specialty];
    if (!specialtySlug) { unmappedSpecialties.add(doc.specialty); continue; }

    const specialty = specialtyBySlug.get(specialtySlug);
    if (!specialty) { unmappedSpecialties.add(`${doc.specialty} → ${specialtySlug} (not in DB)`); continue; }

    const hospital = HOSPITALS[doc.hospital];
    const slug = generateSlug(cleanName);
    if (existingSlugs.has(slug)) { duplicates++; continue; }

    if (isDryRun) {
      console.log(`  + ${cleanName} | ${doc.specialty} → ${specialtySlug} | ${doc.hospital}`);
    }

    if (isExecute) {
      try {
        await prisma.professional.create({
          data: {
            slug,
            name: cleanName,
            specialtyId: specialty.id,
            address: hospital.address,
            lat: hospital.lat,
            lng: hospital.lng,
            phone: hospital.phone,
            rating: 0,
            reviewCount: 0,
            isVerified: false,
            isClaimed: false,
            photos: [],
          },
        });
        created++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('Unique constraint')) { duplicates++; }
        else { console.error(`  Error creating ${cleanName}: ${msg}`); }
      }
    } else {
      created++;
    }

    existingSlugs.add(slug);
    existingNamesSorted.add(sortedKey);
  }

  console.log('\n============================================');
  console.log('RESULTS:');
  console.log(`  ${isDryRun ? 'Would create' : 'Created'}:  ${created}`);
  console.log(`  Duplicates:  ${duplicates}`);
  if (unmappedSpecialties.size > 0) {
    console.log(`  Unmapped: ${[...unmappedSpecialties].join(', ')}`);
  }
  console.log('============================================');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
