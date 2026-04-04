import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { HomePage } from '@/components/HomePage';
import type { ProfessionalSummary } from '@/types';

// ISR: revalidate homepage every 5 minutes
export const revalidate = 300;

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

// Cache initial professionals for SSR (crawlers see real content)
const getInitialProfessionals = unstable_cache(
  async (): Promise<ProfessionalSummary[]> => {
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
    } catch {
      return [];
    }
  },
  ['initial-professionals'],
  { revalidate: 300, tags: ['professionals'] }
);

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
