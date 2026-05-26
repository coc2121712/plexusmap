/**
 * PlexusMap — Import doctors from hospital public directories
 *
 * Sources:
 * - Consultorios Médicos Paitilla (cmpaitilla.net/listado-doctores) — 213 doctors
 * - Hospital Punta Pacífica / Pacífica Salud (mymedicplus.com) — 69 doctors
 * - Clínica Hospital San Fernando (mymedicplus.com) — 40 doctors
 *
 * Usage:
 *   npx tsx scripts/import-hospital-directories.ts --dry-run   (preview)
 *   npx tsx scripts/import-hospital-directories.ts --execute    (import)
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
  'PAITILLA': {
    lat: 8.9780, lng: -79.5179,
    address: 'Consultorios Médicos Paitilla, Calle 53 Este, Paitilla, Ciudad de Panamá',
    phone: '+507-208-8400',
  },
  'PACIFICA': {
    lat: 8.9820, lng: -79.5101,
    address: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá',
    phone: '+507-204-8000',
  },
  'SAN_FERNANDO': {
    lat: 9.0031, lng: -79.5166,
    address: 'Clínica Hospital San Fernando, Carrasquilla, Ciudad de Panamá',
    phone: '+507-305-6300',
  },
};

// ═══════════════════════════════════════════
// Specialty mapping
// ═══════════════════════════════════════════

const SPECIALTY_MAP: Record<string, string> = {
  // Direct matches to PlexusMap slugs
  'Dermatología': 'dermatologia',
  'Dermatologist': 'dermatologia',
  'Dermatology': 'dermatologia',
  'Cardiología': 'cardiologia',
  'Cardiology': 'cardiologia',
  'Pediatría': 'pediatria',
  'Pediatrics': 'pediatria',
  'Ginecología': 'ginecologia',
  'Gynecology and Obstetrics': 'ginecologia',
  'Ginecología y Obstetricia': 'ginecologia',
  'Oftalmología': 'oftalmologia',
  'Ophthalmology': 'oftalmologia',
  'Optometrista': 'optometria',
  'Neurología': 'neurologia',
  'Neurology': 'neurologia',
  'Ortopedia': 'ortopedia',
  'Orthopedics and Traumatology': 'ortopedia',
  'Orthopedics': 'ortopedia',
  'Psicología': 'psicologia',
  'Psiquiatría': 'psicologia',
  'Nutricionistas': 'nutricion',
  'Dietista': 'nutricion',
  'Fisioterapia': 'fisioterapia',
  'Urología': 'urologia',
  'Urology': 'urologia',
  // Map to medicina-general
  'Medicina Interna': 'medicina-general',
  'Internal Medicine': 'medicina-general',
  'Cirugía General': 'medicina-general',
  'Cirugía general': 'medicina-general',
  'General Surgery': 'medicina-general',
  'Gastroenterología': 'medicina-general',
  'Gastroenterology': 'medicina-general',
  'Endocrinología': 'medicina-general',
  'Endocrinology': 'medicina-general',
  'Otorrinolaringología': 'medicina-general',
  'Otolaryngology': 'medicina-general',
  'Neurocirugía': 'medicina-general',
  'Neurosurgery': 'medicina-general',
  'Neonatología': 'pediatria',
  'Alergia e Inmunología': 'medicina-general',
  'Geriatría': 'medicina-general',
  'Geriatrics and Gerontology': 'medicina-general',
  'Cirugía Cardiovascular y Toráxica': 'cardiologia',
  'Cirugía Cardiovascular': 'cardiologia',
  'Cardiac and Thoracic Surgery': 'cardiologia',
  'Cirugía Plástica': 'dermatologia',
  'Cirugia Plastica y Reconstrutiva': 'dermatologia',
  'Plastic Surgery': 'dermatologia',
  'Oncología Médica': 'medicina-general',
  'Oncology': 'medicina-general',
  'Cirugía Oncológica': 'medicina-general',
  'Hematología': 'medicina-general',
  'Hematology': 'medicina-general',
  'Fonoaudiología': 'medicina-general',
  'Emergency Medicine Specialist': 'medicina-general',
  'General Medicine Specialist': 'medicina-general',
  'Pathology': 'medicina-general',
  'Colposcopia': 'ginecologia',
  'Anestesiología': 'medicina-general',
  'Anestesiology': 'medicina-general',
  'Cirugía de mano y Microcirugía': 'ortopedia',
  'Cirugía Pediátrica': 'pediatria',
  'Endodoncista': 'odontologia-general',
  'Odontología': 'odontologia-general',
  'Radióloga Intervencionista': 'medicina-general',
  'Algiología': 'medicina-general',
  'Clínica': 'medicina-general',
  'Forense Adicionista': 'medicina-general',
  'Criminológico': 'medicina-general',
  'Terapias': 'fisioterapia',
  'Exámenes Cardiológicos': 'cardiologia',
};

// ═══════════════════════════════════════════
// Doctor data from hospital directories
// ═══════════════════════════════════════════

interface RawDoctor {
  name: string;
  specialty: string;
  hospital: string; // key into HOSPITALS
}

const PAITILLA_DOCTORS: RawDoctor[] = [
  // 213 doctors from cmpaitilla.net/listado-doctores
  { name: 'Adrián Ávila', specialty: 'Dermatología', hospital: 'PAITILLA' },
  { name: 'Alberto E. Sánchez Ruiz', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Alberto Navarro', specialty: 'Cirugía General', hospital: 'PAITILLA' },
  { name: 'Alejandro Jiménez', specialty: 'Urología', hospital: 'PAITILLA' },
  { name: 'Alexandra Yvette Araujo Del Rosario', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Aleyda Arcia', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Alfredo Chu', specialty: 'Oftalmología', hospital: 'PAITILLA' },
  { name: 'Alfredo Martiz', specialty: 'Cirugía general', hospital: 'PAITILLA' },
  { name: 'Ana Alexandra Arosemena', specialty: 'Dietista', hospital: 'PAITILLA' },
  { name: 'Ana Cristina García de Paredes', specialty: 'Psicología', hospital: 'PAITILLA' },
  { name: 'Ana Espinoza', specialty: 'Endocrinología', hospital: 'PAITILLA' },
  { name: 'Ana Gabriela Bonilla Espinosa', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Ana Isabel Méndez', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Ana Victoria Rengifo Ríos', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Anabel Pérez M.', specialty: 'Alergia e Inmunología', hospital: 'PAITILLA' },
  { name: 'Analida Pitty', specialty: 'Fonoaudiología', hospital: 'PAITILLA' },
  { name: 'Anna Pinilla', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Antonio Rodriguez', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Antonio Suescum', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Aquilino Mitre', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Ariel Saldaña', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Armando Mocci', specialty: 'Dermatología', hospital: 'PAITILLA' },
  { name: 'Aron Benzadon', specialty: 'Neurología', hospital: 'PAITILLA' },
  { name: 'Ascanio Castillo', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Ashley Carrillo', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Augusto Alvarado', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Augusto Arosemena', specialty: 'Oftalmología', hospital: 'PAITILLA' },
  { name: 'Aurelio Núñez', specialty: 'Cirugía general', hospital: 'PAITILLA' },
  { name: 'Balkys D. Álvarez Varela', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Bernardino González', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Bey Mario Lombana', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Bleixen Admade', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Calixto Duarte Chang', specialty: 'Gastroenterología', hospital: 'PAITILLA' },
  { name: 'Camilo Iturralde', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Camilo Rodríguez', specialty: 'Cirugía Cardiovascular y Toráxica', hospital: 'PAITILLA' },
  { name: 'Carlos Beitia', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Carlos Briceño', specialty: 'Neurocirugía', hospital: 'PAITILLA' },
  { name: 'Carlos Sayavedra', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Carlos Velarde', specialty: 'Neonatología', hospital: 'PAITILLA' },
  { name: 'César Gonzalo Díaz Selles', specialty: 'Cirugía General', hospital: 'PAITILLA' },
  { name: 'Claudia Fajardo', specialty: 'Psicología', hospital: 'PAITILLA' },
  { name: 'Cornelio Viluce', specialty: 'Urología', hospital: 'PAITILLA' },
  { name: 'Cristiane Martin Palacios', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Cristina Chanis', specialty: 'Dietista', hospital: 'PAITILLA' },
  { name: 'Daniel Pichel', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Danissa González', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'David Bianco', specialty: 'Colposcopia', hospital: 'PAITILLA' },
  { name: 'David Hernández', specialty: 'Urología', hospital: 'PAITILLA' },
  { name: 'David Méndez', specialty: 'Neonatología', hospital: 'PAITILLA' },
  { name: 'Débora Arosemena', specialty: 'Nutricionistas', hospital: 'PAITILLA' },
  { name: 'Demetrio Dutari', specialty: 'Geriatría', hospital: 'PAITILLA' },
  { name: 'Denisse Cotes', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Edgar Alemán', specialty: 'Cirugía general', hospital: 'PAITILLA' },
  { name: 'Edgardo Lasso', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Eduardo Andrés Camino Barraza', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Eduardo Rodríguez', specialty: 'Cirugía General', hospital: 'PAITILLA' },
  { name: 'Eduardo Sousa-Lennox', specialty: 'Odontología', hospital: 'PAITILLA' },
  { name: 'Efraín Carles', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Efraín Pérez', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Eliecer Hernández Mina', specialty: 'Cirugia Plastica y Reconstrutiva', hospital: 'PAITILLA' },
  { name: 'Emilio Effio', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Emily Castillo', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Emir de Gracia', specialty: 'Neurocirugía', hospital: 'PAITILLA' },
  { name: 'Enrique Adames', specialty: 'Gastroenterología', hospital: 'PAITILLA' },
  { name: 'Enrique Alemán A', specialty: 'Urología', hospital: 'PAITILLA' },
  { name: 'Enrique Alemán F', specialty: 'Urología', hospital: 'PAITILLA' },
  { name: 'Enrique J. Espinosa Latorraca', specialty: 'Cirugía de mano y Microcirugía', hospital: 'PAITILLA' },
  { name: 'Erasmo Martínez', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Esteban Povea', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Eylem Araúz C', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Felipe Villareal', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Félix H. Bonilla Espinosa', specialty: 'Cirugía General', hospital: 'PAITILLA' },
  { name: 'Fernando Gracia', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Francisco Sousa Lennox', specialty: 'Neonatología', hospital: 'PAITILLA' },
  { name: 'Francisco Tejeira', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Frank Guelfi', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Gabriel Frago', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Gabriela Isolda González Chu', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Gabriela Ríos', specialty: 'Dermatología', hospital: 'PAITILLA' },
  { name: 'Georgios Karnakis', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Gerardo Victoria', specialty: 'Cirugía Cardiovascular y Toráxica', hospital: 'PAITILLA' },
  { name: 'Gioconda Gaudiano', specialty: 'Dermatología', hospital: 'PAITILLA' },
  { name: 'Gregorio de los Ríos', specialty: 'Cirugía Cardiovascular y Toráxica', hospital: 'PAITILLA' },
  { name: 'Guadalupe Pérez', specialty: 'Endocrinología', hospital: 'PAITILLA' },
  { name: 'Guillermo García', specialty: 'Urología', hospital: 'PAITILLA' },
  { name: 'Gustavo Marciaga', specialty: 'Endocrinología', hospital: 'PAITILLA' },
  { name: 'Heraclio Barria', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Herbert García', specialty: 'Cirugía General', hospital: 'PAITILLA' },
  { name: 'Hermes Pimentel', specialty: 'Neonatología', hospital: 'PAITILLA' },
  { name: 'Honorina de Espinosa', specialty: 'Cirugía Pediátrica', hospital: 'PAITILLA' },
  { name: 'Humberto Juárez', specialty: 'Cirugía Cardiovascular', hospital: 'PAITILLA' },
  { name: 'Icaro Leandro', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Ingrid Perscky', specialty: 'Urología', hospital: 'PAITILLA' },
  { name: 'Irma Kwai Ben', specialty: 'Cirugía Plástica', hospital: 'PAITILLA' },
  { name: 'Ivan Sierra', specialty: 'Neonatología', hospital: 'PAITILLA' },
  { name: 'Ivonne de Martinelli', specialty: 'Oftalmología', hospital: 'PAITILLA' },
  { name: 'Jack Vásquez', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Jacobo Bassan', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Jaime Ávila', specialty: 'Dermatología', hospital: 'PAITILLA' },
  { name: 'Joanne Nicole Sánchez Selles', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Jocelyn Contreras', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Johany Concepción', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Jolie Anna Crespo CH', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Jonathan A. Batista Barrías', specialty: 'Algiología', hospital: 'PAITILLA' },
  { name: 'Jorge Augusto Calvo Ponce', specialty: 'Cirugía General', hospital: 'PAITILLA' },
  { name: 'Jorge Marin', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Jorge Velarde', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Jose Calvo', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Jose Dondis', specialty: 'Gastroenterología', hospital: 'PAITILLA' },
  { name: 'Jose Quiros Solanilla', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Jose R Méndez', specialty: 'Gastroenterología', hospital: 'PAITILLA' },
  { name: 'Juan Carlos Pretto', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Juan David Méndez', specialty: 'Dietista', hospital: 'PAITILLA' },
  { name: 'Juan Erasmo González', specialty: 'Dermatología', hospital: 'PAITILLA' },
  { name: 'Juan Jose Arauz', specialty: 'Neonatología', hospital: 'PAITILLA' },
  { name: 'Karen González', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Katherine Thils', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Kelvin Lio', specialty: 'Oftalmología', hospital: 'PAITILLA' },
  { name: 'Laura Toro', specialty: 'Optometrista', hospital: 'PAITILLA' },
  { name: 'Lech Korytkowski', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Lilia Nuñez', specialty: 'Endocrinología', hospital: 'PAITILLA' },
  { name: 'Luis Carlos Moreno Aguila', specialty: 'Cirugía Plástica', hospital: 'PAITILLA' },
  { name: 'Luis Cornejo', specialty: 'Geriatría', hospital: 'PAITILLA' },
  { name: 'Luis Gorriz', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Luis Vásquez', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Luis Verástegui', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Manuel Chiquilani', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Manuel de Ycaza', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Manuel Vásquez', specialty: 'Pediatría', hospital: 'PAITILLA' },
  { name: 'Mao Rodríguez', specialty: 'Neurocirugía', hospital: 'PAITILLA' },
  { name: 'Marcos López', specialty: 'Alergia e Inmunología', hospital: 'PAITILLA' },
  { name: 'María Dolores Tamez', specialty: 'Cirugía Oncológica', hospital: 'PAITILLA' },
  { name: 'Maria Lim Law', specialty: 'Oncología Médica', hospital: 'PAITILLA' },
  { name: 'Mario Rodríguez', specialty: 'Pediatría', hospital: 'PAITILLA' },
  { name: 'Marion Alleyne', specialty: 'Neurología', hospital: 'PAITILLA' },
  { name: 'Mery de Obaldía', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Miguel Ángel Aguirre', specialty: 'Cirugía Cardiovascular y Toráxica', hospital: 'PAITILLA' },
  { name: 'Miguel Valdés', specialty: 'Cirugía general', hospital: 'PAITILLA' },
  { name: 'Miguel Wong', specialty: 'Oftalmología', hospital: 'PAITILLA' },
  { name: 'Mizael Rodríguez', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Moisés Torrijos', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Mónica Tribaldos', specialty: 'Cirugía Plástica', hospital: 'PAITILLA' },
  { name: 'Myrna Pinilla', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Nathalie Ruiz', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Nilsa Cepeda', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Noelia Hermida Estevéz', specialty: 'Dermatología', hospital: 'PAITILLA' },
  { name: 'Norberto Calzada', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Noris Moreno de Flagge', specialty: 'Neurología', hospital: 'PAITILLA' },
  { name: 'Nuvia Batista', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Olivia Elizabeth El Achtar', specialty: 'Cirugía General', hospital: 'PAITILLA' },
  { name: 'Omar Castillo Fernández', specialty: 'Oncología Médica', hospital: 'PAITILLA' },
  { name: 'Omar Gordon', specialty: 'Neurocirugía', hospital: 'PAITILLA' },
  { name: 'Orlando Díaz', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Oscar Bulgim', specialty: 'Gastroenterología', hospital: 'PAITILLA' },
  { name: 'Osmond Nicholas', specialty: 'Endocrinología', hospital: 'PAITILLA' },
  { name: 'Patricia Sosa', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Pedro Pinilla Castañeda', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Pedro Vargas', specialty: 'Neonatología', hospital: 'PAITILLA' },
  { name: 'Percy Nuñez', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Rafael Restrepo', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Rainier Rodríguez', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
  { name: 'Ramiro Díaz Cabal', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Ramón Crespo', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Raúl Berbey', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Raúl de León', specialty: 'Cirugía Plástica', hospital: 'PAITILLA' },
  { name: 'Renán Araúz Cubilla', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Ricardo Bullen', specialty: 'Dermatología', hospital: 'PAITILLA' },
  { name: 'Ricardo Crespo', specialty: 'Oftalmología', hospital: 'PAITILLA' },
  { name: 'Ricardo Ramsay', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Richard Altieri', specialty: 'Cirugía General', hospital: 'PAITILLA' },
  { name: 'Roberto Bravo', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Roberto Proll', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Roberto Vásquez', specialty: 'Oftalmología', hospital: 'PAITILLA' },
  { name: 'Rodrigo Correa', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Rogelio Mckenzie', specialty: 'Endocrinología', hospital: 'PAITILLA' },
  { name: 'Rogelio Moreno', specialty: 'Psiquiatría', hospital: 'PAITILLA' },
  { name: 'Ronald Pérez', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Roque Pinilla', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Rosendo González', specialty: 'Gastroenterología', hospital: 'PAITILLA' },
  { name: 'Rubén D. Mora', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Rubén Ureña', specialty: 'Urología', hospital: 'PAITILLA' },
  { name: 'Ruth De León', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Samuel Edwards', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Sara Campana', specialty: 'Ginecología', hospital: 'PAITILLA' },
  { name: 'Taihiris Elizabeth Beluche', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Telsys Bonilla de Nieto', specialty: 'Neonatología', hospital: 'PAITILLA' },
  { name: 'Teofilo Gozaine', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Usmaila Navarro', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Vanessa Heilbron', specialty: 'Ortopedia', hospital: 'PAITILLA' },
  { name: 'Víctor Valderrama', specialty: 'Cardiología', hospital: 'PAITILLA' },
  { name: 'Vielka Sanjur', specialty: 'Geriatría', hospital: 'PAITILLA' },
  { name: 'Viterbo Osorio', specialty: 'Geriatría', hospital: 'PAITILLA' },
  { name: 'Walter Morales', specialty: 'Urología', hospital: 'PAITILLA' },
  { name: 'Xavier Vargas', specialty: 'Optometrista', hospital: 'PAITILLA' },
  { name: 'Yamileth Concepción', specialty: 'Radióloga Intervencionista', hospital: 'PAITILLA' },
  { name: 'Yasmín García Melgarejo', specialty: 'Otorrinolaringología', hospital: 'PAITILLA' },
  { name: 'Yassir Ruíz Guardia', specialty: 'Medicina Interna', hospital: 'PAITILLA' },
];

const PACIFICA_DOCTORS: RawDoctor[] = [
  // From mymedicplus.com — Hospital Punta Pacifica
  // Cardiology
  { name: 'Norberto J. Calzada', specialty: 'Cardiología', hospital: 'PACIFICA' },
  { name: 'Temistocles Díaz', specialty: 'Cardiología', hospital: 'PACIFICA' },
  { name: 'José Pinto', specialty: 'Cardiología', hospital: 'PACIFICA' },
  { name: 'José Alberto Rangel Ortega', specialty: 'Cardiología', hospital: 'PACIFICA' },
  { name: 'Antonio J. Rodríguez', specialty: 'Cardiología', hospital: 'PACIFICA' },
  // Cardiac Surgery
  { name: 'Carlos Alba', specialty: 'Cirugía Cardiovascular', hospital: 'PACIFICA' },
  { name: 'Pedro Echeverria', specialty: 'Cirugía Cardiovascular', hospital: 'PACIFICA' },
  { name: 'Manuel Jaén', specialty: 'Cirugía Cardiovascular', hospital: 'PACIFICA' },
  { name: 'Francisco Sánchez', specialty: 'Cirugía Cardiovascular', hospital: 'PACIFICA' },
  { name: 'Olmedo Sousa', specialty: 'Cirugía Cardiovascular', hospital: 'PACIFICA' },
  { name: 'Gerardo Victoria', specialty: 'Cirugía Cardiovascular', hospital: 'PACIFICA' },
  // Dermatology
  { name: 'Constantino Costarangos', specialty: 'Dermatología', hospital: 'PACIFICA' },
  { name: 'Raúl García de Paredes', specialty: 'Dermatología', hospital: 'PACIFICA' },
  { name: 'Carmen Amada Pinzón', specialty: 'Dermatología', hospital: 'PACIFICA' },
  { name: 'Armando Mocci', specialty: 'Dermatología', hospital: 'PACIFICA' },
  // Gastroenterology
  { name: 'Manuel Cachafeiro', specialty: 'Gastroenterología', hospital: 'PACIFICA' },
  { name: 'Carlos Rettally', specialty: 'Gastroenterología', hospital: 'PACIFICA' },
  { name: 'Jorge Tejera', specialty: 'Gastroenterología', hospital: 'PACIFICA' },
  { name: 'Erides Vergara', specialty: 'Gastroenterología', hospital: 'PACIFICA' },
  // General Surgery
  { name: 'Richard E. Altieri Pérez', specialty: 'Cirugía General', hospital: 'PACIFICA' },
  { name: 'Hebe Angélica Aviles', specialty: 'Cirugía General', hospital: 'PACIFICA' },
  { name: 'Rolando A. Bissot', specialty: 'Cirugía General', hospital: 'PACIFICA' },
  { name: 'Moisés Chitrit', specialty: 'Cirugía General', hospital: 'PACIFICA' },
  { name: 'Nicolas Liakopulos', specialty: 'Cirugía General', hospital: 'PACIFICA' },
  // Pathology
  { name: 'Diana Cortés', specialty: 'Medicina Interna', hospital: 'PACIFICA' },
  { name: 'Milantia Roy', specialty: 'Medicina Interna', hospital: 'PACIFICA' },
  { name: 'Antonio Saiz', specialty: 'Medicina Interna', hospital: 'PACIFICA' },
  // Pediatrics
  { name: 'María Beatriz Abbott', specialty: 'Pediatría', hospital: 'PACIFICA' },
  { name: 'Daniel Herrera', specialty: 'Pediatría', hospital: 'PACIFICA' },
  { name: 'Bernardo Quintero', specialty: 'Pediatría', hospital: 'PACIFICA' },
  { name: 'Pedro Vargas', specialty: 'Pediatría', hospital: 'PACIFICA' },
  // Urology
  { name: 'Enrique Alemán', specialty: 'Urología', hospital: 'PACIFICA' },
  { name: 'Ángel Alvarado', specialty: 'Urología', hospital: 'PACIFICA' },
  { name: 'Elías Bodden', specialty: 'Urología', hospital: 'PACIFICA' },
  { name: 'Ricardo Donderis', specialty: 'Urología', hospital: 'PACIFICA' },
  { name: 'Guillermo García', specialty: 'Urología', hospital: 'PACIFICA' },
  // Plastic Surgery
  { name: 'José Espino', specialty: 'Cirugía Plástica', hospital: 'PACIFICA' },
  { name: 'Abraham Malca Coiffman', specialty: 'Cirugía Plástica', hospital: 'PACIFICA' },
  { name: 'Joseph Setton', specialty: 'Cirugía Plástica', hospital: 'PACIFICA' },
  { name: 'Roberto Tribaldos', specialty: 'Cirugía Plástica', hospital: 'PACIFICA' },
  // Neurosurgery
  { name: 'Anastacio Almejeira', specialty: 'Neurocirugía', hospital: 'PACIFICA' },
  { name: 'Javier Alvarado', specialty: 'Neurocirugía', hospital: 'PACIFICA' },
  { name: 'Avelino Gutierrez', specialty: 'Neurocirugía', hospital: 'PACIFICA' },
  { name: 'Diógenes Harris', specialty: 'Neurocirugía', hospital: 'PACIFICA' },
  // Oncology
  { name: 'Roberto López', specialty: 'Oncología Médica', hospital: 'PACIFICA' },
  { name: 'Carlos Montero', specialty: 'Oncología Médica', hospital: 'PACIFICA' },
  // Ophthalmology
  { name: 'Maritza López', specialty: 'Oftalmología', hospital: 'PACIFICA' },
  { name: 'Oliver Otarola', specialty: 'Oftalmología', hospital: 'PACIFICA' },
  // Orthopedics
  { name: 'Raul Arjona', specialty: 'Ortopedia', hospital: 'PACIFICA' },
  { name: 'Salomón Dayán', specialty: 'Ortopedia', hospital: 'PACIFICA' },
  { name: 'José Jaén', specialty: 'Ortopedia', hospital: 'PACIFICA' },
  { name: 'Lionel Jaén', specialty: 'Ortopedia', hospital: 'PACIFICA' },
  { name: 'Rafael Melgar', specialty: 'Ortopedia', hospital: 'PACIFICA' },
  // Endocrinology (from health-tourism)
  { name: 'Daniel Abouganem M.', specialty: 'Endocrinología', hospital: 'PACIFICA' },
  { name: 'Liliana Neil', specialty: 'Endocrinología', hospital: 'PACIFICA' },
  // Emergency / General
  { name: 'Nathaniel Coley', specialty: 'Medicina Interna', hospital: 'PACIFICA' },
  { name: 'Gerardo Castrellon', specialty: 'Medicina Interna', hospital: 'PACIFICA' },
  { name: 'Martha Martinez', specialty: 'Dermatología', hospital: 'PACIFICA' },
  { name: 'José Ricardo Ruiz', specialty: 'Gastroenterología', hospital: 'PACIFICA' },
  // Neurology (from hulihealth)
  { name: 'Pahola Araujo Del Rosario', specialty: 'Neurología', hospital: 'PACIFICA' },
];

const SAN_FERNANDO_DOCTORS: RawDoctor[] = [
  // From mymedicplus.com — Clínica Hospital San Fernando
  // Anesthesiology
  { name: 'Águeda de Pedreschi', specialty: 'Anestesiología', hospital: 'SAN_FERNANDO' },
  { name: 'Alexis Vilá', specialty: 'Anestesiología', hospital: 'SAN_FERNANDO' },
  { name: 'Ariadne Itzel Sánchez Ordóñez', specialty: 'Anestesiología', hospital: 'SAN_FERNANDO' },
  { name: 'Ariel González Batista', specialty: 'Anestesiología', hospital: 'SAN_FERNANDO' },
  { name: 'Dante Viggiano', specialty: 'Anestesiología', hospital: 'SAN_FERNANDO' },
  // Cardiology
  { name: 'Alexis E. Morón Malek', specialty: 'Cardiología', hospital: 'SAN_FERNANDO' },
  { name: 'Alfaro Marchena Noriega', specialty: 'Cardiología', hospital: 'SAN_FERNANDO' },
  { name: 'Álvaro Cornó', specialty: 'Cardiología', hospital: 'SAN_FERNANDO' },
  { name: 'Arturo E. Guerra Salinas', specialty: 'Cardiología', hospital: 'SAN_FERNANDO' },
  { name: 'Bolívar Domínguez', specialty: 'Cardiología', hospital: 'SAN_FERNANDO' },
  // Gastroenterology
  { name: 'Ángel M. Wong J.', specialty: 'Gastroenterología', hospital: 'SAN_FERNANDO' },
  { name: 'Aníbal Arce', specialty: 'Gastroenterología', hospital: 'SAN_FERNANDO' },
  { name: 'César Fernando Porras H.', specialty: 'Gastroenterología', hospital: 'SAN_FERNANDO' },
  { name: 'Eric Peñafiel Q', specialty: 'Gastroenterología', hospital: 'SAN_FERNANDO' },
  { name: 'Erides Vergara', specialty: 'Gastroenterología', hospital: 'SAN_FERNANDO' },
  // Gynecology
  { name: 'Abdiel Oscar Tapia González', specialty: 'Ginecología', hospital: 'SAN_FERNANDO' },
  { name: 'Adán Alberto Luzcando V.', specialty: 'Ginecología', hospital: 'SAN_FERNANDO' },
  { name: 'Alejandro Loo Lam', specialty: 'Ginecología', hospital: 'SAN_FERNANDO' },
  { name: 'Ángel Díaz', specialty: 'Ginecología', hospital: 'SAN_FERNANDO' },
  { name: 'Ángel Cedeño Rodríguez', specialty: 'Ginecología', hospital: 'SAN_FERNANDO' },
  // Oncology
  { name: 'Alonso Young', specialty: 'Oncología Médica', hospital: 'SAN_FERNANDO' },
  { name: 'Andrevis Berroa', specialty: 'Oncología Médica', hospital: 'SAN_FERNANDO' },
  { name: 'Enrique Díaz Correa', specialty: 'Oncología Médica', hospital: 'SAN_FERNANDO' },
  { name: 'España De la Rosa', specialty: 'Oncología Médica', hospital: 'SAN_FERNANDO' },
  { name: 'Fernanda Picardi Imparato', specialty: 'Oncología Médica', hospital: 'SAN_FERNANDO' },
  // Neurology
  { name: 'Carmen Báez de Ulloa', specialty: 'Neurología', hospital: 'SAN_FERNANDO' },
  { name: 'Donna Chen de Lee', specialty: 'Neurología', hospital: 'SAN_FERNANDO' },
  { name: 'Ernesto Triana', specialty: 'Neurología', hospital: 'SAN_FERNANDO' },
  { name: 'Evelia Gómez Wong', specialty: 'Neurología', hospital: 'SAN_FERNANDO' },
  { name: 'Iván Abadía Herrera', specialty: 'Neurología', hospital: 'SAN_FERNANDO' },
  // Orthopedics
  { name: 'Alessandro Alessandría', specialty: 'Ortopedia', hospital: 'SAN_FERNANDO' },
  { name: 'Bolívar Franco Díaz', specialty: 'Ortopedia', hospital: 'SAN_FERNANDO' },
  { name: 'Carmen Vázquez', specialty: 'Ortopedia', hospital: 'SAN_FERNANDO' },
  { name: 'Edmundo Ford Sosa', specialty: 'Ortopedia', hospital: 'SAN_FERNANDO' },
  { name: 'Gustavo Pinilla', specialty: 'Ortopedia', hospital: 'SAN_FERNANDO' },
  // Urology
  { name: 'Alex Amat Alemán M.', specialty: 'Urología', hospital: 'SAN_FERNANDO' },
  { name: 'Ángel Alvarado', specialty: 'Urología', hospital: 'SAN_FERNANDO' },
  { name: 'Carlos Raúl Anguizola V.', specialty: 'Urología', hospital: 'SAN_FERNANDO' },
  { name: 'Celeste Shirolyn Alston C.', specialty: 'Urología', hospital: 'SAN_FERNANDO' },
  { name: 'David Crespo', specialty: 'Urología', hospital: 'SAN_FERNANDO' },
  // From HuliHealth
  { name: 'Enith Paola Rodríguez Martínez', specialty: 'Otorrinolaringología', hospital: 'SAN_FERNANDO' },
  { name: 'Francisco Antonio Medina Mosley', specialty: 'Geriatría', hospital: 'SAN_FERNANDO' },
  { name: 'Johanna Morris Valdés', specialty: 'Hematología', hospital: 'SAN_FERNANDO' },
  { name: 'Lidia Fernanda Donderis Louisón', specialty: 'Dermatología', hospital: 'SAN_FERNANDO' },
  { name: 'Pablo Fletcher Vasquez', specialty: 'Endocrinología', hospital: 'SAN_FERNANDO' },
];

const ALL_DOCTORS = [...PAITILLA_DOCTORS, ...PACIFICA_DOCTORS, ...SAN_FERNANDO_DOCTORS];

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
    console.log('  npx tsx scripts/import-hospital-directories.ts --dry-run');
    console.log('  npx tsx scripts/import-hospital-directories.ts --execute');
    process.exit(0);
  }

  console.log('============================================');
  console.log('  PlexusMap — Import Hospital Directories');
  console.log(`  Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('============================================\n');

  // Ensure all needed specialties exist
  const NEEDED_SPECIALTIES = [
    { slug: 'neurologia', name: 'Neurología', icon: '🧬' },
    { slug: 'nutricion', name: 'Nutrición y Dietética', icon: '🥗' },
    { slug: 'fisioterapia', name: 'Fisioterapia y Rehabilitación', icon: '🏃' },
    { slug: 'ortopedia', name: 'Ortopedia', icon: '🦿' },
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
  console.log(`  Paitilla: ${PAITILLA_DOCTORS.length}`);
  console.log(`  Pacífica Salud: ${PACIFICA_DOCTORS.length}`);
  console.log(`  San Fernando: ${SAN_FERNANDO_DOCTORS.length}`);

  // Load existing professionals for dedup
  const existing = await prisma.professional.findMany({
    select: { name: true, slug: true },
  });
  const existingSlugs = new Set(existing.map(p => p.slug));
  const existingNames = new Set(existing.map(p => p.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')));

  console.log(`Existing professionals: ${existing.length}\n`);

  // Filter out entities that aren't real doctors
  const skipNames = new Set([
    'cardiólogos asociados', 'centro fecundar', 'estudios cardiológicos',
    'neurocenter paitilla', 'ortho rehabilitación paitilla',
    'clinica benoit audífonos panamá',
  ]);

  let created = 0;
  let skipped = 0;
  let duplicates = 0;
  let unmappedSpecialties = new Set<string>();

  for (const doc of ALL_DOCTORS) {
    const normalizedName = doc.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Skip non-doctor entities
    if (skipNames.has(normalizedName)) {
      skipped++;
      continue;
    }

    // Skip titles like "Lcda." — these are nutritionists/dietists already handled
    const cleanName = doc.name.replace(/^(Lcda\.\s*|Lic\.\s*)/i, '').trim();

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
      // Specialty doesn't exist in DB yet, skip
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
