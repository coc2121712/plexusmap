/**
 * PlexusMap — Import doctors from additional hospital directories (batch 2)
 *
 * Sources:
 * - Hospital Nacional / Consultorios Nacionales — ~70 doctors
 * - Consultorios Médicos Royal Center — ~170 doctors
 * - Hospital Minimed — ~80 doctors
 * - Clínica Boyd — 9 ophthalmologists
 * - Hospital Santa Fe (Panamá) — ~40 doctors
 * - Consultorios América — ~85 doctors
 * - The Panama Clinic — 2 doctors
 * - Hospital Brisas — 2 doctors
 *
 * Usage:
 *   npx tsx scripts/import-more-hospitals.ts --dry-run   (preview)
 *   npx tsx scripts/import-more-hospitals.ts --execute    (import)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════
// Verified hospital coordinates
// ═══════════════════════════════════════════

interface HospitalInfo {
  lat: number;
  lng: number;
  address: string;
  phone: string;
}

const HOSPITALS: Record<string, HospitalInfo> = {
  'NACIONAL': {
    lat: 8.9706, lng: -79.5336,
    address: 'Hospital Nacional, Avenida Cuba, Bella Vista, Ciudad de Panamá',
    phone: '+507-207-8100',
  },
  'ROYAL_CENTER': {
    lat: 8.9840, lng: -79.5176,
    address: 'Consultorios Médicos Royal Center, Calle 53, Marbella, Ciudad de Panamá',
    phone: '+507-263-0407',
  },
  'MINIMED': {
    lat: 8.9790, lng: -79.5250,
    address: 'Hospital Minimed, Vía Ricardo J. Alfaro, Ciudad de Panamá',
    phone: '+507-236-8102',
  },
  'BOYD': {
    lat: 8.9830, lng: -79.5230,
    address: 'Clínica Boyd, Calle 50 y Ave. Venezuela, Ciudad de Panamá',
    phone: '+507-263-3333',
  },
  'SANTA_FE': {
    lat: 8.9759, lng: -79.5384,
    address: 'Hospital Santa Fe, Calidonia, Ciudad de Panamá',
    phone: '+507-227-4733',
  },
  'AMERICA': {
    lat: 8.9810, lng: -79.5280,
    address: 'Consultorios América, Avenida Cuba, Carrasquilla, Ciudad de Panamá',
    phone: '+507-229-4444',
  },
  'PANAMA_CLINIC': {
    lat: 8.9944, lng: -79.5103,
    address: 'The Panama Clinic, Calle Ramón H. Jurado, Ciudad de Panamá',
    phone: '+507-310-1111',
  },
  'BRISAS': {
    lat: 9.0695, lng: -79.4598,
    address: 'Hospital Brisas, Brisas del Golf, Ciudad de Panamá',
    phone: '+507-261-9100',
  },
};

// ═══════════════════════════════════════════
// Specialty mapping (English → PlexusMap slugs)
// ═══════════════════════════════════════════

const SPECIALTY_MAP: Record<string, string> = {
  // Cardiology
  'Cardiology': 'cardiologia',
  'Cardiología': 'cardiologia',
  'Nuclear Cardiology': 'cardiologia',
  'Hemodynamics and Interventional Cardiology': 'cardiologia',
  'Cardiac Electrophysiology': 'cardiologia',
  'Cardiovascular and Thoracic Surgery': 'cardiologia',
  'Cardiovascular and Peripheral Surgery': 'cardiologia',
  'Cardiovascular Surgery': 'cardiologia',
  'Pediatric Cardiovascular Surgery': 'cardiologia',
  'Pediatric Cardiology': 'cardiologia',
  'Cardiología Pediátrica': 'cardiologia',
  // Dermatology
  'Dermatology': 'dermatologia',
  'Dermatología': 'dermatologia',
  'Cosmetic Dermatology': 'dermatologia',
  'Plastic Surgery': 'dermatologia',
  'Cirugía Plástica': 'dermatologia',
  // Ophthalmology
  'Ophthalmology': 'oftalmologia',
  'Oftalmología': 'oftalmologia',
  'Retina and Vitreous': 'oftalmologia',
  'Cornea & Cataract': 'oftalmologia',
  'Ocular Plastic Surgery': 'oftalmologia',
  'Glaucoma': 'oftalmologia',
  'Retina': 'oftalmologia',
  // Gynecology
  'Gynecology-Obstetrics': 'ginecologia',
  'Ginecología y Obstetricia': 'ginecologia',
  'Ginecología': 'ginecologia',
  'Gynecology': 'ginecologia',
  'Colposcopia': 'ginecologia',
  // Pediatrics
  'Pediatrics': 'pediatria',
  'Pediatría': 'pediatria',
  'Neonatology': 'pediatria',
  'Neonatología': 'pediatria',
  'Pediatric Endocrinology': 'pediatria',
  'Pediatric Surgery': 'pediatria',
  'Cirugía Pediátrica': 'pediatria',
  'Pediatric Hematology': 'pediatria',
  'Pediatric Oncology': 'pediatria',
  'Critical Pediatric Medicine': 'pediatria',
  // Orthopedics
  'Orthopedics and Traumatology': 'ortopedia',
  'Orthopedics': 'ortopedia',
  'Ortopedia': 'ortopedia',
  'Ortopedia y Traumatología': 'ortopedia',
  'Pediatric Orthopedics': 'ortopedia',
  // Urology
  'Urology': 'urologia',
  'Urología': 'urologia',
  'Oncological Urology': 'urologia',
  'Pediatric Urology': 'urologia',
  // Neurology
  'Neurology': 'neurologia',
  'Neurología': 'neurologia',
  'Pediatric Neurology': 'neurologia',
  'Neurología Pediátrica': 'neurologia',
  // Nutrition
  'Nutrition': 'nutricion',
  'Nutrición': 'nutricion',
  'Clinical Nutrition': 'nutricion',
  'Nutricionistas': 'nutricion',
  'Dietista': 'nutricion',
  // Physical therapy
  'Physical Therapy': 'fisioterapia',
  'Fisioterapia': 'fisioterapia',
  'Occupational Therapy': 'fisioterapia',
  // Psychology / Psychiatry
  'Psychiatry': 'psicologia',
  'Psiquiatría': 'psicologia',
  'Child Psychiatry': 'psicologia',
  'Psychology': 'psicologia',
  'Psicología': 'psicologia',
  // Dentistry
  'Dentistry': 'odontologia-general',
  'General Dentistry': 'odontologia-general',
  'Odontología': 'odontologia-general',
  'Dental Surgery': 'odontologia-general',
  'Orthodontics': 'odontologia-general',
  'Periodontics': 'odontologia-general',
  'Endodontics': 'odontologia-general',
  'Pediatric Dentistry': 'odontologia-general',
  'Endodoncista': 'odontologia-general',
  // Optometry
  'Optometría': 'optometria',
  'Optometrista': 'optometria',
  // General / Internal Medicine
  'Internal Medicine': 'medicina-general',
  'Medicina Interna': 'medicina-general',
  'General Surgery': 'medicina-general',
  'Cirugía General': 'medicina-general',
  'Gastroenterology': 'medicina-general',
  'Gastroenterología': 'medicina-general',
  'Endocrinology': 'medicina-general',
  'Endocrinología': 'medicina-general',
  'Otolaryngology': 'medicina-general',
  'Otorrinolaringología': 'medicina-general',
  'Neurosurgery': 'medicina-general',
  'Neurocirugía': 'medicina-general',
  'Oncology': 'medicina-general',
  'Oncología Médica': 'medicina-general',
  'Radiation Oncology': 'medicina-general',
  'Oncological Radiotherapy': 'medicina-general',
  'Hematology': 'medicina-general',
  'Hematología': 'medicina-general',
  'Nephrology': 'medicina-general',
  'Nefrología': 'medicina-general',
  'Rheumatology': 'medicina-general',
  'Reumatología': 'medicina-general',
  'Pneumology': 'medicina-general',
  'Pneumology/Pulmonology': 'medicina-general',
  'Neumología': 'medicina-general',
  'Infectology': 'medicina-general',
  'Coloproctology': 'medicina-general',
  'Proctología': 'medicina-general',
  'Anesthesiology': 'medicina-general',
  'Anestesiología': 'medicina-general',
  'Family Medicine': 'medicina-general',
  'Medicina General': 'medicina-general',
  'Primary Care': 'medicina-general',
  'Primary Care Doctor': 'medicina-general',
  'Pathology': 'medicina-general',
  'Patología': 'medicina-general',
  'Diagnostic Radiology': 'medicina-general',
  'Critical Medicine and Intensive Care': 'medicina-general',
  'Intensive Therapy': 'medicina-general',
  'Pain Management': 'medicina-general',
  'Algiología': 'medicina-general',
  'Angiology': 'medicina-general',
  'Undersea and Hyperbaric Medicine': 'medicina-general',
  'Occupational Health': 'medicina-general',
  'Neurological Surgery': 'medicina-general',
  'Phonoaudiology': 'medicina-general',
  'Fonoaudiología': 'medicina-general',
};

// ═══════════════════════════════════════════
// Doctor data from hospital directories
// ═══════════════════════════════════════════

interface RawDoctor {
  name: string;
  specialty: string;
  hospital: string;
}

// ── Hospital Nacional ──
const NACIONAL_DOCTORS: RawDoctor[] = [
  { name: 'Alberto Morán', specialty: 'General Surgery', hospital: 'NACIONAL' },
  { name: 'Alexander Romero Guerra', specialty: 'Cardiology', hospital: 'NACIONAL' },
  { name: 'Anaís Beitia', specialty: 'Physical Therapy', hospital: 'NACIONAL' },
  { name: 'Aníbal De León Sosa', specialty: 'Rheumatology', hospital: 'NACIONAL' },
  { name: 'Arcecio Isael Adames Márquez', specialty: 'Otolaryngology', hospital: 'NACIONAL' },
  { name: 'Ariel Bolívar Racine González', specialty: 'Orthopedics and Traumatology', hospital: 'NACIONAL' },
  { name: 'Arlenne Méndez', specialty: 'Gynecology-Obstetrics', hospital: 'NACIONAL' },
  { name: 'Bruno Armando Carvajal Gumbán', specialty: 'Ophthalmology', hospital: 'NACIONAL' },
  { name: 'Carlos M. Owens', specialty: 'Diagnostic Radiology', hospital: 'NACIONAL' },
  { name: 'Carlos Omar Montero Osorio', specialty: 'Hematology', hospital: 'NACIONAL' },
  { name: 'Cristina González Niño', specialty: 'Pediatrics', hospital: 'NACIONAL' },
  { name: 'Cristina Silvera', specialty: 'Family Medicine', hospital: 'NACIONAL' },
  { name: "D'arcy Dale Smith Scott", specialty: 'Gynecology-Obstetrics', hospital: 'NACIONAL' },
  { name: 'Demetrio Villalba Kravcio', specialty: 'Plastic Surgery', hospital: 'NACIONAL' },
  { name: 'Diana Moreno', specialty: 'Periodontics', hospital: 'NACIONAL' },
  { name: 'Diego González Siburú', specialty: 'Gynecology-Obstetrics', hospital: 'NACIONAL' },
  { name: 'Edgar Oscar Avilés Bosquez', specialty: 'Cardiology', hospital: 'NACIONAL' },
  { name: 'Eduardo Prado', specialty: 'Critical Medicine and Intensive Care', hospital: 'NACIONAL' },
  { name: 'Elena Chevalier', specialty: 'Pneumology', hospital: 'NACIONAL' },
  { name: 'Eliécer Cherigó', specialty: 'Radiation Oncology', hospital: 'NACIONAL' },
  { name: 'Elisa Carrizo Medrano', specialty: 'General Dentistry', hospital: 'NACIONAL' },
  { name: 'Eric Martin Ortiz Núñez', specialty: 'Gastroenterology', hospital: 'NACIONAL' },
  { name: 'Erika Ortega', specialty: 'Cardiology', hospital: 'NACIONAL' },
  { name: 'Erick Eduardo Villarreal Vergara', specialty: 'Diagnostic Radiology', hospital: 'NACIONAL' },
  { name: 'Felipe Chong Wong', specialty: 'Cardiology', hospital: 'NACIONAL' },
  { name: 'Fernando Guillermo Márquez Fábrega', specialty: 'Pneumology', hospital: 'NACIONAL' },
  { name: 'Fernando Iván González Link', specialty: 'Gynecology-Obstetrics', hospital: 'NACIONAL' },
  { name: 'Franklin Adolfo Carrillo', specialty: 'Orthopedics and Traumatology', hospital: 'NACIONAL' },
  { name: 'Gerardo Cárdenas', specialty: 'Gynecology-Obstetrics', hospital: 'NACIONAL' },
  { name: 'Giovanna Linero Archibold', specialty: 'Gynecology-Obstetrics', hospital: 'NACIONAL' },
  { name: 'Gisselle Murillo Marengo', specialty: 'Otolaryngology', hospital: 'NACIONAL' },
  { name: 'Gustavo Gil Lasso', specialty: 'Gynecology-Obstetrics', hospital: 'NACIONAL' },
  { name: 'Humberto Juárez', specialty: 'Cardiovascular and Thoracic Surgery', hospital: 'NACIONAL' },
  { name: 'Ihamir Duarte Polanco', specialty: 'Psychiatry', hospital: 'NACIONAL' },
  { name: 'Indalecio Navarro', specialty: 'Dentistry', hospital: 'NACIONAL' },
  { name: 'Joanna Cedeño', specialty: 'Ophthalmology', hospital: 'NACIONAL' },
  { name: 'José Silvio Saavedra Espinoza', specialty: 'Pediatrics', hospital: 'NACIONAL' },
  { name: 'Juan Carlos Alcedo', specialty: 'Oncology', hospital: 'NACIONAL' },
  { name: 'Juan Carlos De Mola López', specialty: 'Neurosurgery', hospital: 'NACIONAL' },
  { name: 'Juan Carlos Vega Malek', specialty: 'Gynecology-Obstetrics', hospital: 'NACIONAL' },
  { name: 'Juan Felipe Wong', specialty: 'Gynecology-Obstetrics', hospital: 'NACIONAL' },
  { name: 'Karen Jordan', specialty: 'Physical Therapy', hospital: 'NACIONAL' },
  { name: 'Leandro González Alvarado', specialty: 'Anesthesiology', hospital: 'NACIONAL' },
  { name: 'Lisveth Quintero Rueda', specialty: 'Cardiology', hospital: 'NACIONAL' },
  { name: 'Luis Alfredo Morales Tribaldos', specialty: 'Cardiology', hospital: 'NACIONAL' },
  { name: 'María del Carmen Gutiérrez', specialty: 'Orthopedics and Traumatology', hospital: 'NACIONAL' },
  { name: 'Marilyn Medrano', specialty: 'Critical Medicine and Intensive Care', hospital: 'NACIONAL' },
  { name: 'Marcos Acosta Herrera', specialty: 'Nephrology', hospital: 'NACIONAL' },
  { name: 'Nelson Rodríguez Torregroza', specialty: 'Family Medicine', hospital: 'NACIONAL' },
  { name: 'Nicolás Henry Hurtado', specialty: 'Internal Medicine', hospital: 'NACIONAL' },
  { name: 'Norberto Orlando Carreño Reyna', specialty: 'Gastroenterology', hospital: 'NACIONAL' },
  { name: 'Ovidio Alberto Guillén de León', specialty: 'Diagnostic Radiology', hospital: 'NACIONAL' },
  { name: 'Ovidio Igor de Freitas Patiño', specialty: 'Nephrology', hospital: 'NACIONAL' },
  { name: 'Ramiro Da Silva Llibre', specialty: 'Internal Medicine', hospital: 'NACIONAL' },
  { name: 'Ramiro Da Silva Rodríguez', specialty: 'Gastroenterology', hospital: 'NACIONAL' },
  { name: 'Roberto Iván López Sánchez', specialty: 'Oncology', hospital: 'NACIONAL' },
  { name: 'Rosalía Margarita Báez Gómez', specialty: 'Ophthalmology', hospital: 'NACIONAL' },
  { name: 'Vanessa M. Moreno Alvear', specialty: 'Endodontics', hospital: 'NACIONAL' },
  { name: 'Yiselt Anet Pérez Ríos', specialty: 'Diagnostic Radiology', hospital: 'NACIONAL' },
  { name: 'Alba Irene Him Nieto', specialty: 'Pediatric Dentistry', hospital: 'NACIONAL' },
  { name: 'Auristela Inés Muñoz Cuéllar', specialty: 'Ophthalmology', hospital: 'NACIONAL' },
  { name: 'Camilo Ulises Jaén Russo', specialty: 'Nephrology', hospital: 'NACIONAL' },
  { name: 'María A. Niedda de Molina', specialty: 'Nephrology', hospital: 'NACIONAL' },
  { name: 'Robert Wayne Samuels Halphen', specialty: 'Otolaryngology', hospital: 'NACIONAL' },
  { name: 'Ana Carolina Pérez', specialty: 'Nutrition', hospital: 'NACIONAL' },
];

// ── Royal Center — Medical specialists (excluding cosmetology, podiatry, chiropractic, nursing) ──
const ROYAL_CENTER_DOCTORS: RawDoctor[] = [
  // Cardiology
  { name: 'Alberto Sotomayor Adames', specialty: 'Cardiology', hospital: 'ROYAL_CENTER' },
  { name: 'Raúl Manuel Reyes Canto', specialty: 'Cardiology', hospital: 'ROYAL_CENTER' },
  { name: 'Lizbeth Dayana Saldaña Morales', specialty: 'Cardiovascular Surgery', hospital: 'ROYAL_CENTER' },
  { name: 'Luis Alfredo Morales Tribaldos', specialty: 'Cardiology', hospital: 'ROYAL_CENTER' },
  { name: 'Félix Pitty', specialty: 'Cardiovascular and Thoracic Surgery', hospital: 'ROYAL_CENTER' },
  { name: 'Martín Milcíades Vásquez', specialty: 'Cardiovascular and Thoracic Surgery', hospital: 'ROYAL_CENTER' },
  { name: 'Carlos A. Alba C.', specialty: 'Cardiovascular and Peripheral Surgery', hospital: 'ROYAL_CENTER' },
  // Dermatology
  { name: 'Herbert Schlager', specialty: 'Dermatology', hospital: 'ROYAL_CENTER' },
  { name: 'América Leyton', specialty: 'Dermatology', hospital: 'ROYAL_CENTER' },
  { name: 'Laura Inés Porcell Méndez', specialty: 'Dermatology', hospital: 'ROYAL_CENTER' },
  { name: 'Reynaldo Arosemena Sarkissian', specialty: 'Dermatology', hospital: 'ROYAL_CENTER' },
  { name: 'Eduardo Jesús Núñez Jordán', specialty: 'Dermatology', hospital: 'ROYAL_CENTER' },
  { name: 'Karen Annette Miller Linares', specialty: 'Dermatology', hospital: 'ROYAL_CENTER' },
  { name: 'Zuleika González Ríos de Blandón', specialty: 'Dermatology', hospital: 'ROYAL_CENTER' },
  // Endocrinology
  { name: 'Amado Brunette Lu', specialty: 'Endocrinology', hospital: 'ROYAL_CENTER' },
  { name: 'Konstantinos Tserotas', specialty: 'Gynecology-Obstetrics', hospital: 'ROYAL_CENTER' },
  // Gastroenterology
  { name: 'José Ángel Pérez', specialty: 'Gastroenterology', hospital: 'ROYAL_CENTER' },
  // General Surgery
  { name: 'Jorge Rubén Ortiz Montemayor', specialty: 'General Surgery', hospital: 'ROYAL_CENTER' },
  { name: 'Ricardo Chepote', specialty: 'General Surgery', hospital: 'ROYAL_CENTER' },
  // Gynecology-Obstetrics
  { name: 'Juan Antonio Tribaldos Palacios', specialty: 'Gynecology-Obstetrics', hospital: 'ROYAL_CENTER' },
  { name: 'Saúl Maloul', specialty: 'Gynecology-Obstetrics', hospital: 'ROYAL_CENTER' },
  { name: 'Marta Olmos', specialty: 'Gynecology-Obstetrics', hospital: 'ROYAL_CENTER' },
  { name: 'Aracelly Barahona Delgado', specialty: 'Gynecology-Obstetrics', hospital: 'ROYAL_CENTER' },
  { name: 'Alejandro Smith Gallardo', specialty: 'Gynecology-Obstetrics', hospital: 'ROYAL_CENTER' },
  { name: 'Eric Molino García', specialty: 'Gynecology-Obstetrics', hospital: 'ROYAL_CENTER' },
  // Hematology
  { name: 'Germán Abel Espino López', specialty: 'Hematology', hospital: 'ROYAL_CENTER' },
  { name: 'Dimas Ariel Quiel Rodríguez', specialty: 'Hematology', hospital: 'ROYAL_CENTER' },
  { name: 'Ricardo Díaz Fernández', specialty: 'Hematology', hospital: 'ROYAL_CENTER' },
  { name: 'Lineth López', specialty: 'Hematology', hospital: 'ROYAL_CENTER' },
  { name: 'Ana Catalina Cooke Tapia', specialty: 'Hematology', hospital: 'ROYAL_CENTER' },
  { name: 'José Luis Franceschi', specialty: 'Hematology', hospital: 'ROYAL_CENTER' },
  { name: 'Benito Arturo Castillo', specialty: 'Hematology', hospital: 'ROYAL_CENTER' },
  // Pediatric Hematology
  { name: 'Rebeca Ríos Zavala', specialty: 'Pediatric Hematology', hospital: 'ROYAL_CENTER' },
  { name: 'Rafael Guillermo Joly Linero', specialty: 'Pediatric Hematology', hospital: 'ROYAL_CENTER' },
  { name: 'Jaime Boyd', specialty: 'Pediatric Hematology', hospital: 'ROYAL_CENTER' },
  { name: 'Diana Maribel Cedeño Pérez', specialty: 'Pediatric Hematology', hospital: 'ROYAL_CENTER' },
  // Infectology
  { name: 'José Luis Moreno Castillo', specialty: 'Infectology', hospital: 'ROYAL_CENTER' },
  { name: 'Guillermo Kennion Rodríguez', specialty: 'Infectology', hospital: 'ROYAL_CENTER' },
  // Internal Medicine
  { name: 'Manuel Pereira Véliz', specialty: 'Internal Medicine', hospital: 'ROYAL_CENTER' },
  { name: 'Julio Joel Jaramillo Ramos', specialty: 'Internal Medicine', hospital: 'ROYAL_CENTER' },
  { name: 'Franklin Agustín Castillero Rodríguez', specialty: 'Oncology', hospital: 'ROYAL_CENTER' },
  { name: 'Luis Washington Carrión Aranda', specialty: 'Internal Medicine', hospital: 'ROYAL_CENTER' },
  { name: 'Edgar Sánchez Dorado', specialty: 'Internal Medicine', hospital: 'ROYAL_CENTER' },
  // Nephrology
  { name: 'José Anastacio Manzanares Marín', specialty: 'Nephrology', hospital: 'ROYAL_CENTER' },
  { name: 'César Cuero Zambrano', specialty: 'Nephrology', hospital: 'ROYAL_CENTER' },
  // Neurosurgery
  { name: 'José Domingo Neira Bazán', specialty: 'Neurological Surgery', hospital: 'ROYAL_CENTER' },
  { name: 'Luis Fernando Pitty Ceballos', specialty: 'Neurological Surgery', hospital: 'ROYAL_CENTER' },
  // Oncology
  { name: 'Julio Santamaría', specialty: 'Oncology', hospital: 'ROYAL_CENTER' },
  { name: 'Juan Pablo Bares Weeden', specialty: 'Oncology', hospital: 'ROYAL_CENTER' },
  { name: 'José Luis Amador', specialty: 'Oncology', hospital: 'ROYAL_CENTER' },
  { name: 'Joel Moreno', specialty: 'Oncology', hospital: 'ROYAL_CENTER' },
  { name: 'Juan Carlos Alcedo', specialty: 'Oncology', hospital: 'ROYAL_CENTER' },
  { name: 'Alejandro Crismatt Zapata', specialty: 'Oncology', hospital: 'ROYAL_CENTER' },
  // Radiation Oncology
  { name: 'Gaspar Michel Pérez Jiménez', specialty: 'Radiation Oncology', hospital: 'ROYAL_CENTER' },
  { name: 'Yassir Ruíz', specialty: 'Radiation Oncology', hospital: 'ROYAL_CENTER' },
  { name: 'Rafael Araúz', specialty: 'Radiation Oncology', hospital: 'ROYAL_CENTER' },
  // Ophthalmology
  { name: 'Christian Guillermo Savaraín de Gracia', specialty: 'Ophthalmology', hospital: 'ROYAL_CENTER' },
  { name: 'Guillermo Christian Savaraín Vernaza', specialty: 'Ophthalmology', hospital: 'ROYAL_CENTER' },
  // Orthopedics
  { name: 'Marcos Antonio Ruiz Pitaño', specialty: 'Orthopedics and Traumatology', hospital: 'ROYAL_CENTER' },
  // Otolaryngology
  { name: 'Juan Francisco de la Guardia Brin', specialty: 'Otolaryngology', hospital: 'ROYAL_CENTER' },
  { name: 'Amarilis Meléndez Medina', specialty: 'Otolaryngology', hospital: 'ROYAL_CENTER' },
  { name: 'Rolando Muñoz Cerrud', specialty: 'Otolaryngology', hospital: 'ROYAL_CENTER' },
  // Pain Management
  { name: 'Melissa Massiel Vega Peralta', specialty: 'Pain Management', hospital: 'ROYAL_CENTER' },
  // Pediatrics
  { name: 'Roberto Elías Grimaldo Alvarado', specialty: 'Pediatrics', hospital: 'ROYAL_CENTER' },
  { name: 'Luis Ricardo Romero Marciscano', specialty: 'Pediatrics', hospital: 'ROYAL_CENTER' },
  // Plastic Surgery
  { name: 'Luis Alberto Bartley Mendieta', specialty: 'Plastic Surgery', hospital: 'ROYAL_CENTER' },
  // Primary Care
  { name: 'Kelineth Salamanca', specialty: 'Primary Care', hospital: 'ROYAL_CENTER' },
  { name: 'Alexis Alberto Pinzón Altamirano', specialty: 'Primary Care', hospital: 'ROYAL_CENTER' },
  { name: 'Rosibell Escobar Araúz', specialty: 'Primary Care', hospital: 'ROYAL_CENTER' },
  { name: 'Luis Carlos Phillips Samaniego', specialty: 'Primary Care', hospital: 'ROYAL_CENTER' },
  { name: 'Manuel Pereira Herrera', specialty: 'Primary Care', hospital: 'ROYAL_CENTER' },
  { name: 'Daybelis Zulay Castilla Acosta', specialty: 'Primary Care', hospital: 'ROYAL_CENTER' },
  // Psychiatry
  { name: 'Gloriela Maribel Rivera de Alba', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Claudette Mirabell Pajares Chávez', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Marcel Iván Penna Franco', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'José Alberto Calderón Artieda', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Isabel Riaño Quijano', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Roberto Gaspar Icaza Fernández', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Astevia Montalván', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Carlos Saavedra Quiel', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'María Eugenia Gutiérrez Alcedo', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Marilyn Inés Manzzón Pérez', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Delia Ileana De Ycaza Murillo', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Patricia Milena Alba Rivera', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Edgar Abdiel Agames Aguilar', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  { name: 'Illiane Marie Pristsiolas Vernaza', specialty: 'Psychiatry', hospital: 'ROYAL_CENTER' },
  // Child Psychiatry
  { name: 'Waldys M. Castillo', specialty: 'Child Psychiatry', hospital: 'ROYAL_CENTER' },
  // Rheumatology
  { name: 'Generoso Guerra Batista', specialty: 'Rheumatology', hospital: 'ROYAL_CENTER' },
  // Urology
  { name: 'Ramón Rodríguez Lay', specialty: 'Urology', hospital: 'ROYAL_CENTER' },
  { name: 'Alexis Adolfo Arosemena Pinilla', specialty: 'Urology', hospital: 'ROYAL_CENTER' },
  { name: 'Ricardo Canto', specialty: 'Urology', hospital: 'ROYAL_CENTER' },
  { name: 'Carlos Alberto Brugiati Sanjur', specialty: 'Urology', hospital: 'ROYAL_CENTER' },
  { name: 'Khalil Hasan Yuma', specialty: 'Urology', hospital: 'ROYAL_CENTER' },
  { name: 'Edgar Anel Figueroa Rodríguez', specialty: 'Urology', hospital: 'ROYAL_CENTER' },
  // Dentistry
  { name: 'Emilio Antonio Guinard Barranco', specialty: 'Periodontics', hospital: 'ROYAL_CENTER' },
  { name: 'Karina Nieto', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Eustacio García de Paredes Cordovez', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Fernando Ramón Jaén P.', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Fernanda Roux', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Isthar Del Carmen Castillo', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Enzo Cano', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Rodolfo Augusto García Gómez', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Rodulfo Candanedo De León', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Patricia Enith Guillén Burgos', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Alex Arturo Gómez', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Raymond Louis Toledano', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Diego Lucinio Cedeño González', specialty: 'General Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Melina Franco Fonseca', specialty: 'General Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Yesenia Marciaga', specialty: 'Pediatric Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Rodolfo Cano López', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Raúl Alberto Corro', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Patricia Santamaría Rodríguez', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Ramón Díaz', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Petra González De Cedeño', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Omaira Tejada', specialty: 'Dentistry', hospital: 'ROYAL_CENTER' },
  { name: 'Alan Alexander Anderson', specialty: 'Dental Surgery', hospital: 'ROYAL_CENTER' },
  { name: 'Margarita Ibáñez', specialty: 'Dental Surgery', hospital: 'ROYAL_CENTER' },
  { name: 'Ilka Ruiz de Alvarado', specialty: 'Orthodontics', hospital: 'ROYAL_CENTER' },
  { name: 'Jahaira Itzel Rodríguez Pinilla', specialty: 'Orthodontics', hospital: 'ROYAL_CENTER' },
  { name: 'Javier Raúl Trejos Benítez', specialty: 'Orthodontics', hospital: 'ROYAL_CENTER' },
  { name: 'Amanda Chiara Roux Solís', specialty: 'Orthodontics', hospital: 'ROYAL_CENTER' },
  { name: 'Richard Arlen Ford Jiménez', specialty: 'Periodontics', hospital: 'ROYAL_CENTER' },
  { name: 'Kathy Turner Morrell', specialty: 'Endodontics', hospital: 'ROYAL_CENTER' },
  { name: 'Aurora Gisela Domínguez Beytía', specialty: 'Pediatric Dentistry', hospital: 'ROYAL_CENTER' },
  // Nutrition
  { name: 'María Sofía Rueda Romero', specialty: 'Nutrition', hospital: 'ROYAL_CENTER' },
  { name: 'Alicia Irene Sosa Pedreschi', specialty: 'Nutrition', hospital: 'ROYAL_CENTER' },
  { name: 'Carolina Cornejo', specialty: 'Nutrition', hospital: 'ROYAL_CENTER' },
  { name: 'Rossana Broce Caballero', specialty: 'Nutrition', hospital: 'ROYAL_CENTER' },
  { name: 'Dalila González', specialty: 'Nutrition', hospital: 'ROYAL_CENTER' },
  { name: 'Rosa María Larreátegui Arosemena', specialty: 'Nutrition', hospital: 'ROYAL_CENTER' },
  { name: 'Giselle Leticia Núñez González', specialty: 'Nutrition', hospital: 'ROYAL_CENTER' },
  // Phonoaudiology
  { name: 'Mónica Pinilla Monterrey', specialty: 'Phonoaudiology', hospital: 'ROYAL_CENTER' },
  { name: 'Miguel Quezada Castroverde', specialty: 'Phonoaudiology', hospital: 'ROYAL_CENTER' },
  { name: 'Génesis Santos Martínez', specialty: 'Phonoaudiology', hospital: 'ROYAL_CENTER' },
  { name: 'Dayra Young', specialty: 'Phonoaudiology', hospital: 'ROYAL_CENTER' },
  { name: 'Christine Oldith Schultz González', specialty: 'Phonoaudiology', hospital: 'ROYAL_CENTER' },
  // Physical Therapy
  { name: 'Milay Chen', specialty: 'Physical Therapy', hospital: 'ROYAL_CENTER' },
  { name: 'Myrna McLaughlin de Anderson', specialty: 'Physical Therapy', hospital: 'ROYAL_CENTER' },
  { name: 'Verónica Osiris Barría Gil', specialty: 'Physical Therapy', hospital: 'ROYAL_CENTER' },
  { name: 'Jelenny Zaray Núñez Araya', specialty: 'Physical Therapy', hospital: 'ROYAL_CENTER' },
  // Anesthesiology
  { name: 'Richard Alexander Anderson Pang', specialty: 'Anesthesiology', hospital: 'ROYAL_CENTER' },
  { name: 'Evelyn Ríos Caballero', specialty: 'Angiology', hospital: 'ROYAL_CENTER' },
  // Hyperbaric Medicine
  { name: 'James Antonio Denham Spírito', specialty: 'Undersea and Hyperbaric Medicine', hospital: 'ROYAL_CENTER' },
];

// ── Hospital Minimed ──
const MINIMED_DOCTORS: RawDoctor[] = [
  // Cardiology
  { name: 'Efraín Tatis', specialty: 'Cardiology', hospital: 'MINIMED' },
  { name: 'Efrén Villarreal', specialty: 'Cardiology', hospital: 'MINIMED' },
  { name: 'Juan Pablo Rivera', specialty: 'Cardiology', hospital: 'MINIMED' },
  { name: 'Arturo Calvo', specialty: 'Cardiology', hospital: 'MINIMED' },
  { name: 'Carlos Fu', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Diego Rey Rodríguez', specialty: 'Cardiology', hospital: 'MINIMED' },
  { name: 'Fernando Campos', specialty: 'Cardiology', hospital: 'MINIMED' },
  { name: 'Gerson Goti', specialty: 'Cardiology', hospital: 'MINIMED' },
  { name: 'Javier Pérez', specialty: 'Cardiology', hospital: 'MINIMED' },
  { name: 'Guillermo Morrison', specialty: 'Cardiology', hospital: 'MINIMED' },
  // General Surgery
  { name: 'Abdiel Ortiz', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Adrián Ávila', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Alexander Murillo', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Andrés Almendral', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'César Díaz', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'David Santamaría', specialty: 'General Surgery', hospital: 'MINIMED' },
  // Gynecology
  { name: 'Abigahil Estribi', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Aldimarina López', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Ana Lalyre', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Annette Adames', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Ariadna González', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Carolina Vega', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Daniela Díaz', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Eligia Camargo', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Elvia Castillo', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Galia Quijano', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Georgina Vassell', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Ingrid Jiménez', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Isabel González', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Ivys Saavedra', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Jennifer Wilson', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Ricardo Ramírez', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  // Orthopedics
  { name: 'Jack Vásquez', specialty: 'Orthopedics and Traumatology', hospital: 'MINIMED' },
  { name: 'Erick Santos', specialty: 'Orthopedics and Traumatology', hospital: 'MINIMED' },
  // Urology
  { name: 'Luis Mendieta', specialty: 'Urology', hospital: 'MINIMED' },
  { name: 'Nicolás Delgado', specialty: 'Urology', hospital: 'MINIMED' },
  { name: 'Raúl Escudero', specialty: 'Urology', hospital: 'MINIMED' },
  { name: 'William Pitti', specialty: 'Urology', hospital: 'MINIMED' },
  { name: 'Zuriel Rojas', specialty: 'Urology', hospital: 'MINIMED' },
  { name: 'Juan Carlos Arena', specialty: 'Urology', hospital: 'MINIMED' },
  // Internal Medicine
  { name: 'Ubaldo Hernández', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  // Other doctors
  { name: 'Américo Rengifo', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Aurelio Alvarado', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Edgardo Saavedra', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Ernesto Barrantes', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Fernando Candanedo', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Francisco Guerra', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Francisco Vargas', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Gustavo Olaciregui', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Gustavo Villarreal', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Iván Díaz', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Joaquín Olmedo', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Jorge Che Enseñat', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'José Bolívar', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'José Concepción', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'José Delgado', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'José Torrero', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Juan Carlos Correa', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Julián Fernández', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Julio Zúñiga', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Kamal Thorne', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Luis Acosta', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Luis Camaño', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Luis Carlos González', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Luis Orillac', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Marcos Fletcher', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Mario Espinosa', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Martín Alpírez', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Marvin Abrego', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Michael Guevara', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Misael López Sánchez', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Mizael Rodríguez', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Paul Muñoz', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Ricardo Mock', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Ronald Reyes', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Ronald Smith', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Whitney Sánchez', specialty: 'General Surgery', hospital: 'MINIMED' },
  { name: 'Jessica Wong', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Johana Contreras', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Justina Bustos', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Karem Mitchel', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Karla Concepción', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Keyra Morales Allard', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Leslie Espinosa', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Lidia Aparicio', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Lizeyca Seixas', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'María Alejandra de León', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'María Mejía', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'María Vargas', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Martha Lucía Hurtado', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Michelle Guillén', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Nelidette Navarro', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Nereida Muñoz', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Nínive Quirós', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Pahola Araujo del Rosario', specialty: 'Neurology', hospital: 'MINIMED' },
  { name: 'Paola Román', specialty: 'Gynecology-Obstetrics', hospital: 'MINIMED' },
  { name: 'Patricia Wong', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Raquel González', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Rossana Arango', specialty: 'Internal Medicine', hospital: 'MINIMED' },
  { name: 'Adelys Castillero', specialty: 'Psychology', hospital: 'MINIMED' },
];

// ── Clínica Boyd ──
const BOYD_DOCTORS: RawDoctor[] = [
  { name: 'Álvaro Moreno R.', specialty: 'Ophthalmology', hospital: 'BOYD' },
  { name: 'Cristela Ferrari de Alemán', specialty: 'Ophthalmology', hospital: 'BOYD' },
  { name: 'Maritza Cárdenas', specialty: 'Ophthalmology', hospital: 'BOYD' },
  { name: 'Samuel Boyd', specialty: 'Ophthalmology', hospital: 'BOYD' },
  { name: 'Anaika Concepción', specialty: 'Ophthalmology', hospital: 'BOYD' },
  { name: 'Inelda Lombardo', specialty: 'Ophthalmology', hospital: 'BOYD' },
  { name: 'Marino Rivera G.', specialty: 'Ophthalmology', hospital: 'BOYD' },
  { name: 'Sony Park', specialty: 'Ophthalmology', hospital: 'BOYD' },
  { name: 'Ryan Bradshaw M.', specialty: 'Ophthalmology', hospital: 'BOYD' },
];

// ── Hospital Santa Fe (Panamá) ──
const SANTA_FE_DOCTORS: RawDoctor[] = [
  // Cardiology & Hemodynamics
  { name: 'Sergio Silva', specialty: 'Cardiology', hospital: 'SANTA_FE' },
  { name: 'José Quiroz', specialty: 'Cardiology', hospital: 'SANTA_FE' },
  { name: 'Benigno Quintero', specialty: 'Cardiology', hospital: 'SANTA_FE' },
  { name: 'Baldomero González', specialty: 'Cardiology', hospital: 'SANTA_FE' },
  { name: 'Bolívar Domínguez', specialty: 'Cardiology', hospital: 'SANTA_FE' },
  { name: 'Nisla Poppe', specialty: 'Cardiology', hospital: 'SANTA_FE' },
  { name: 'Luis Carlos Tejera', specialty: 'Cardiology', hospital: 'SANTA_FE' },
  // Gynecology
  { name: 'Enrique Polo', specialty: 'Gynecology-Obstetrics', hospital: 'SANTA_FE' },
  { name: 'Rafael Sánchez', specialty: 'Gynecology-Obstetrics', hospital: 'SANTA_FE' },
  { name: 'Iván Ramos', specialty: 'Gynecology-Obstetrics', hospital: 'SANTA_FE' },
  { name: 'Marcos Molto', specialty: 'Gynecology-Obstetrics', hospital: 'SANTA_FE' },
  // Urology
  { name: 'Fernando Millán', specialty: 'Urology', hospital: 'SANTA_FE' },
  { name: 'Juan Barrios', specialty: 'Urology', hospital: 'SANTA_FE' },
  { name: 'Lillanis Montilla', specialty: 'Urology', hospital: 'SANTA_FE' },
  { name: 'Roberto Basabe', specialty: 'Urology', hospital: 'SANTA_FE' },
  { name: 'Yurielis Ramos', specialty: 'Urology', hospital: 'SANTA_FE' },
  // Neurosurgery
  { name: 'Avelino Gutiérrez', specialty: 'Neurosurgery', hospital: 'SANTA_FE' },
  { name: 'José Mezquita', specialty: 'Neurosurgery', hospital: 'SANTA_FE' },
  // Anesthesiology
  { name: 'Thelma Arrocha', specialty: 'Anesthesiology', hospital: 'SANTA_FE' },
  { name: 'Marko Mislov', specialty: 'Anesthesiology', hospital: 'SANTA_FE' },
  { name: 'Rafael Seixas', specialty: 'Anesthesiology', hospital: 'SANTA_FE' },
  { name: 'Jorge Vanegas', specialty: 'Anesthesiology', hospital: 'SANTA_FE' },
  { name: 'Gisela Gil', specialty: 'Anesthesiology', hospital: 'SANTA_FE' },
  { name: 'Adriana Velásquez', specialty: 'Anesthesiology', hospital: 'SANTA_FE' },
  { name: 'Yashira Newball', specialty: 'Anesthesiology', hospital: 'SANTA_FE' },
  // Ophthalmology
  { name: 'Persiles Gutiérrez', specialty: 'Ophthalmology', hospital: 'SANTA_FE' },
  // Dermatology
  { name: 'Marta Quezada', specialty: 'Dermatology', hospital: 'SANTA_FE' },
  { name: 'Maryorie K. Bernal Fernández', specialty: 'Dermatology', hospital: 'SANTA_FE' },
  // Pediatrics
  { name: 'Gregorio Ramos', specialty: 'Pediatrics', hospital: 'SANTA_FE' },
  { name: 'Azucena Cortez Navarrete', specialty: 'Pediatrics', hospital: 'SANTA_FE' },
  { name: 'Joana Lizeth Urbina Ángel', specialty: 'Pediatrics', hospital: 'SANTA_FE' },
  { name: 'Thagrid Harich Natsheh', specialty: 'Pediatrics', hospital: 'SANTA_FE' },
  // Pathology
  { name: 'Yalibeth González', specialty: 'Pathology', hospital: 'SANTA_FE' },
  // Proctology
  { name: 'Roger Vega', specialty: 'Coloproctology', hospital: 'SANTA_FE' },
  // Psychiatry
  { name: 'Isis Bonilla', specialty: 'Psychiatry', hospital: 'SANTA_FE' },
  { name: 'Malaika Fagette', specialty: 'Psychiatry', hospital: 'SANTA_FE' },
  // Other
  { name: 'Leslie Rincón', specialty: 'Internal Medicine', hospital: 'SANTA_FE' },
  { name: 'Nicolás Hurtado', specialty: 'Internal Medicine', hospital: 'SANTA_FE' },
  { name: 'Alfredo Matos', specialty: 'Internal Medicine', hospital: 'SANTA_FE' },
  { name: 'Frederick Gómez', specialty: 'Internal Medicine', hospital: 'SANTA_FE' },
  { name: 'Felipe Sánchez', specialty: 'Internal Medicine', hospital: 'SANTA_FE' },
  { name: 'Guadalupe Castillo', specialty: 'Gynecology-Obstetrics', hospital: 'SANTA_FE' },
  { name: 'Guillermo Castillo', specialty: 'General Surgery', hospital: 'SANTA_FE' },
];

// ── Consultorios América ──
const AMERICA_DOCTORS: RawDoctor[] = [
  // Medicina General
  { name: 'Verónica Wharton', specialty: 'Primary Care', hospital: 'AMERICA' },
  { name: 'Emilio Escartín', specialty: 'Primary Care', hospital: 'AMERICA' },
  { name: 'Liu Chao Wen', specialty: 'Primary Care', hospital: 'AMERICA' },
  { name: 'Víctor R. Berguido Q.', specialty: 'Primary Care', hospital: 'AMERICA' },
  { name: 'Edgardo Gaitán Morales', specialty: 'Primary Care', hospital: 'AMERICA' },
  { name: 'Rolando Rettally', specialty: 'Primary Care', hospital: 'AMERICA' },
  { name: 'Ricardo Pareja', specialty: 'Primary Care', hospital: 'AMERICA' },
  // Optometría
  { name: 'María Teresa Arenas de Muñoz', specialty: 'Optometría', hospital: 'AMERICA' },
  // Oftalmología
  { name: 'Manuel del R. Muñoz R.', specialty: 'Ophthalmology', hospital: 'AMERICA' },
  { name: 'Juan Manuel Muñoz', specialty: 'Ophthalmology', hospital: 'AMERICA' },
  { name: 'Iván R. Valderrama B.', specialty: 'Ophthalmology', hospital: 'AMERICA' },
  { name: 'Carlos Díaz Tuñón', specialty: 'Ophthalmology', hospital: 'AMERICA' },
  { name: 'Carlos Díaz Rodríguez', specialty: 'Ophthalmology', hospital: 'AMERICA' },
  { name: 'Auristela Muñoz Cuéllar', specialty: 'Ophthalmology', hospital: 'AMERICA' },
  { name: 'Ahmed Ali Bhana', specialty: 'Ophthalmology', hospital: 'AMERICA' },
  // Cardiología
  { name: 'Juan Carmelo Wong Díaz', specialty: 'Cardiology', hospital: 'AMERICA' },
  { name: 'José Pinto A.', specialty: 'Cardiology', hospital: 'AMERICA' },
  { name: 'Rafael Díaz Falconett', specialty: 'Cardiology', hospital: 'AMERICA' },
  { name: 'Carlos Atencio', specialty: 'Cardiology', hospital: 'AMERICA' },
  { name: 'Alfaro Marchena Noriega', specialty: 'Cardiology', hospital: 'AMERICA' },
  { name: 'Aída González', specialty: 'Pediatrics', hospital: 'AMERICA' },
  // Cirugía General
  { name: 'José M. Vialette', specialty: 'General Surgery', hospital: 'AMERICA' },
  { name: 'Aurelio I. Núñez', specialty: 'General Surgery', hospital: 'AMERICA' },
  { name: 'Amir Wong Cervera', specialty: 'General Surgery', hospital: 'AMERICA' },
  { name: 'Icela Muñoz', specialty: 'General Surgery', hospital: 'AMERICA' },
  // Dermatología
  { name: 'Layla D. Duarte C.', specialty: 'Dermatology', hospital: 'AMERICA' },
  { name: 'Doria G. de Marchena', specialty: 'Dermatology', hospital: 'AMERICA' },
  { name: 'Avrin Llaurado de Chong', specialty: 'Dermatology', hospital: 'AMERICA' },
  { name: 'Abdiel León', specialty: 'Dermatology', hospital: 'AMERICA' },
  // Ginecología
  { name: 'Gemarilis González', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Paulino Vigil De Gracia', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Lourdes Cortés', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'José F. De Gracia S.', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Aris Caballero de Mendieta', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Rogelio Vargas Rose', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Pedro García Izquierdo', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Marta Eugenia Dengo', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Isela Peñaloza', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Geneva González', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Felipe Javier Wong Chen', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  { name: 'Alexis Chong Liao', specialty: 'Gynecology-Obstetrics', hospital: 'AMERICA' },
  // Urología
  { name: 'Oriel González', specialty: 'Urology', hospital: 'AMERICA' },
  { name: 'Luis Moreno Castillo', specialty: 'Urology', hospital: 'AMERICA' },
  { name: 'Julio J. García A.', specialty: 'Urology', hospital: 'AMERICA' },
  { name: 'Juan Materno Vásquez', specialty: 'Urology', hospital: 'AMERICA' },
  { name: 'Eustorgio A. Zevallos G.', specialty: 'Urology', hospital: 'AMERICA' },
  { name: 'Carlos Duque Espinosa', specialty: 'Urology', hospital: 'AMERICA' },
  // Gastroenterología
  { name: 'Clarissa Cabezas', specialty: 'Gastroenterology', hospital: 'AMERICA' },
  { name: 'Ricardo Adolfo McCalla', specialty: 'Gastroenterology', hospital: 'AMERICA' },
  { name: 'Rubén Von Chong Reyes', specialty: 'Gastroenterology', hospital: 'AMERICA' },
  // Otorrinolaringología
  { name: 'Bernarda Caro Cano', specialty: 'Otolaryngology', hospital: 'AMERICA' },
  { name: 'Diana Rodríguez', specialty: 'Otolaryngology', hospital: 'AMERICA' },
  { name: 'Robert Samuels Halphen', specialty: 'Otolaryngology', hospital: 'AMERICA' },
  { name: 'Moisés Torrijos López', specialty: 'Otolaryngology', hospital: 'AMERICA' },
  { name: 'Carlos E. Burrows Q.', specialty: 'Otolaryngology', hospital: 'AMERICA' },
  // Ortopedia
  { name: 'Ricardo E. Mosquera', specialty: 'Orthopedics and Traumatology', hospital: 'AMERICA' },
  { name: 'Renán Araúz', specialty: 'Orthopedics and Traumatology', hospital: 'AMERICA' },
  { name: 'Esteban Perdomo', specialty: 'Orthopedics and Traumatology', hospital: 'AMERICA' },
  { name: 'Eduardo Cotes Sánchez', specialty: 'Orthopedics and Traumatology', hospital: 'AMERICA' },
  { name: 'Danilo Martínez Millán', specialty: 'Orthopedics and Traumatology', hospital: 'AMERICA' },
  { name: 'César Sanjur Otero', specialty: 'Orthopedics and Traumatology', hospital: 'AMERICA' },
  { name: 'Aníbal E. Morales E.', specialty: 'Orthopedics and Traumatology', hospital: 'AMERICA' },
  // Neurología
  { name: 'Eduardo González', specialty: 'Neurology', hospital: 'AMERICA' },
  { name: 'Eva Susana Pérez', specialty: 'Neurology', hospital: 'AMERICA' },
  { name: 'Donna Chen de Lee', specialty: 'Neurology', hospital: 'AMERICA' },
  // Medicina Interna
  { name: 'Alejandra Lobán A.', specialty: 'Internal Medicine', hospital: 'AMERICA' },
  { name: 'César Lam Chung', specialty: 'Internal Medicine', hospital: 'AMERICA' },
  { name: 'Ricardo A. Velarde Pérez', specialty: 'Internal Medicine', hospital: 'AMERICA' },
  { name: 'Luis Carrión', specialty: 'Internal Medicine', hospital: 'AMERICA' },
  // Reumatología
  { name: 'Olmedo Almengor', specialty: 'Rheumatology', hospital: 'AMERICA' },
  // Hematología
  { name: 'Saribethe Visuetti', specialty: 'Hematology', hospital: 'AMERICA' },
  // Pediatría
  { name: 'Iván Wilson', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Sofía Grimaldo', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Milene McLenán', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Yarminia Rico', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Roberto Pon Chen', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Nilsa J. Domínguez Cárdenas', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Mariana E. López', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Lesbia R. de Díaz', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Julio César Vega', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'José Ángel Castrellón', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Jorge E. Rodríguez Lombardo', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Chung F. Leung', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Briseida G. Bermúdez', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Analinda de Díaz', specialty: 'Pediatrics', hospital: 'AMERICA' },
  { name: 'Arlett Aguilar', specialty: 'Pediatric Surgery', hospital: 'AMERICA' },
  { name: 'Andrés Iván López Dominici', specialty: 'Pediatrics', hospital: 'AMERICA' },
];

// ── The Panama Clinic ──
const PANAMA_CLINIC_DOCTORS: RawDoctor[] = [
  { name: 'Erides Vergara Hernández', specialty: 'Gastroenterology', hospital: 'PANAMA_CLINIC' },
  { name: 'Yarineth Quintero Caballero', specialty: 'Otolaryngology', hospital: 'PANAMA_CLINIC' },
];

// ── Hospital Brisas ──
const BRISAS_DOCTORS: RawDoctor[] = [
  { name: 'Luis Carlos Camaño', specialty: 'Internal Medicine', hospital: 'BRISAS' },
  { name: 'Yilka Berrío', specialty: 'Internal Medicine', hospital: 'BRISAS' },
];

const ALL_DOCTORS = [
  ...NACIONAL_DOCTORS,
  ...ROYAL_CENTER_DOCTORS,
  ...MINIMED_DOCTORS,
  ...BOYD_DOCTORS,
  ...SANTA_FE_DOCTORS,
  ...AMERICA_DOCTORS,
  ...PANAMA_CLINIC_DOCTORS,
  ...BRISAS_DOCTORS,
];

// ═══════════════════════════════════════════
// Slug generation
// ═══════════════════════════════════════════

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  npx tsx scripts/import-more-hospitals.ts --dry-run');
    console.log('  npx tsx scripts/import-more-hospitals.ts --execute');
    process.exit(0);
  }

  console.log('============================================');
  console.log('  PlexusMap — Import More Hospital Directories');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('============================================\n');

  // Ensure all needed specialties exist
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
    await prisma.specialty.upsert({
      where: { slug: spec.slug },
      update: {},
      create: spec,
    });
  }

  // Load specialties
  const specialties = await prisma.specialty.findMany();
  const specialtyBySlug = new Map(specialties.map(s => [s.slug, s]));

  console.log(`Specialties in DB: ${specialties.length}`);
  console.log(`Doctors to import: ${ALL_DOCTORS.length}`);
  console.log(`  Hospital Nacional: ${NACIONAL_DOCTORS.length}`);
  console.log(`  Royal Center: ${ROYAL_CENTER_DOCTORS.length}`);
  console.log(`  Hospital Minimed: ${MINIMED_DOCTORS.length}`);
  console.log(`  Clínica Boyd: ${BOYD_DOCTORS.length}`);
  console.log(`  Hospital Santa Fe: ${SANTA_FE_DOCTORS.length}`);
  console.log(`  Consultorios América: ${AMERICA_DOCTORS.length}`);
  console.log(`  The Panama Clinic: ${PANAMA_CLINIC_DOCTORS.length}`);
  console.log(`  Hospital Brisas: ${BRISAS_DOCTORS.length}`);

  // Load existing professionals for dedup
  const existing = await prisma.professional.findMany({
    select: { name: true, slug: true },
  });
  const existingSlugs = new Set(existing.map(p => p.slug));
  const existingNames = new Set(existing.map(p => p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));

  console.log(`Existing professionals: ${existing.length}\n`);

  let created = 0;
  let skipped = 0;
  let duplicates = 0;
  const unmappedSpecialties = new Set<string>();

  for (const doc of ALL_DOCTORS) {
    const normalizedName = doc.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Skip titles
    const cleanName = doc.name.replace(/^(Lcda\.\s*|Lic\.\s*|Dra?\.\s*)/i, '').trim();

    // Dedup by normalized name
    if (existingNames.has(normalizedName)) {
      duplicates++;
      continue;
    }

    // Map specialty
    const specialtySlug = SPECIALTY_MAP[doc.specialty];
    if (!specialtySlug) {
      unmappedSpecialties.add(doc.specialty);
      continue;
    }

    const specialty = specialtyBySlug.get(specialtySlug);
    if (!specialty) {
      unmappedSpecialties.add(`${doc.specialty} → ${specialtySlug} (not in DB)`);
      continue;
    }

    const hospital = HOSPITALS[doc.hospital];
    const slug = generateSlug(cleanName);

    // Avoid slug collision
    if (existingSlugs.has(slug)) {
      duplicates++;
      continue;
    }

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
        if (msg.includes('Unique constraint')) {
          duplicates++;
        } else {
          console.error(`  Error creating ${cleanName}: ${msg}`);
        }
      }
    } else {
      created++;
    }

    existingSlugs.add(slug);
    existingNames.add(normalizedName);
  }

  console.log('\n============================================');
  console.log('RESULTS:');
  console.log(`  ${isDryRun ? 'Would create' : 'Created'}:  ${created}`);
  console.log(`  Duplicates:  ${duplicates}`);
  console.log(`  Skipped:     ${skipped}`);
  if (unmappedSpecialties.size > 0) {
    console.log(`  Unmapped specialties: ${[...unmappedSpecialties].join(', ')}`);
  }
  console.log('============================================');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
