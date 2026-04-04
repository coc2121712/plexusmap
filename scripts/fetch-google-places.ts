/**
 * PlexusMap — Fetch Real Healthcare Professionals from Google Places API (Legacy)
 *
 * Usage:
 *   npx tsx scripts/fetch-google-places.ts
 *
 * Requires:
 *   - GOOGLE_MAPS_API_KEY env var (key with NO referrer restriction)
 *   - Places API enabled in Google Cloud Console
 */

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

if (!API_KEY) {
  console.error('ERROR: Set GOOGLE_MAPS_API_KEY environment variable');
  process.exit(1);
}

// ═══════════════════════════════════════════
// Specialty search queries for Panama City
// ═══════════════════════════════════════════
const SPECIALTY_SEARCHES: { specialty: string; queries: string[] }[] = [
  {
    specialty: 'optometria',
    queries: ['óptica en Ciudad de Panamá', 'optometrista Panamá'],
  },
  {
    specialty: 'odontologia-general',
    queries: ['dentista Ciudad de Panamá', 'clínica dental Panamá'],
  },
  {
    specialty: 'dermatologia',
    queries: ['dermatólogo Ciudad de Panamá'],
  },
  {
    specialty: 'oftalmologia',
    queries: ['oftalmólogo Ciudad de Panamá', 'clínica oftalmológica Panamá'],
  },
  {
    specialty: 'pediatria',
    queries: ['pediatra Ciudad de Panamá'],
  },
  {
    specialty: 'cardiologia',
    queries: ['cardiólogo Ciudad de Panamá'],
  },
  {
    specialty: 'ginecologia',
    queries: ['ginecólogo Ciudad de Panamá'],
  },
  {
    specialty: 'psicologia',
    queries: ['psicólogo Ciudad de Panamá'],
  },
  {
    specialty: 'nutricion',
    queries: ['nutricionista Ciudad de Panamá'],
  },
  {
    specialty: 'fisioterapia',
    queries: ['fisioterapia Ciudad de Panamá'],
  },
  {
    specialty: 'ortopedia',
    queries: ['ortopedista Ciudad de Panamá', 'traumatólogo Panamá'],
  },
  {
    specialty: 'medicina-general',
    queries: ['clínica médica Ciudad de Panamá', 'médico general Panamá'],
  },
  {
    specialty: 'neurologia',
    queries: ['neurólogo Ciudad de Panamá'],
  },
];

// Panama City bounding box
const PANAMA_BOUNDS = {
  south: 8.90,
  north: 9.12,
  west: -79.62,
  east: -79.40,
};

interface PlaceResult {
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string; // Google Maps URL
  types?: string[];
  place_id: string;
  business_status?: string;
}

interface FetchedProfessional {
  name: string;
  specialty: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  rating: number;
  reviewCount: number;
  placeId: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function isInPanama(lat: number, lng: number): boolean {
  return (
    lat >= PANAMA_BOUNDS.south &&
    lat <= PANAMA_BOUNDS.north &&
    lng >= PANAMA_BOUNDS.west &&
    lng <= PANAMA_BOUNDS.east
  );
}

async function textSearch(query: string, pageToken?: string): Promise<{ results: PlaceResult[]; nextPageToken?: string }> {
  const params = new URLSearchParams({
    query,
    key: API_KEY,
    language: 'es',
    region: 'pa',
    // Bias to Panama City
    location: '8.9824,-79.5199',
    radius: '15000',
  });
  if (pageToken) params.set('pagetoken', pageToken);

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    console.error(`  API Error (${data.status}): ${data.error_message || 'unknown'}`);
    return { results: [] };
  }

  return {
    results: data.results || [],
    nextPageToken: data.next_page_token,
  };
}

async function getPlaceDetails(placeId: string): Promise<Partial<PlaceResult>> {
  const params = new URLSearchParams({
    place_id: placeId,
    key: API_KEY,
    language: 'es',
    fields: 'formatted_phone_number,international_phone_number,website,url',
  });

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK') return {};
  return data.result || {};
}

async function fetchAllSpecialties(): Promise<FetchedProfessional[]> {
  const allResults: FetchedProfessional[] = [];
  const seenNames = new Set<string>();

  for (const { specialty, queries } of SPECIALTY_SEARCHES) {
    console.log(`\n--- Searching: ${specialty} ---`);

    for (const query of queries) {
      console.log(`  Query: "${query}"`);

      // Rate limit
      await new Promise((r) => setTimeout(r, 500));

      // First page
      const { results, nextPageToken } = await textSearch(query);
      console.log(`  Page 1: ${results.length} results`);

      let allPageResults = [...results];

      // Get page 2 if available (max 40 total from text search)
      if (nextPageToken) {
        // Google requires ~2s delay before using next_page_token
        await new Promise((r) => setTimeout(r, 2500));
        const page2 = await textSearch(query, nextPageToken);
        console.log(`  Page 2: ${page2.results.length} results`);
        allPageResults.push(...page2.results);
      }

      for (const place of allPageResults) {
        const name = place.name;
        if (!name || seenNames.has(name.toLowerCase())) continue;
        if (place.business_status === 'CLOSED_PERMANENTLY') continue;

        const lat = place.geometry?.location?.lat;
        const lng = place.geometry?.location?.lng;
        if (!lat || !lng || !isInPanama(lat, lng)) continue;

        seenNames.add(name.toLowerCase());

        // Get phone details (rate limited)
        await new Promise((r) => setTimeout(r, 200));
        const details = await getPlaceDetails(place.place_id);

        allResults.push({
          name,
          specialty,
          address: place.formatted_address || '',
          lat,
          lng,
          phone: details.formatted_phone_number || details.international_phone_number || null,
          website: details.website || null,
          googleMapsUrl: details.url || null,
          rating: place.rating || 0,
          reviewCount: place.user_ratings_total || 0,
          placeId: place.place_id,
        });

        process.stdout.write(`    + ${name} (${place.rating || 'N/R'})\n`);
      }
    }

    const count = allResults.filter((p) => p.specialty === specialty).length;
    console.log(`  Total ${specialty}: ${count} unique`);
  }

  return allResults;
}

function generateSeedCode(professionals: FetchedProfessional[]): string {
  const grouped = new Map<string, FetchedProfessional[]>();
  for (const p of professionals) {
    const list = grouped.get(p.specialty) || [];
    list.push(p);
    grouped.set(p.specialty, list);
  }

  let code = '// ═══════════════════════════════════════════\n';
  code += '// Auto-generated from Google Places API\n';
  code += `// Generated: ${new Date().toISOString()}\n`;
  code += `// Total: ${professionals.length} professionals across ${grouped.size} specialties\n`;
  code += '// ═══════════════════════════════════════════\n\n';
  code += 'export const googlePlacesProfessionals = [\n';

  for (const [specialty, pros] of grouped) {
    code += `\n  // ── ${specialty} (${pros.length}) ──\n`;
    for (const p of pros) {
      code += `  {\n`;
      code += `    name: ${JSON.stringify(p.name)},\n`;
      code += `    slug: ${JSON.stringify(slugify(p.name))},\n`;
      code += `    specialty: ${JSON.stringify(specialty)},\n`;
      code += `    address: ${JSON.stringify(p.address)},\n`;
      code += `    lat: ${p.lat},\n`;
      code += `    lng: ${p.lng},\n`;
      code += `    phone: ${p.phone ? JSON.stringify(p.phone) : 'null'},\n`;
      code += `    rating: ${p.rating || 4.0},\n`;
      code += `    reviewCount: ${p.reviewCount},\n`;
      code += `  },\n`;
    }
  }

  code += '];\n';
  return code;
}

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — Google Places Data Fetcher');
  console.log('============================================');
  console.log(`API Key: ${API_KEY.substring(0, 15)}...`);
  console.log(`Searching ${SPECIALTY_SEARCHES.length} specialties\n`);

  const professionals = await fetchAllSpecialties();

  console.log('\n============================================');
  console.log(`Total unique professionals: ${professionals.length}`);

  const grouped = new Map<string, number>();
  for (const p of professionals) {
    grouped.set(p.specialty, (grouped.get(p.specialty) || 0) + 1);
  }
  for (const [spec, count] of grouped) {
    console.log(`  ${spec}: ${count}`);
  }

  const fs = await import('fs');
  const path = await import('path');

  const rawPath = path.join(process.cwd(), 'scripts', 'google-places-data.json');
  fs.writeFileSync(rawPath, JSON.stringify(professionals, null, 2));
  console.log(`\nRaw data saved to: ${rawPath}`);

  const seedCode = generateSeedCode(professionals);
  const seedPath = path.join(process.cwd(), 'scripts', 'google-places-seed.ts');
  fs.writeFileSync(seedPath, seedCode);
  console.log(`Seed code saved to: ${seedPath}`);

  console.log('\nDone! Review the data and merge into prisma/seed.ts');
}

main().catch(console.error);
