import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { HomePage } from '@/components/HomePage';
import type { ProfessionalSummary } from '@/types';

// Force dynamic rendering — homepage needs live DB data for SSR
// Without this, Next.js pre-renders during Docker build (no DB) and caches empty results
export const dynamic = 'force-dynamic';

// Cache specialties for 1 hour (rarely change)
const getSpecialties = unstable_cache(
  async () => {
    try {
      return await prisma.specialty.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, slug: true, name: true, icon: true },
      });
    } catch {
      return [];
    }
  },
  ['specialties'],
  { revalidate: 3600, tags: ['specialties'] }
);

// Cache insurances for 1 hour (rarely change)
const getInsurances = unstable_cache(
  async () => {
    try {
      return await prisma.insurance.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
    } catch {
      return [];
    }
  },
  ['insurances'],
  { revalidate: 3600, tags: ['insurances'] }
);

// Fetch initial professionals for SSR (crawlers see real content)
// Not using unstable_cache here — the page-level ISR (revalidate=300) handles caching.
// Using unstable_cache caused stale empty results from Docker build cache.
async function getInitialProfessionals(): Promise<ProfessionalSummary[]> {
  try {
    const professionals = await prisma.professional.findMany({
      include: {
        specialty: true,
        insurances: { include: { insurance: true } },
      },
      orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }],
      take: 50,
    });

    return professionals.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      specialty: {
        id: p.specialty.id,
        slug: p.specialty.slug,
        name: p.specialty.name,
        icon: p.specialty.icon,
      },
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      phone: p.phone,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isVerified: p.isVerified,
      photos: p.photos,
      insurances: p.insurances.map((pi) => pi.insurance.name),
    }));
  } catch (err) {
    console.error('[SSR] Failed to fetch initial professionals:', err);
    return [];
  }
}

export default async function Home() {
  const [specialties, insurances, initialProfessionals] = await Promise.all([
    getSpecialties(),
    getInsurances(),
    getInitialProfessionals(),
  ]);

  return (
    <HomePage
      specialties={specialties}
      insurances={insurances}
      initialProfessionals={initialProfessionals}
    />
  );
}
