import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { SpecialtyLanding } from '@/components/search/SpecialtyLanding';
import type { ProfessionalSummary, SpecialtySummary } from '@/types';

// ISR: revalidate every 30 minutes
export const revalidate = 1800;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getSpecialtyData(slug: string) {
  const specialty = await prisma.specialty.findUnique({
    where: { slug },
  });

  if (!specialty) return null;

  const professionals = await prisma.professional.findMany({
    where: { specialtyId: specialty.id },
    include: {
      specialty: true,
      insurances: { include: { insurance: true } },
    },
    orderBy: [{ isVerified: 'desc' }, { rating: 'desc' }],
  });

  const mapped: ProfessionalSummary[] = professionals.map((p) => ({
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

  return {
    specialty: {
      id: specialty.id,
      slug: specialty.slug,
      name: specialty.name,
      icon: specialty.icon,
    } as SpecialtySummary,
    professionals: mapped,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSpecialtyData(slug);

  if (!data) {
    return {
      title: 'Especialidad no encontrada',
      robots: { index: false, follow: false },
    };
  }

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://plexusmap.com'}/especialidad/${slug}`;

  return {
    title: `${data.specialty.name} en Panamá — Mejores profesionales`,
    description: `Encuentra los mejores profesionales de ${data.specialty.name} en Ciudad de Panamá. ${data.professionals.length} profesionales verificados con reseñas y horarios.`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${data.specialty.icon} ${data.specialty.name} en Panamá | PlexusMap`,
      description: `${data.professionals.length} profesionales de ${data.specialty.name} en Panamá.`,
      url,
    },
  };
}

export default async function SpecialtyPage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getSpecialtyData(slug);

  if (!data) {
    notFound();
  }

  return (
    <SpecialtyLanding
      specialty={data.specialty}
      professionals={data.professionals}
    />
  );
}
