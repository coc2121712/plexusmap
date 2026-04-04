// PlexusMap — Seed Script (v4 — triple mode: development / production / google-places)
// Run: npx tsx prisma/seed.ts
// Mode: SEED_MODE=development (default) | SEED_MODE=production | SEED_MODE=google-places

import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const SEED_MODE = (process.env.SEED_MODE || 'development') as 'development' | 'production' | 'google-places';

// ═══════════════════════════════════════════
// SPECIALTIES — Normalized taxonomy (shared)
// ═══════════════════════════════════════════
const specialties = [
  { slug: 'optometria', name: 'Optometría', icon: '👁️' },
  { slug: 'oftalmologia', name: 'Oftalmología', icon: '🔬' },
  { slug: 'odontologia-general', name: 'Odontología General', icon: '🦷' },
  { slug: 'ortodoncia', name: 'Ortodoncia', icon: '🦷' },
  { slug: 'dermatologia', name: 'Dermatología', icon: '🧴' },
  { slug: 'pediatria', name: 'Pediatría', icon: '👶' },
  { slug: 'medicina-general', name: 'Medicina General', icon: '🩺' },
  { slug: 'medicina-interna', name: 'Medicina Interna', icon: '🫀' },
  { slug: 'cardiologia', name: 'Cardiología', icon: '❤️' },
  { slug: 'ginecologia', name: 'Ginecología y Obstetricia', icon: '🤰' },
  { slug: 'traumatologia', name: 'Traumatología y Ortopedia', icon: '🦴' },
  { slug: 'psicologia', name: 'Psicología Clínica', icon: '🧠' },
  { slug: 'urologia', name: 'Urología', icon: '🏥' },
  { slug: 'nutricion', name: 'Nutrición y Dietética', icon: '🥗' },
  { slug: 'fisioterapia', name: 'Fisioterapia y Rehabilitación', icon: '🏃' },
  { slug: 'ortopedia', name: 'Ortopedia', icon: '🦿' },
  { slug: 'neurologia', name: 'Neurología', icon: '🧬' },
];

// ═══════════════════════════════════════════
// INSURANCES — Panama (shared)
// ═══════════════════════════════════════════
const insurances = [
  { name: 'CSS (Caja de Seguro Social)' },
  { name: 'ASSA Compañía de Seguros' },
  { name: 'Mapfre Panamá' },
  { name: 'Pan American Life' },
  { name: 'Blue Cross Blue Shield Panamá' },
  { name: 'General de Seguros' },
  { name: 'Internacional de Seguros' },
  { name: 'Assicurazioni Generali' },
  { name: 'Worldwide Medical Assurance' },
  { name: 'HSBC Seguros' },
];

// ═══════════════════════════════════════════
// PROFESSIONAL INTERFACE
// ═══════════════════════════════════════════
interface ProfSeed {
  name: string;
  specialtySlug: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  bio: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isClaimed?: boolean;
  photos: string[];
  insuranceNames: string[];
  schedule: { dayOfWeek: number; startTime: string; endTime: string; slotDuration: number }[];
  reviews: { rating: number; comment: string; patientName: string; patientPhone: string }[];
}

// ═══════════════════════════════════════════
// DEVELOPMENT PROFESSIONALS (19 fictitious)
// ═══════════════════════════════════════════
const developmentProfessionals: ProfSeed[] = [
  // ── OPTOMETRISTS ──
  {
    name: 'Dra. María Fernanda Castillo',
    specialtySlug: 'optometria',
    address: 'Calle 50, Edificio Global Plaza, Piso 3, Local 302, Bella Vista',
    lat: 8.9824, lng: -79.5199,
    phone: '+507-264-5500',
    email: 'mfcastillo@plexusmap.com',
    bio: 'Optómetra con 15 años de experiencia en evaluación visual completa, adaptación de lentes de contacto y detección temprana de patologías oculares. Especializada en pediatría ocular.',
    rating: 4.8, reviewCount: 47, isVerified: true,
    photos: ['/seed/optometrist-1.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'Mapfre Panamá'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Excelente doctora, muy profesional y detallista. Mi hijo quedó muy cómodo.', patientName: 'Carolina M.', patientPhone: '+507-6001-0001' },
      { rating: 5, comment: 'La mejor optómetra que he visitado en Panamá. Muy paciente y explica todo.', patientName: 'Jorge R.', patientPhone: '+507-6001-0002' },
      { rating: 4, comment: 'Buen servicio, aunque la espera fue un poco larga.', patientName: 'Melissa T.', patientPhone: '+507-6001-0003' },
    ],
  },
  {
    name: 'Dr. Roberto Ángel Herrera',
    specialtySlug: 'optometria',
    address: 'Vía España, Centro Comercial El Dorado, Local 14, El Cangrejo',
    lat: 8.9852, lng: -79.5310,
    phone: '+507-223-7788',
    email: 'rherrera@plexusmap.com',
    bio: 'Optómetra graduado de la Universidad Latina de Panamá. Especialista en lentes progresivos y terapia visual para adultos mayores.',
    rating: 4.5, reviewCount: 32, isVerified: true,
    photos: ['/seed/optometrist-2.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'Pan American Life'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '09:00', endTime: '15:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Muy buen doctor, me explicó paso a paso todo el examen.', patientName: 'Luis A.', patientPhone: '+507-6002-0001' },
      { rating: 4, comment: 'Profesional y puntual. Recomendado.', patientName: 'Sandra P.', patientPhone: '+507-6002-0002' },
    ],
  },
  {
    name: 'Dra. Lucía Méndez de Arias',
    specialtySlug: 'optometria',
    address: 'Costa del Este, PH Oceania Business Plaza, Torre 1000, Piso 12',
    lat: 9.0077, lng: -79.4689,
    phone: '+507-271-3344',
    email: 'lmendez@plexusmap.com',
    bio: 'Especialista en contactología avanzada y ortoqueratología nocturna. Certificada en manejo de miopía en niños.',
    rating: 4.9, reviewCount: 63, isVerified: true,
    photos: ['/seed/optometrist-3.jpg'],
    insuranceNames: ['ASSA Compañía de Seguros', 'Blue Cross Blue Shield Panamá', 'Worldwide Medical Assurance'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:30', endTime: '16:30', slotDuration: 45 },
      { dayOfWeek: 2, startTime: '07:30', endTime: '16:30', slotDuration: 45 },
      { dayOfWeek: 3, startTime: '07:30', endTime: '16:30', slotDuration: 45 },
      { dayOfWeek: 4, startTime: '07:30', endTime: '16:30', slotDuration: 45 },
      { dayOfWeek: 5, startTime: '07:30', endTime: '12:00', slotDuration: 45 },
    ],
    reviews: [
      { rating: 5, comment: 'Increíble experiencia. Los lentes de contacto que me adaptó son perfectos.', patientName: 'Ana G.', patientPhone: '+507-6003-0001' },
      { rating: 5, comment: 'Mi hijo bajó su miopía con orto-K. Doctora dedicada y cariñosa.', patientName: 'Patricia V.', patientPhone: '+507-6003-0002' },
      { rating: 5, comment: 'La mejor de Costa del Este, sin duda.', patientName: 'Ricardo F.', patientPhone: '+507-6003-0003' },
    ],
  },

  // ── DENTISTS ──
  {
    name: 'Dr. Carlos Eduardo Sánchez',
    specialtySlug: 'odontologia-general',
    address: 'Vía Argentina, Edificio Bambú, Piso 2, Local 201, El Cangrejo',
    lat: 8.9831, lng: -79.5267,
    phone: '+507-269-1122',
    email: 'csanchez@plexusmap.com',
    bio: 'Odontólogo general con enfoque en estética dental y endodoncia. 12 años de experiencia. Miembro de la Asociación Odontológica Panameña.',
    rating: 4.6, reviewCount: 55, isVerified: true,
    photos: ['/seed/dentist-1.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'General de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', slotDuration: 60 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', slotDuration: 60 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', slotDuration: 60 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', slotDuration: 60 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', slotDuration: 60 },
    ],
    reviews: [
      { rating: 5, comment: 'Me hizo una endodoncia sin dolor. Excelente profesional.', patientName: 'Eduardo B.', patientPhone: '+507-6004-0001' },
      { rating: 4, comment: 'Buen dentista, consultorio moderno y limpio.', patientName: 'Diana L.', patientPhone: '+507-6004-0002' },
      { rating: 5, comment: 'Mis blanqueamientos quedaron perfectos. Muy recomendado.', patientName: 'Vanessa Q.', patientPhone: '+507-6004-0003' },
    ],
  },
  {
    name: 'Dra. Ana Patricia Rodríguez',
    specialtySlug: 'ortodoncia',
    address: 'Calle Abel Bravo, San Francisco, Plaza Bali, Local 5',
    lat: 8.9912, lng: -79.5078,
    phone: '+507-226-9900',
    email: 'arodriguez@plexusmap.com',
    bio: 'Ortodoncista con maestría en ortodoncia interceptiva. Especialista en Invisalign y brackets estéticos. Atención a niños y adultos.',
    rating: 4.7, reviewCount: 41, isVerified: true,
    photos: ['/seed/dentist-2.jpg'],
    insuranceNames: ['Mapfre Panamá', 'Pan American Life', 'Internacional de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', slotDuration: 45 },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', slotDuration: 45 },
      { dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotDuration: 45 },
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', slotDuration: 45 },
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', slotDuration: 45 },
    ],
    reviews: [
      { rating: 5, comment: 'Mi sonrisa cambió completamente. Eternamente agradecida.', patientName: 'Gabriela S.', patientPhone: '+507-6005-0001' },
      { rating: 5, comment: 'Invisalign fue la mejor decisión. Dra. Rodríguez es excelente.', patientName: 'Manuel H.', patientPhone: '+507-6005-0002' },
    ],
  },

  // ── DERMATOLOGISTS ──
  {
    name: 'Dra. Gabriela Ponce',
    specialtySlug: 'dermatologia',
    address: 'Punta Pacífica, Hospital Punta Pacífica, Consultorio 615',
    lat: 8.9917, lng: -79.5136,
    phone: '+507-204-8615',
    email: 'gponce@plexusmap.com',
    bio: 'Dermatóloga certificada con subespecialidad en dermatología estética y cirugía dermatológica. Tratamientos con láser, botox y rellenos.',
    rating: 4.9, reviewCount: 78, isVerified: true,
    photos: ['/seed/dermatologist-1.jpg'],
    insuranceNames: ['ASSA Compañía de Seguros', 'Blue Cross Blue Shield Panamá', 'Worldwide Medical Assurance', 'Pan American Life'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '12:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Mi piel mejoró tremendamente. El tratamiento láser fue fantástico.', patientName: 'Isabel N.', patientPhone: '+507-6006-0001' },
      { rating: 5, comment: 'Profesional y cálida. Siempre me siento en buenas manos.', patientName: 'Rosa M.', patientPhone: '+507-6006-0002' },
      { rating: 5, comment: 'La mejor dermatóloga de Panamá. Resultados visibles desde la primera sesión.', patientName: 'Fernanda C.', patientPhone: '+507-6006-0003' },
      { rating: 4, comment: 'Muy buena, aunque los precios son un poco altos.', patientName: 'Andrés W.', patientPhone: '+507-6006-0004' },
    ],
  },
  {
    name: 'Dr. Alejandro Villarreal',
    specialtySlug: 'dermatologia',
    address: 'Área Bancaria, Torre Banistmo, Piso 8, Consultorio 805',
    lat: 8.9838, lng: -79.5228,
    phone: '+507-263-4455',
    email: 'avillarreal@plexusmap.com',
    bio: 'Dermatólogo con 20 años de experiencia. Especialista en enfermedades cutáneas tropicales y dermatoscopia digital para detección de melanoma.',
    rating: 4.4, reviewCount: 29, isVerified: true,
    photos: ['/seed/dermatologist-2.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'General de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:00', endTime: '15:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '07:00', endTime: '15:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '07:00', endTime: '15:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '07:00', endTime: '15:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '07:00', endTime: '12:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Me detectó un lunar sospechoso a tiempo. Le debo mucho.', patientName: 'Tomás R.', patientPhone: '+507-6007-0001' },
      { rating: 4, comment: 'Buen doctor, directo y claro en sus diagnósticos.', patientName: 'Clara E.', patientPhone: '+507-6007-0002' },
    ],
  },

  // ── PEDIATRICIAN ──
  {
    name: 'Dra. Isabel Cristina Moreno',
    specialtySlug: 'pediatria',
    address: 'San Francisco, Centro Médico Nacional, Consultorio 310',
    lat: 8.9945, lng: -79.5015,
    phone: '+507-229-3377',
    email: 'imoreno@plexusmap.com',
    bio: 'Pediatra con 18 años de experiencia en atención primaria infantil, vacunación y desarrollo del niño. Control de crecimiento y nutrición pediátrica.',
    rating: 4.8, reviewCount: 92, isVerified: true,
    photos: ['/seed/pediatrician-1.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'Mapfre Panamá', 'Pan American Life'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '07:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '07:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '07:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '07:00', endTime: '12:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '08:00', endTime: '12:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Mi pediatra de confianza. Mis tres hijos se atienden con ella.', patientName: 'Mónica D.', patientPhone: '+507-6008-0001' },
      { rating: 5, comment: 'Excelente con los bebés, muy paciente y cariñosa.', patientName: 'Yamileth O.', patientPhone: '+507-6008-0002' },
      { rating: 5, comment: 'Siempre disponible para emergencias. Una bendición.', patientName: 'Pedro J.', patientPhone: '+507-6008-0003' },
      { rating: 4, comment: 'Muy buena doctora, a veces la consulta se retrasa un poco.', patientName: 'Laura K.', patientPhone: '+507-6008-0004' },
    ],
  },

  // ── GENERAL MEDICINE ──
  {
    name: 'Dr. Fernando José Batista',
    specialtySlug: 'medicina-general',
    address: 'Calidonia, Clínica Hospital San Fernando, Consultorio 102',
    lat: 8.9671, lng: -79.5376,
    phone: '+507-227-1100',
    email: 'fbatista@plexusmap.com',
    bio: 'Médico general con experiencia en atención primaria, medicina preventiva y manejo de enfermedades crónicas. Chequeos ejecutivos.',
    rating: 4.3, reviewCount: 38, isVerified: true,
    photos: ['/seed/general-1.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'General de Seguros', 'HSBC Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', slotDuration: 20 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', slotDuration: 20 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', slotDuration: 20 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', slotDuration: 20 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', slotDuration: 20 },
    ],
    reviews: [
      { rating: 4, comment: 'Buen médico, atento y rápido. Buena ubicación.', patientName: 'Enrique S.', patientPhone: '+507-6009-0001' },
      { rating: 5, comment: 'Me detectó la diabetes a tiempo con un chequeo preventivo.', patientName: 'Miriam Z.', patientPhone: '+507-6009-0002' },
    ],
  },
  {
    name: 'Dra. Karina Valderrama',
    specialtySlug: 'medicina-general',
    address: 'El Dorado, Boulevard El Dorado, Edificio Pacífica, PB',
    lat: 8.9930, lng: -79.5421,
    phone: '+507-236-8800',
    email: 'kvalderrama@plexusmap.com',
    bio: 'Médica general bilingüe (español/inglés). Consultas presenciales y telemedicina. Certificados médicos, control de peso, vacunación adultos.',
    rating: 4.6, reviewCount: 25, isVerified: false,
    photos: ['/seed/general-2.jpg'],
    insuranceNames: ['Mapfre Panamá', 'Internacional de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', slotDuration: 20 },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', slotDuration: 20 },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00', slotDuration: 20 },
      { dayOfWeek: 4, startTime: '09:00', endTime: '17:00', slotDuration: 20 },
      { dayOfWeek: 5, startTime: '09:00', endTime: '14:00', slotDuration: 20 },
    ],
    reviews: [
      { rating: 5, comment: 'Hice telemedicina y fue súper cómodo. Muy profesional.', patientName: 'Alberto J.', patientPhone: '+507-6010-0001' },
      { rating: 4, comment: 'Buena doctora, consultorio pequeño pero bien equipado.', patientName: 'Fabiola I.', patientPhone: '+507-6010-0002' },
    ],
  },

  // ── OPHTHALMOLOGIST ──
  {
    name: 'Dr. Raúl Enrique Gutiérrez',
    specialtySlug: 'oftalmologia',
    address: 'Punta Pacífica, Centro Médico Paitilla, Torre B, Consultorio 712',
    lat: 8.9889, lng: -79.5164,
    phone: '+507-265-8888',
    email: 'rgutierrez@plexusmap.com',
    bio: 'Oftalmólogo cirujano con subespecialidad en retina y vítreo. Cirugía de catarata con técnica de facoemulsificación. Fellow del Bascom Palmer Eye Institute.',
    rating: 4.9, reviewCount: 104, isVerified: true,
    photos: ['/seed/ophthalmologist-1.jpg'],
    insuranceNames: ['ASSA Compañía de Seguros', 'Blue Cross Blue Shield Panamá', 'Pan American Life', 'Worldwide Medical Assurance'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:00', endTime: '15:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '07:00', endTime: '15:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '07:00', endTime: '12:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '07:00', endTime: '15:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '07:00', endTime: '15:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Me operó de cataratas y veo como nunca. Manos de oro.', patientName: 'Carmen A.', patientPhone: '+507-6011-0001' },
      { rating: 5, comment: 'El mejor oftalmólogo de Panamá. Profesional de clase mundial.', patientName: 'Roberto T.', patientPhone: '+507-6011-0002' },
      { rating: 5, comment: 'Excelente cirujano. Mi desprendimiento de retina fue tratado con éxito.', patientName: 'Francisco B.', patientPhone: '+507-6011-0003' },
    ],
  },

  // ── MORE PROFESSIONALS ──
  {
    name: 'Dr. Miguel Ángel Torres',
    specialtySlug: 'odontologia-general',
    address: 'Betania, Centro Comercial Multicentro, Local 227',
    lat: 8.9778, lng: -79.5382,
    phone: '+507-260-3344',
    email: 'mtorres@plexusmap.com',
    bio: 'Odontólogo integral con énfasis en implantología y rehabilitación oral. Tecnología CAD/CAM para coronas en el mismo día.',
    rating: 4.5, reviewCount: 36, isVerified: true,
    photos: ['/seed/dentist-3.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', slotDuration: 60 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', slotDuration: 60 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', slotDuration: 60 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', slotDuration: 60 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', slotDuration: 60 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 60 },
    ],
    reviews: [
      { rating: 5, comment: 'Me hizo un implante y corona en un solo día. Increíble tecnología.', patientName: 'Arturo G.', patientPhone: '+507-6012-0001' },
      { rating: 4, comment: 'Buen trabajo, precios justos para la calidad.', patientName: 'Verónica P.', patientPhone: '+507-6012-0002' },
    ],
  },
  {
    name: 'Dra. Paola Ruiz Chen',
    specialtySlug: 'pediatria',
    address: 'Clayton, Ciudad del Saber, Edificio 227, Consultorio 4',
    lat: 9.0150, lng: -79.5678,
    phone: '+507-317-0055',
    email: 'pruizchen@plexusmap.com',
    bio: 'Pediatra trilingüe (español/inglés/mandarín). Especialista en alergias infantiles y asma pediátrico. Atención neonatal.',
    rating: 4.7, reviewCount: 51, isVerified: true,
    photos: ['/seed/pediatrician-2.jpg'],
    insuranceNames: ['Blue Cross Blue Shield Panamá', 'Worldwide Medical Assurance', 'Pan American Life'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '12:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Nos atiende en mandarín, algo que no se consigue fácil en Panamá. Excelente.', patientName: 'Wei L.', patientPhone: '+507-6013-0001' },
      { rating: 5, comment: 'Controló el asma de mi hija perfectamente. Muy agradecida.', patientName: 'Natalia V.', patientPhone: '+507-6013-0002' },
      { rating: 4, comment: 'Buena pediatra, Clayton es un poco lejos pero vale la pena.', patientName: 'David O.', patientPhone: '+507-6013-0003' },
    ],
  },
  {
    name: 'Dr. Ernesto Araúz Pineda',
    specialtySlug: 'cardiologia',
    address: 'Paitilla, Centro Médico Paitilla, Torre A, Consultorio 520',
    lat: 8.9895, lng: -79.5142,
    phone: '+507-269-5520',
    email: 'earauz@plexusmap.com',
    bio: 'Cardiólogo intervencionista. Cateterismos, ecocardiografía y pruebas de esfuerzo. 25 años de experiencia en cardiología clínica y quirúrgica.',
    rating: 4.8, reviewCount: 67, isVerified: true,
    photos: ['/seed/cardiologist-1.jpg'],
    insuranceNames: ['ASSA Compañía de Seguros', 'Mapfre Panamá', 'Pan American Life', 'General de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:00', endTime: '14:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '07:00', endTime: '14:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '07:00', endTime: '14:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '07:00', endTime: '14:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '07:00', endTime: '12:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Me salvó la vida con un cateterismo de emergencia. Profesional excepcional.', patientName: 'Ramón F.', patientPhone: '+507-6014-0001' },
      { rating: 5, comment: 'Muy completo en su evaluación. Dedicado y humano.', patientName: 'Marta C.', patientPhone: '+507-6014-0002' },
    ],
  },
  {
    name: 'Dra. Valentina Salazar',
    specialtySlug: 'ginecologia',
    address: 'Obarrio, Torre Médica Pacífica, Piso 6, Consultorio 603',
    lat: 8.9867, lng: -79.5255,
    phone: '+507-264-6603',
    email: 'vsalazar@plexusmap.com',
    bio: 'Ginecóloga obstetra con subespecialidad en medicina materno-fetal. Control prenatal de alto riesgo, colposcopia y cirugía laparoscópica.',
    rating: 4.7, reviewCount: 83, isVerified: true,
    photos: ['/seed/gynecologist-1.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'Mapfre Panamá', 'Blue Cross Blue Shield Panamá'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Atendió mis dos embarazos. Una doctora increíble y empática.', patientName: 'Daniela R.', patientPhone: '+507-6015-0001' },
      { rating: 5, comment: 'Profesional de primer nivel. Me sentí segura durante todo el proceso.', patientName: 'Alejandra M.', patientPhone: '+507-6015-0002' },
      { rating: 4, comment: 'Muy buena, pero hay que agendar con bastante anticipación.', patientName: 'Sofía P.', patientPhone: '+507-6015-0003' },
    ],
  },
  {
    name: 'Dr. Javier Ramos Quintero',
    specialtySlug: 'traumatologia',
    address: 'El Dorado, Hospital Nacional, Consultorio 405',
    lat: 8.9952, lng: -79.5389,
    phone: '+507-207-8405',
    email: 'jramos@plexusmap.com',
    bio: 'Ortopedista y traumatólogo. Especialista en cirugía de rodilla, artroscopia y medicina deportiva. Atención a atletas profesionales y amateur.',
    rating: 4.5, reviewCount: 44, isVerified: true,
    photos: ['/seed/orthopedist-1.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'General de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:30', endTime: '15:30', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '07:30', endTime: '15:30', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '07:30', endTime: '15:30', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '07:30', endTime: '15:30', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '07:30', endTime: '12:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Me operó el menisco y en 3 meses estaba corriendo de nuevo.', patientName: 'Diego H.', patientPhone: '+507-6016-0001' },
      { rating: 4, comment: 'Buen doctor, explica bien las opciones de tratamiento.', patientName: 'Paola T.', patientPhone: '+507-6016-0002' },
    ],
  },
  {
    name: 'Dr. Luis Felipe Chang',
    specialtySlug: 'medicina-interna',
    address: 'Vía Porras, Clínica Pacífica, Piso 1',
    lat: 8.9801, lng: -79.5112,
    phone: '+507-270-1234',
    email: 'lfchang@plexusmap.com',
    bio: 'Internista con enfoque en enfermedades metabólicas, hipertensión y diabetes. Chequeos integrales para ejecutivos.',
    rating: 4.2, reviewCount: 15, isVerified: false,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '09:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '09:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '09:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 4, comment: 'Buen internista, muy analítico.', patientName: 'Hugo V.', patientPhone: '+507-6017-0001' },
    ],
  },
  {
    name: 'Dra. Carmen Elena Navarro',
    specialtySlug: 'psicologia',
    address: 'Bella Vista, Edificio Torre del Sol, Piso 4, Local 402',
    lat: 8.9796, lng: -79.5234,
    phone: '+507-393-5500',
    email: 'cnavarro@plexusmap.com',
    bio: 'Psicóloga clínica con maestría en terapia cognitivo-conductual. Ansiedad, depresión, terapia de pareja y manejo del estrés.',
    rating: 4.6, reviewCount: 22, isVerified: false,
    photos: ['/seed/psychologist-1.jpg'],
    insuranceNames: ['Mapfre Panamá', 'Assicurazioni Generali'],
    schedule: [
      { dayOfWeek: 1, startTime: '10:00', endTime: '19:00', slotDuration: 60 },
      { dayOfWeek: 2, startTime: '10:00', endTime: '19:00', slotDuration: 60 },
      { dayOfWeek: 3, startTime: '10:00', endTime: '19:00', slotDuration: 60 },
      { dayOfWeek: 4, startTime: '10:00', endTime: '19:00', slotDuration: 60 },
      { dayOfWeek: 5, startTime: '10:00', endTime: '15:00', slotDuration: 60 },
    ],
    reviews: [
      { rating: 5, comment: 'Me ayudó a superar una crisis de ansiedad severa. Eternamente agradecida.', patientName: 'Valeria S.', patientPhone: '+507-6018-0001' },
      { rating: 5, comment: 'Terapia de pareja que realmente funciona. Muy recomendada.', patientName: 'Esteban y Ana', patientPhone: '+507-6018-0002' },
    ],
  },
  {
    name: 'Dr. Omar Espino Ríos',
    specialtySlug: 'urologia',
    address: 'San Fernando, Hospital San Fernando, Torre Médica, Consultorio 901',
    lat: 8.9685, lng: -79.5392,
    phone: '+507-305-6901',
    email: 'oespino@plexusmap.com',
    bio: 'Urólogo con especialización en cirugía mínimamente invasiva. Litotricia, próstata, infertilidad masculina. Profesor de la Universidad de Panamá.',
    rating: 4.4, reviewCount: 31, isVerified: true,
    photos: ['/seed/urologist-1.jpg'],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'Pan American Life'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:00', endTime: '14:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '07:00', endTime: '14:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '07:00', endTime: '14:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '07:00', endTime: '12:00', slotDuration: 30 },
    ],
    reviews: [
      { rating: 5, comment: 'Excelente cirujano. Mi operación fue un éxito total.', patientName: 'Marcos L.', patientPhone: '+507-6019-0001' },
      { rating: 4, comment: 'Profesional y directo. Consulta eficiente.', patientName: 'Guillermo N.', patientPhone: '+507-6019-0002' },
    ],
  },
];

// ═══════════════════════════════════════════════════════
// PRODUCTION PROFESSIONALS — Real Panama optics
// Founder's clinic first, then real businesses (unclaimed)
// No reviews — organic growth only
// ═══════════════════════════════════════════════════════
const FOUNDER_SLUG = 'clinica-optica-central';

const productionProfessionals: ProfSeed[] = [
  // ── FOUNDER'S OPTIC (claimed, verified) ──
  {
    name: 'Clínica Óptica Central',
    specialtySlug: 'optometria',
    address: 'Vía España, Edificio Central, Planta Baja, Bella Vista, Ciudad de Panamá',
    lat: 8.9830, lng: -79.5220,
    phone: '+507-264-3020',
    email: 'info@opticacentral.com.pa',
    bio: 'Óptica con más de 20 años en Panamá. Exámenes visuales computarizados, adaptación de lentes de contacto, lentes oftálmicos y monturas de diseñador. Atención personalizada con equipos de última generación.',
    rating: 4.8, reviewCount: 0, isVerified: true, isClaimed: true,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'Mapfre Panamá', 'Pan American Life'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '14:00', slotDuration: 30 },
    ],
    reviews: [],
  },

  // ── REAL PANAMA OPTICS (unclaimed, verified, no reviews) ──
  {
    name: 'Óptica López',
    specialtySlug: 'optometria',
    address: 'Vía España, El Cangrejo, Ciudad de Panamá',
    lat: 8.9848, lng: -79.5305,
    phone: '+507-223-6555',
    email: '',
    bio: 'Óptica familiar con más de 30 años en Vía España. Lentes oftálmicos, lentes de sol, lentes de contacto y exámenes de la vista.',
    rating: 4.3, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '14:00', slotDuration: 30 },
    ],
    reviews: [],
  },
  {
    name: 'MultiÓpticas Panamá',
    specialtySlug: 'optometria',
    address: 'Multiplaza Pacific Mall, Costa del Este, Ciudad de Panamá',
    lat: 9.0072, lng: -79.4698,
    phone: '+507-302-5000',
    email: '',
    bio: 'Cadena óptica con presencia en los principales centros comerciales de Panamá. Exámenes visuales, lentes graduados, lentes de sol y lentes de contacto de marcas premium.',
    rating: 4.1, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'Mapfre Panamá', 'Pan American Life'],
    schedule: [
      { dayOfWeek: 1, startTime: '10:00', endTime: '20:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '10:00', endTime: '20:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '10:00', endTime: '20:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '10:00', endTime: '20:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '10:00', endTime: '20:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '10:00', endTime: '20:00', slotDuration: 30 },
      { dayOfWeek: 0, startTime: '11:00', endTime: '19:00', slotDuration: 30 },
    ],
    reviews: [],
  },
  {
    name: 'Óptica Sosa',
    specialtySlug: 'optometria',
    address: 'Calle 50, Bella Vista, Ciudad de Panamá',
    lat: 8.9818, lng: -79.5185,
    phone: '+507-264-8191',
    email: '',
    bio: 'Óptica con tradición en Calle 50. Exámenes visuales completos, lentes multifocales, lentes de contacto y amplia variedad de monturas.',
    rating: 4.2, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'General de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
    ],
    reviews: [],
  },
  {
    name: 'Ópticas Visión',
    specialtySlug: 'optometria',
    address: 'Vía Porras, San Francisco, Ciudad de Panamá',
    lat: 8.9800, lng: -79.5100,
    phone: '+507-270-2244',
    email: '',
    bio: 'Especialistas en salud visual con equipos de diagnóstico de última generación. Lentes progresivos, fotocromáticos y tratamientos anti-reflejantes.',
    rating: 4.4, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['ASSA Compañía de Seguros', 'Pan American Life', 'Internacional de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
    ],
    reviews: [],
  },
  {
    name: 'Óptica Obarrio',
    specialtySlug: 'optometria',
    address: 'Calle 56 Obarrio, Edificio Torre Obarrio, PB, Ciudad de Panamá',
    lat: 8.9865, lng: -79.5250,
    phone: '+507-264-0088',
    email: '',
    bio: 'Óptica boutique en el corazón de Obarrio. Monturas de diseñador europeo, lentes de contacto especiales y exámenes optométricos completos.',
    rating: 4.5, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['ASSA Compañía de Seguros', 'Blue Cross Blue Shield Panamá', 'Worldwide Medical Assurance'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', slotDuration: 45 },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', slotDuration: 45 },
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', slotDuration: 45 },
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', slotDuration: 45 },
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', slotDuration: 45 },
    ],
    reviews: [],
  },
  {
    name: 'Óptica San Fernando',
    specialtySlug: 'optometria',
    address: 'Vía España frente a Clínica Hospital San Fernando, Calidonia, Ciudad de Panamá',
    lat: 8.9670, lng: -79.5370,
    phone: '+507-227-4500',
    email: '',
    bio: 'Óptica convenientemente ubicada frente al Hospital San Fernando. Exámenes de la vista, lentes graduados y de contacto, reparaciones express.',
    rating: 4.0, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'General de Seguros', 'HSBC Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:30', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '07:30', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '07:30', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '07:30', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '07:30', endTime: '17:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '08:00', endTime: '12:00', slotDuration: 30 },
    ],
    reviews: [],
  },
  {
    name: 'Óptica Bella Vista',
    specialtySlug: 'optometria',
    address: 'Avenida Balboa, Torre Bicsa Financial Center, PB, Bella Vista, Ciudad de Panamá',
    lat: 8.9780, lng: -79.5230,
    phone: '+507-215-9090',
    email: '',
    bio: 'Óptica moderna en Avenida Balboa. Especialistas en lentes progresivos digitales, lentes de contacto diarios y exámenes con tecnología OCT.',
    rating: 4.6, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['ASSA Compañía de Seguros', 'Mapfre Panamá', 'Pan American Life', 'Blue Cross Blue Shield Panamá'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '18:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '14:00', slotDuration: 30 },
    ],
    reviews: [],
  },
  {
    name: 'Centro Visual Costa del Este',
    specialtySlug: 'optometria',
    address: 'Town Center Costa del Este, Local 12, Ciudad de Panamá',
    lat: 9.0090, lng: -79.4705,
    phone: '+507-271-8822',
    email: '',
    bio: 'Centro visual integral en Costa del Este. Optometría pediátrica y adultos, contactología avanzada, ortoqueratología y terapia visual.',
    rating: 4.7, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['ASSA Compañía de Seguros', 'Blue Cross Blue Shield Panamá', 'Worldwide Medical Assurance', 'Pan American Life'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', slotDuration: 45 },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', slotDuration: 45 },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', slotDuration: 45 },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', slotDuration: 45 },
      { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', slotDuration: 45 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 45 },
    ],
    reviews: [],
  },
  {
    name: 'Óptica Paitilla',
    specialtySlug: 'optometria',
    address: 'Centro Médico Paitilla, Torre A, PB, Paitilla, Ciudad de Panamá',
    lat: 8.9890, lng: -79.5150,
    phone: '+507-265-7766',
    email: '',
    bio: 'Óptica dentro del Centro Médico Paitilla. Conveniente para pacientes de oftalmología. Lentes de alta gama, adaptación de contacto y reparaciones.',
    rating: 4.3, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'Mapfre Panamá'],
    schedule: [
      { dayOfWeek: 1, startTime: '07:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '07:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '07:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '07:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '07:00', endTime: '16:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '08:00', endTime: '12:00', slotDuration: 30 },
    ],
    reviews: [],
  },
  {
    name: 'Óptica El Dorado',
    specialtySlug: 'optometria',
    address: 'Centro Comercial El Dorado, Planta Baja, Local 18, El Dorado, Ciudad de Panamá',
    lat: 8.9935, lng: -79.5415,
    phone: '+507-236-3300',
    email: '',
    bio: 'Óptica con precios accesibles en El Dorado. Amplia variedad de monturas económicas y de marca. Exámenes visuales y lentes listos en una hora.',
    rating: 4.0, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'General de Seguros'],
    schedule: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '19:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '09:00', endTime: '19:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '09:00', endTime: '19:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '09:00', endTime: '19:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '09:00', endTime: '19:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '15:00', slotDuration: 30 },
    ],
    reviews: [],
  },
  {
    name: 'Óptica Albrook',
    specialtySlug: 'optometria',
    address: 'Albrook Mall, Pasillo Central, Local 2145, Ciudad de Panamá',
    lat: 8.9720, lng: -79.5560,
    phone: '+507-314-1122',
    email: '',
    bio: 'Óptica en el centro comercial más grande de Panamá. Marcas internacionales de monturas y lentes de sol. Exámenes optométricos en 30 minutos.',
    rating: 4.1, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'ASSA Compañía de Seguros', 'Mapfre Panamá'],
    schedule: [
      { dayOfWeek: 1, startTime: '10:00', endTime: '21:00', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '10:00', endTime: '21:00', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '10:00', endTime: '21:00', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '10:00', endTime: '21:00', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '10:00', endTime: '21:00', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '10:00', endTime: '21:00', slotDuration: 30 },
      { dayOfWeek: 0, startTime: '11:00', endTime: '19:00', slotDuration: 30 },
    ],
    reviews: [],
  },
  {
    name: 'Óptica Vía Argentina',
    specialtySlug: 'optometria',
    address: 'Vía Argentina, El Cangrejo, Ciudad de Panamá',
    lat: 8.9835, lng: -79.5270,
    phone: '+507-269-5544',
    email: '',
    bio: 'Óptica independiente en la zona comercial de El Cangrejo. Servicio personalizado, lentes bifocales y progresivos, adaptación de lentes de contacto tóricos.',
    rating: 4.4, reviewCount: 0, isVerified: true,
    photos: [],
    insuranceNames: ['CSS (Caja de Seguro Social)', 'Internacional de Seguros', 'Assicurazioni Generali'],
    schedule: [
      { dayOfWeek: 1, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 2, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 3, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 4, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 5, startTime: '08:30', endTime: '17:30', slotDuration: 30 },
      { dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDuration: 30 },
    ],
    reviews: [],
  },
];

// ═══════════════════════════════════════════
// GOOGLE PLACES DATA INTERFACE
// ═══════════════════════════════════════════
interface GooglePlaceEntry {
  name: string;
  specialty: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  website?: string;
  googleMapsUrl?: string;
  rating: number;
  reviewCount: number;
  placeId: string;
}

// ═══════════════════════════════════════════
// SLUG GENERATOR
// ═══════════════════════════════════════════
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function generateUniqueSlug(name: string, usedSlugs: Set<string>): string {
  let slug = generateSlug(name);
  if (!usedSlugs.has(slug)) {
    usedSlugs.add(slug);
    return slug;
  }
  let counter = 2;
  while (usedSlugs.has(`${slug}-${counter}`)) {
    counter++;
  }
  const unique = `${slug}-${counter}`;
  usedSlugs.add(unique);
  return unique;
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════
async function main() {
  console.log(`🌱 Seeding PlexusMap database (v4 — ${SEED_MODE} mode)...\n`);

  // Clear (FK order)
  await prisma.appointment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.professionalInsurance.deleteMany();
  await prisma.user.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.insurance.deleteMany();
  await prisma.specialty.deleteMany();

  console.log('  ✓ Cleared existing data');

  // 1. Specialties (shared)
  const specRecords = await Promise.all(
    specialties.map((s) => prisma.specialty.create({ data: s }))
  );
  const specMap = new Map(specRecords.map((s) => [s.slug, s.id]));
  console.log(`  ✓ Created ${specRecords.length} specialties`);

  // 2. Insurances (shared)
  const insRecords = await Promise.all(
    insurances.map((i) => prisma.insurance.create({ data: i }))
  );
  const insMap = new Map(insRecords.map((i) => [i.name, i.id]));
  console.log(`  ✓ Created ${insRecords.length} insurance companies`);

  // 3. Professionals (mode-dependent)
  let totalProfessionals = 0;
  let totalReviews = 0;
  let totalSchedules = 0;

  if (SEED_MODE === 'google-places') {
    // ── GOOGLE PLACES MODE ──
    // Load 464 real professionals from Google Places data
    const dataPath = path.resolve(__dirname, '..', 'scripts', 'google-places-data.json');
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const placesData: GooglePlaceEntry[] = JSON.parse(rawData);
    const usedSlugs = new Set<string>();

    console.log(`  ℹ Loaded ${placesData.length} entries from google-places-data.json`);

    for (const place of placesData) {
      const specialtySlug = place.specialty;
      const specialtyId = specMap.get(specialtySlug);
      if (!specialtyId) {
        console.error(`  ✗ Specialty not found: ${specialtySlug} (${place.name})`);
        continue;
      }

      const slug = generateUniqueSlug(place.name, usedSlugs);
      const isFounder = place.name === 'Clínica Óptica Central';

      await prisma.professional.create({
        data: {
          slug,
          name: place.name,
          specialtyId,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          phone: place.phone || null,
          email: null,
          bio: null,
          rating: place.rating,
          reviewCount: place.reviewCount,
          isVerified: place.rating >= 4.0,
          isClaimed: isFounder,
          photos: [],
        },
      });

      totalProfessionals++;
      if (totalProfessionals % 50 === 0) {
        console.log(`  ... ${totalProfessionals} professionals created`);
      }
    }

    console.log(`  ✓ Created ${totalProfessionals} professionals from Google Places data`);

  } else {
    // ── DEVELOPMENT / PRODUCTION MODE ──
    const profList = SEED_MODE === 'production' ? productionProfessionals : developmentProfessionals;

    for (const prof of profList) {
      const slug = generateSlug(prof.name);
      const specialtyId = specMap.get(prof.specialtySlug);
      if (!specialtyId) {
        console.error(`  ✗ Specialty not found: ${prof.specialtySlug}`);
        continue;
      }

      const created = await prisma.professional.create({
        data: {
          slug,
          name: prof.name,
          specialtyId,
          address: prof.address,
          lat: prof.lat,
          lng: prof.lng,
          phone: prof.phone,
          email: prof.email || null,
          bio: prof.bio,
          rating: prof.rating,
          reviewCount: prof.reviewCount,
          isVerified: prof.isVerified,
          isClaimed: prof.isClaimed || false,
          photos: prof.photos,
          insurances: {
            create: prof.insuranceNames
              .filter((name) => insMap.has(name))
              .map((name) => ({ insuranceId: insMap.get(name)! })),
          },
          schedules: {
            create: prof.schedule.map((s) => ({
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              slotDuration: s.slotDuration,
            })),
          },
          reviews: {
            create: prof.reviews.map((r) => ({
              rating: r.rating,
              comment: r.comment,
              patientName: r.patientName,
              patientPhone: r.patientPhone,
              source: 'PLEXUSMAP' as const,
            })),
          },
        },
      });

      totalProfessionals++;
      totalReviews += prof.reviews.length;
      totalSchedules += prof.schedule.length;
      console.log(`  ✓ ${created.name} → ${prof.specialtySlug}${prof.isClaimed ? ' (CLAIMED)' : ''}`);
    }
  }

  // 4. Users
  // Admin user (all modes)
  await prisma.user.create({
    data: {
      email: 'admin@plexusmap.com',
      password: hashSync('admin123', 10),
      name: 'Admin PlexusMap',
      role: 'ADMIN',
    },
  });

  if (SEED_MODE === 'production' || SEED_MODE === 'google-places') {
    // Founder user — linked to Clínica Óptica Central
    const founder = await prisma.professional.findFirst({
      where: { slug: FOUNDER_SLUG },
    });
    if (founder) {
      await prisma.user.create({
        data: {
          email: 'fundador@plexusmap.com',
          password: hashSync('founder2026!', 10),
          name: 'Clínica Óptica Central',
          role: 'PROFESSIONAL',
          professionalId: founder.id,
        },
      });
    }
    console.log('  ✓ Created users (admin + founder professional)');
  } else {
    // Development mode — demo professional
    const gabriela = await prisma.professional.findFirst({
      where: { slug: 'dra-gabriela-ponce' },
    });
    if (gabriela) {
      await prisma.user.create({
        data: {
          email: 'gponce@plexusmap.com',
          password: hashSync('demo123', 10),
          name: 'Dra. Gabriela Ponce',
          role: 'PROFESSIONAL',
          professionalId: gabriela.id,
        },
      });
      await prisma.professional.update({
        where: { id: gabriela.id },
        data: { isClaimed: true },
      });
    }
    console.log('  ✓ Created users (admin + demo professional)');
  }

  console.log(`\n✅ Seed complete! (${SEED_MODE} mode)`);
  console.log(`   ${specialties.length} specialties`);
  console.log(`   ${totalProfessionals} professionals`);
  console.log(`   ${insRecords.length} insurance companies`);
  console.log(`   ${totalSchedules} schedule slots`);
  console.log(`   ${totalReviews} reviews`);
  console.log(`   2 users (admin + ${SEED_MODE === 'development' ? 'demo' : 'founder'})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
