/**
 * PlexusMap — Import PALIG (Pan-American Life) Medical Network
 *
 * Uses PALIG's GraphQL API (Apollo Server on AWS Lambda) to fetch
 * provider data for Panama. The API sits in front of a REST API at
 * api.paligdirect.com/ProviderSearch/api/v2/
 *
 * Key discovery: countryCode for Panama is "1" (not "PA").
 * The API returns max 20 results per page.
 *
 * Data is rich: includes lat/lng, address, phone, specialty, network.
 *
 * Usage: npx tsx scripts/import-palig.ts
 * Output: scripts/output/palig-raw.json
 */

import * as fs from 'fs';
import * as path from 'path';

const GRAPHQL_URL = 'https://x19mgfnrh7.execute-api.us-east-1.amazonaws.com/';
const COUNTRY_CODE = '1'; // Panama's internal code in PALIG's system
const PAGE_SIZE = 20; // API max
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'palig-raw.json');

interface PaligEntry {
  name: string;
  specialty: string;
  type: string;
  location: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  mobile: string;
  email: string;
  website: string;
  lat: number | null;
  lng: number | null;
  network: string;
  province: string;
  source: string;
}

// ═══════════════════════════════════════════
// State → Province mapping
// ═══════════════════════════════════════════
const STATE_TO_PROVINCE: Record<string, string> = {
  'PANAMA': 'PANAMÁ',
  'COLON': 'COLÓN',
  'CHIRIQUI': 'CHIRIQUÍ',
  'HERRERA': 'HERRERA',
  'LOS SANTOS': 'LOS SANTOS',
  'VERAGUAS': 'VERAGUAS',
  'COCLE': 'COCLÉ',
  'BOCAS DEL TORO': 'BOCAS DEL TORO',
  'DARIEN': 'DARIÉN',
  'PANAMA OESTE': 'PANAMÁ OESTE',
  'COMARCA GUNA YALA': 'PANAMÁ',
  'COMARCA NGÄBE-BUGLÉ': 'CHIRIQUÍ',
};

// ═══════════════════════════════════════════
// GraphQL query
// ═══════════════════════════════════════════
const SEARCH_QUERY = `
  query GetProviderSearchResults(
    $countryCode: String!,
    $term: String!,
    $page: String,
    $limit: String
  ) {
    searchResources(
      countryCode: $countryCode,
      term: $term,
      page: $page,
      limit: $limit
    ) {
      total
      entry {
        resource {
          code { text }
          location { position { latitude longitude } }
          organization { name }
          practitioner {
            address { city country line state text }
            experience
            network
          }
          services { text }
          specialty { text }
          telecom { system value }
        }
      }
    }
  }
`;

async function fetchPage(term: string, page: number): Promise<{ total: number; entries: any[] }> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'es',
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: {
        countryCode: COUNTRY_CODE,
        term,
        page: String(page),
        limit: String(PAGE_SIZE),
      },
    }),
  });

  const data = await res.json();

  if (data.errors) {
    const msg = data.errors[0]?.message || 'Unknown error';
    // Some terms cause 400 — skip them
    if (msg.includes('400')) {
      return { total: 0, entries: [] };
    }
    throw new Error(`GraphQL error: ${msg}`);
  }

  const sr = data.data?.searchResources;
  return {
    total: sr?.total || 0,
    entries: sr?.entry || [],
  };
}

function parseResource(resource: any, term: string): PaligEntry | null {
  const org = resource.organization?.name;
  if (!org) return null;

  const code = resource.code?.[0]?.text || '';
  const specialties = (resource.specialty || []).map((s: any) => s.text).filter(Boolean);
  const addr = resource.practitioner?.address?.[0] || {};
  const telecoms = resource.telecom || [];
  const positions = resource.location || [];

  const phone = telecoms.find((t: any) => t.system === 'phone')?.value || '';
  const mobile = telecoms.find((t: any) => t.system === 'mobile')?.value || '';
  const email = telecoms.find((t: any) => t.system === 'email')?.value || '';
  const website = telecoms.find((t: any) => t.system === 'website')?.value || '';

  const pos = positions[0]?.position;
  const lat = pos?.latitude || null;
  const lng = pos?.longitude || null;

  const state = (addr.state || '').toUpperCase().replace(/[ÁÉÍÓÚáéíóú]/g, (c: string) => {
    const map: Record<string, string> = { 'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U', 'á': 'A', 'é': 'E', 'í': 'I', 'ó': 'O', 'ú': 'U' };
    return map[c] || c;
  });

  const province = STATE_TO_PROVINCE[state] || 'PANAMÁ';

  return {
    name: titleCase(org),
    specialty: specialties.join(', ') || code || 'MEDICINA GENERAL',
    type: code || 'Médico',
    location: (addr.line || '').replace(/·/g, ',').trim(),
    address: (addr.text || '').replace(/·/g, ',').trim(),
    city: titleCase(addr.city || ''),
    state: titleCase(addr.state || ''),
    phone: formatPhone(phone),
    mobile: formatPhone(mobile),
    email,
    website,
    lat,
    lng,
    network: resource.practitioner?.network || '',
    province,
    source: `graphql-${term}`,
  };
}

function titleCase(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .split(' ')
    .map(w => {
      if (['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'en'].includes(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(' ')
    .replace(/\bS\.a\./gi, 'S.A.');
}

function formatPhone(raw: string): string {
  if (!raw) return '';
  // Add dash to 7-digit Panama numbers
  const clean = raw.replace(/[^\d]/g, '');
  if (clean.length === 7) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  if (clean.length === 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  }
  return raw;
}

async function fetchAllForTerm(term: string): Promise<PaligEntry[]> {
  const entries: PaligEntry[] = [];

  // First page to get total
  const first = await fetchPage(term, 1);
  if (first.total === 0) {
    console.log(`  term="${term}": 0 results`);
    return [];
  }

  const totalPages = Math.ceil(first.total / PAGE_SIZE);
  console.log(`  term="${term}": ${first.total} results (${totalPages} pages)`);

  // Parse first page
  for (const entry of first.entries) {
    const parsed = parseResource(entry.resource, term);
    if (parsed) entries.push(parsed);
  }

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    try {
      const result = await fetchPage(term, page);
      for (const entry of result.entries) {
        const parsed = parseResource(entry.resource, term);
        if (parsed) entries.push(parsed);
      }

      // Rate limiting: small delay every 5 pages
      if (page % 5 === 0) {
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err) {
      console.warn(`  [WARN] Page ${page} failed for term="${term}": ${err}`);
    }
  }

  return entries;
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════

async function main() {
  console.log('============================================');
  console.log('  PlexusMap — PALIG Network Importer');
  console.log('============================================\n');

  // Search terms that cover different provider types
  // "medico" catches 1863 (doctors + most facilities since they have "médico" in descriptions)
  // The others catch facilities not matched by "medico"
  const SEARCH_TERMS = [
    'medico',      // ~1863 (doctors + most results)
    'hospital',    // ~23 (hospitals & clinics)
    'laboratorio', // ~63 (laboratories)
    'centro',      // ~93 (medical centers)
    'farmacia',    // ~25 (pharmacies)
    'imagen',      // ~20 (imaging centers)
    'salud',       // ~33 (health services)
  ];

  console.log('Fetching providers from PALIG GraphQL API...\n');

  const allEntries: PaligEntry[] = [];

  for (const term of SEARCH_TERMS) {
    const entries = await fetchAllForTerm(term);
    allEntries.push(...entries);
    // Brief pause between terms
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\nTotal fetched (with duplicates): ${allEntries.length}`);

  // Deduplicate by normalized name + city
  const dedupMap = new Map<string, PaligEntry>();
  for (const entry of allEntries) {
    const key = `${entry.name.toLowerCase().trim()}|${entry.city.toLowerCase().trim()}`;
    if (!dedupMap.has(key)) {
      dedupMap.set(key, entry);
    } else {
      // Keep the one with more data (lat/lng, specialty)
      const existing = dedupMap.get(key)!;
      if (!existing.lat && entry.lat) {
        dedupMap.set(key, entry);
      }
      if (!existing.specialty && entry.specialty) {
        dedupMap.set(key, { ...existing, specialty: entry.specialty });
      }
    }
  }

  const finalEntries = [...dedupMap.values()];
  const dupeCount = allEntries.length - finalEntries.length;

  // Stats
  const typeCounts = new Map<string, number>();
  const provinceCounts = new Map<string, number>();
  const networkCounts = new Map<string, number>();
  let withCoords = 0;

  for (const e of finalEntries) {
    typeCounts.set(e.type, (typeCounts.get(e.type) || 0) + 1);
    provinceCounts.set(e.province, (provinceCounts.get(e.province) || 0) + 1);
    networkCounts.set(e.network, (networkCounts.get(e.network) || 0) + 1);
    if (e.lat && e.lng) withCoords++;
  }

  // Save
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalEntries, null, 2));

  console.log('\n============================================');
  console.log(`Total extracted: ${finalEntries.length} (removed ${dupeCount} dupes)`);
  console.log(`With coordinates: ${withCoords} (${Math.round(withCoords / finalEntries.length * 100)}%)`);

  console.log(`\nBy type:`);
  for (const [type, count] of [...typeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  console.log(`\nBy province:`);
  for (const [prov, count] of [...provinceCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${prov}: ${count}`);
  }

  console.log(`\nBy network:`);
  for (const [net, count] of [...networkCounts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${net}: ${count}`);
  }

  console.log(`\nSample entries (first 5):`);
  for (const e of finalEntries.slice(0, 5)) {
    console.log(`  ${e.name} | ${e.type} | ${e.specialty} | ${e.city} | ${e.phone}`);
  }

  console.log(`\nSaved to: ${OUTPUT_FILE}`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
