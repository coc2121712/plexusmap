/**
 * Shared geocoding utilities for insurance import pipelines.
 */

// Default coordinates: Panama City center
export const DEFAULT_LAT = 8.9824;
export const DEFAULT_LNG = -79.5199;

// Province approximate centers
export const PROVINCE_COORDS: Record<string, { lat: number; lng: number }> = {
  'PANAMÁ': { lat: 8.9824, lng: -79.5199 },
  'CHIRIQUÍ': { lat: 8.4279, lng: -82.4312 },
  'COCLÉ': { lat: 8.5208, lng: -80.3626 },
  'COLÓN': { lat: 9.3547, lng: -79.9014 },
  'HERRERA': { lat: 7.9716, lng: -80.4295 },
  'LOS SANTOS': { lat: 7.7280, lng: -80.4162 },
  'VERAGUAS': { lat: 8.1125, lng: -81.0844 },
  'BOCAS DEL TORO': { lat: 9.3405, lng: -82.2420 },
  'DARIÉN': { lat: 8.0128, lng: -77.8413 },
  'PANAMÁ OESTE': { lat: 8.9113, lng: -79.6482 },
};

// Known hospital/clinic coordinates — VERIFIED via Google Maps / latitude.to / mapcarta / mapsus
export const KNOWN_LOCATIONS: Record<string, { lat: number; lng: number; address: string }> = {
  // ── Pacífica Salud / Punta Pacífica (verified: mapcarta W146820184) ──
  'PACÍFICA SALUD': { lat: 8.9820, lng: -79.5101, address: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá' },
  'HOSPITAL PUNTA PACÍFICA': { lat: 8.9820, lng: -79.5101, address: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá' },
  'HOSPITAL PUNTA PACIFICA': { lat: 8.9820, lng: -79.5101, address: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá' },
  'PUNTA PACÍFICA': { lat: 8.9820, lng: -79.5101, address: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá' },
  'PUNTA PACIFICA': { lat: 8.9820, lng: -79.5101, address: 'Hospital Pacífica Salud, Punta Pacífica, Ciudad de Panamá' },
  // ── Hospital Nacional (verified: latitude.to 175587) ──
  'HOSPITAL NACIONAL': { lat: 8.9706, lng: -79.5336, address: 'Hospital Nacional, Avenida Cuba, Bella Vista, Ciudad de Panamá' },
  // ── San Fernando (verified: mapcarta W1287160365, Pueblo Nuevo) ──
  'CLÍNICA HOSPITAL SAN FERNANDO': { lat: 9.0031, lng: -79.5166, address: 'Clínica Hospital San Fernando, Carrasquilla, Ciudad de Panamá' },
  // ── Hospital Santa Fe (verified: mapcarta W382719450, Calidonia) ──
  'HOSPITAL SANTA FE': { lat: 8.9759, lng: -79.5384, address: 'Hospital Santa Fe, Calidonia, Ciudad de Panamá' },
  // ── Centro Médico Paitilla (verified: vymaps 1883400148447957) ──
  'CONSULTORIOS MÉDICOS PAITILLA': { lat: 8.9780, lng: -79.5179, address: 'Consultorios Médicos Paitilla, Calle 53 Este, Ciudad de Panamá' },
  'CENTRO MÉDICO PAITILLA': { lat: 8.9780, lng: -79.5179, address: 'Centro Médico Paitilla, Calle 53 Este, Paitilla, Ciudad de Panamá' },
  'HOSPITAL PAITILLA': { lat: 8.9780, lng: -79.5179, address: 'Hospital Paitilla, Calle 53, Paitilla, Ciudad de Panamá' },
  // ── Hospital Brisas (verified: mapsus.net 31681, Brisas del Golf) ──
  'HOSPITAL BRISAS': { lat: 9.0695, lng: -79.4598, address: 'Hospital Brisas, Brisas del Golf, Ciudad de Panamá' },
  // ── Others (approximate — need verification) ──
  'THE PANAMA CLINIC': { lat: 8.9944, lng: -79.5103, address: 'The Panama Clinic, Calle Ramón H. Jurado, Ciudad de Panamá' },
  'CONSULTORIOS MÉDICOS ROYAL CENTER': { lat: 8.9840, lng: -79.5176, address: 'Consultorios Médicos Royal Center, Calle 53, Marbella' },
  'CENTRO MÉDICO NACIONAL': { lat: 8.9820, lng: -79.5310, address: 'Centro Médico Nacional, Avenida Cuba, Ciudad de Panamá' },
  'CONSULTORIOS SAN JUDAS TADEO': { lat: 8.9870, lng: -79.5135, address: 'Consultorios San Judas Tadeo, Villa Lucre, Ciudad de Panamá' },
  'HOSPITAL CHIRIQUÍ': { lat: 8.4312, lng: -82.4310, address: 'Hospital Chiriquí, David, Chiriquí' },
  'CENTRO MÉDICO MAE LEWIS': { lat: 8.4340, lng: -82.4260, address: 'Centro Médico Mae Lewis, David, Chiriquí' },
  'HOSPITAL CUATRO ALTOS': { lat: 9.3545, lng: -79.8980, address: 'Hospital Cuatro Altos, Colón' },
  'CENTRO MÉDICO DEL CARIBE': { lat: 9.3560, lng: -79.9005, address: 'Centro Médico del Caribe, Colón' },
  'HOSPITAL MINIMED': { lat: 8.9790, lng: -79.5250, address: 'Hospital Minimed, Vía Ricardo J. Alfaro, Ciudad de Panamá' },
  'CLÍNICA BOYD': { lat: 8.9830, lng: -79.5230, address: 'Clínica Boyd, Calle 50 y Ave. Venezuela, Ciudad de Panamá' },
  'HOSPITAL PANAMERICANO': { lat: 9.0050, lng: -79.5220, address: 'Hospital Panamericano, Juan Díaz, Ciudad de Panamá' },
  'CONSULTORIOS AMÉRICA': { lat: 8.9810, lng: -79.5280, address: 'Consultorios América, Avenida Cuba, Ciudad de Panamá' },
  'CLÍNICA HOSPITAL ZARATÍ': { lat: 8.5125, lng: -80.1620, address: 'Clínica Hospital Zaratí, Penonomé, Coclé' },
  'SERVICIOS MÉDICOS AGUADULCE': { lat: 8.2445, lng: -80.5440, address: 'Servicios Médicos Aguadulce, Coclé' },
  // ASSA-specific locations
  'CLÍNICA HOSPITAL JESÚS NAZARENO': { lat: 8.1013, lng: -80.9835, address: 'Clínica Hospital Jesús Nazareno, Santiago, Veraguas' },
  'HOSPITAL SAN JUAN DE DIOS': { lat: 8.1010, lng: -80.9830, address: 'Hospital San Juan de Dios, Santiago, Veraguas' },
  'CLÍNICA HOSPITAL CATTÁN': { lat: 8.4330, lng: -82.4280, address: 'Clínica Hospital Cattán, David, Chiriquí' },
  'SERVICIOS MÉDICOS DE AZUERO': { lat: 7.9690, lng: -80.4300, address: 'Servicios Médicos de Azuero, Chitré, Herrera' },
  'CENTRO MÉDICO SAN JUAN BAUTISTA': { lat: 7.9720, lng: -80.4270, address: 'Centro Médico San Juan Bautista, Chitré, Herrera' },
};

const geocodeCache = new Map<string, { lat: number; lng: number }>();
let geocodeCount = 0;

/**
 * Try to match an address to a known hospital/clinic.
 * Returns coords if matched, null otherwise.
 */
export function matchKnownLocation(address: string): { lat: number; lng: number; address: string } | null {
  const upper = address.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const [key, loc] of Object.entries(KNOWN_LOCATIONS)) {
    const normKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (upper.includes(normKey) || normKey.includes(upper)) {
      return loc;
    }
  }

  // Pattern matching
  const patterns: [RegExp, string][] = [
    [/PACIFICA\s*SALUD|PAC[IÍ]FICA\s*SALUD/i, 'PACÍFICA SALUD'],
    [/PUNTA\s*PAC[IÍ]FICA/i, 'PUNTA PACÍFICA'],
    [/SAN\s*FERNANDO/i, 'CLÍNICA HOSPITAL SAN FERNANDO'],
    [/HOSPITAL\s*NACIONAL/i, 'HOSPITAL NACIONAL'],
    [/PAITILLA/i, 'CONSULTORIOS MÉDICOS PAITILLA'],
    [/PANAMA\s*CLINIC/i, 'THE PANAMA CLINIC'],
    [/ROYAL\s*CENTER/i, 'CONSULTORIOS MÉDICOS ROYAL CENTER'],
    [/SANTA\s*F[EÉ]/i, 'HOSPITAL SANTA FE'],
    [/CUATRO\s*ALTOS/i, 'HOSPITAL CUATRO ALTOS'],
    [/SAN\s*JUDAS/i, 'CONSULTORIOS SAN JUDAS TADEO'],
    [/BOYD/i, 'CLÍNICA BOYD'],
    [/BRISAS/i, 'HOSPITAL BRISAS'],
    [/MINIMED/i, 'HOSPITAL MINIMED'],
    [/DEL\s*CARIBE/i, 'CENTRO MÉDICO DEL CARIBE'],
    [/MAE\s*LEWIS/i, 'CENTRO MÉDICO MAE LEWIS'],
    [/JESUS\s*NAZARENO|JESÚS\s*NAZARENO/i, 'CLÍNICA HOSPITAL JESÚS NAZARENO'],
    [/CATTAN|CATTÁN/i, 'CLÍNICA HOSPITAL CATTÁN'],
    [/ZARATI|ZARATÍ/i, 'CLÍNICA HOSPITAL ZARATÍ'],
    [/CONSULTORIOS?\s*AM[EÉ]RICA/i, 'CONSULTORIOS AMÉRICA'],
    [/CENTRO\s*M[EÉ]DICO\s*NACIONAL/i, 'CENTRO MÉDICO NACIONAL'],
    [/CONSULTORIOS?\s*NACIONALES?/i, 'HOSPITAL NACIONAL'],
  ];

  for (const [regex, locKey] of patterns) {
    if (regex.test(address)) {
      return KNOWN_LOCATIONS[locKey] || null;
    }
  }

  return null;
}

/**
 * Geocode an address using Google Geocoding API.
 * Falls back to province center if geocoding fails.
 */
export async function geocode(
  address: string,
  province: string,
  apiKey: string
): Promise<{ lat: number; lng: number; geocoded: boolean }> {
  // 1. Try known location match
  const known = matchKnownLocation(address);
  if (known) {
    return { lat: known.lat, lng: known.lng, geocoded: true };
  }

  // 2. Try Google Geocoding API
  if (apiKey && address && address !== 'No especificada') {
    const cacheKey = `${address}|${province}`;
    if (geocodeCache.has(cacheKey)) {
      return { ...geocodeCache.get(cacheKey)!, geocoded: true };
    }

    geocodeCount++;
    if (geocodeCount % 10 === 0) {
      await new Promise(r => setTimeout(r, 1100));
    }

    try {
      const query = `${address}, ${province}, Panamá`;
      const params = new URLSearchParams({
        address: query,
        key: apiKey,
        region: 'pa',
        language: 'es',
      });

      const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
      const data = await res.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        const loc = data.results[0].geometry.location;
        geocodeCache.set(cacheKey, loc);
        return { lat: loc.lat, lng: loc.lng, geocoded: true };
      }
    } catch {
      // fallthrough
    }
  }

  // 3. Fallback to province center with random offset
  const coords = PROVINCE_COORDS[province.toUpperCase()] || { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
  return {
    lat: coords.lat + (Math.random() - 0.5) * 0.02,
    lng: coords.lng + (Math.random() - 0.5) * 0.02,
    geocoded: false,
  };
}
