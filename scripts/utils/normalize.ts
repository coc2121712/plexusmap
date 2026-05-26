/**
 * Shared name normalization and fuzzy matching utilities
 * Used by cross-reference and insert scripts for all insurance pipelines.
 */

import { distance } from 'fastest-levenshtein';

/**
 * Normalize a name for comparison:
 * - Remove accents, lowercase, trim
 * - Remove titles (DR., DRA., LIC., etc.)
 * - Remove punctuation
 * - Collapse whitespace
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(dr|dra|lic|lcdo|lcda|ing|prof|sra|sr)\b\.?/gi, '')
    .replace(/[,.\-()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Levenshtein-based similarity (0-1)
 */
export function similarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (na === nb) return 1.0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  const dist = distance(na, nb);
  return 1 - dist / maxLen;
}

/**
 * Token-based matching: check if most words in the shorter name
 * appear in the longer name (handles reordered names)
 */
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = normalizeName(a).split(' ').filter(t => t.length > 1);
  const tokensB = normalizeName(b).split(' ').filter(t => t.length > 1);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const [shorter, longer] = tokensA.length <= tokensB.length
    ? [tokensA, tokensB]
    : [tokensB, tokensA];

  let matchedTokens = 0;
  for (const token of shorter) {
    if (longer.some(lt => {
      if (lt === token) return true;
      if (lt.length > 2 && token.length > 2) {
        const d = distance(lt, token);
        return d <= 1;
      }
      return false;
    })) {
      matchedTokens++;
    }
  }

  return matchedTokens / shorter.length;
}

/**
 * Combined similarity score (max of Levenshtein and token-based)
 */
export function combinedSimilarity(a: string, b: string): number {
  return Math.max(similarity(a, b), tokenSimilarity(a, b));
}

/**
 * Generate a URL-safe slug from a name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

// Map insurance specialty names to PlexusMap specialty slugs
export const SPECIALTY_MAP: Record<string, string> = {
  'ALERGOLOGÍA': 'medicina-general',
  'ALGIOLOGÍA': 'medicina-general',
  'ANESTESIOLOGÍA': 'medicina-general',
  'CARDIOLOGÍA': 'cardiologia',
  'CIRUGÍA CARDIOVASCULAR': 'cardiologia',
  'CIRUGÍA DE MANO': 'ortopedia',
  'CIRUGÍA GENERAL': 'medicina-general',
  'CIRUGÍA MAXILOFACIAL': 'odontologia-general',
  'CIRUGÍA ONCOLÓGICA': 'medicina-general',
  'CIRUGÍA PEDIÁTRICA': 'pediatria',
  'CIRUGÍA PLÁSTICA': 'dermatologia',
  'CIRUGÍA VASCULAR': 'cardiologia',
  'DERMATOLOGÍA': 'dermatologia',
  'ENDOCRINOLOGÍA': 'medicina-general',
  'ENDODONCIA': 'odontologia-general',
  'FISIATRÍA': 'fisioterapia',
  'FISIOTERAPIA': 'fisioterapia',
  'GASTROENTEROLOGÍA': 'medicina-general',
  'GERIATRÍA': 'medicina-general',
  'GINECOLOGÍA': 'ginecologia',
  'GINECOLOGÍA Y OBSTETRICIA': 'ginecologia',
  'HEMATOLOGÍA': 'medicina-general',
  'INFECTOLOGÍA': 'medicina-general',
  'MEDICINA FAMILIAR': 'medicina-general',
  'MEDICINA GENERAL': 'medicina-general',
  'MEDICINA INTERNA': 'medicina-general',
  'MEDICINA FÍSICA': 'fisioterapia',
  'NEFROLOGÍA': 'medicina-general',
  'NEONATOLOGÍA': 'pediatria',
  'NEUMOLOGÍA': 'medicina-general',
  'NEUROCIRUGÍA': 'neurologia',
  'NEUROLOGÍA': 'neurologia',
  'NUTRICIÓN': 'nutricion',
  'NUTRIOLOGÍA': 'nutricion',
  'ODONTOLOGÍA': 'odontologia-general',
  'ODONTOLOGÍA GENERAL': 'odontologia-general',
  'OFTALMOLOGÍA': 'oftalmologia',
  'ONCOLOGÍA': 'medicina-general',
  'OPTOMETRÍA': 'optometria',
  'ORTODONCIA': 'odontologia-general',
  'ORTOPEDIA': 'ortopedia',
  'ORTOPEDIA Y TRAUMATOLOGÍA': 'ortopedia',
  'OTORRINOLARINGOLOGÍA': 'medicina-general',
  'PATOLOGÍA': 'medicina-general',
  'PEDIATRÍA': 'pediatria',
  'PERIODONCIA': 'odontologia-general',
  'PROCTOLOGÍA': 'medicina-general',
  'PSICOLOGÍA': 'psicologia',
  'PSIQUIATRÍA': 'psicologia',
  'RADIOLOGÍA': 'medicina-general',
  'RADIOLOGÍA INTERVENCIONISTA': 'medicina-general',
  'REUMATOLOGÍA': 'medicina-general',
  'TRAUMATOLOGÍA': 'ortopedia',
  'UROLOGÍA': 'medicina-general',
  // ASSA specific
  'CLÍNICA PRIMARIA': 'medicina-general',
  'HOSPITAL': 'medicina-general',
  'DENTAL': 'odontologia-general',
  'RADIOLOGÍA E IMÁGENES': 'medicina-general',
  'CIRUGÍA AMBULATORIA': 'medicina-general',
  'HEMODIALISIS': 'medicina-general',
};

export function findBestSpecialtySlug(
  rawSpecialty: string,
  specialties: { slug: string; name: string }[]
): string {
  const upper = rawSpecialty.toUpperCase().trim();

  if (SPECIALTY_MAP[upper]) return SPECIALTY_MAP[upper];

  // Fuzzy match against map keys
  let bestSlug = 'medicina-general';
  let bestDist = Infinity;

  for (const [key, slug] of Object.entries(SPECIALTY_MAP)) {
    const d = distance(upper, key);
    if (d < bestDist) {
      bestDist = d;
      bestSlug = slug;
    }
  }

  for (const spec of specialties) {
    const d = distance(
      upper.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      spec.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    );
    if (d < bestDist) {
      bestDist = d;
      bestSlug = spec.slug;
    }
  }

  return bestSlug;
}
