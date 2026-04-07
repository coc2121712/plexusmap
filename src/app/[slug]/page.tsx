import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ProfessionalJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { ProfilePage } from '@/components/professional/ProfilePage';
import type { ProfessionalDetail } from '@/types';

// ISR: revalidate every 30 minutes — professionals rarely change
export const revalidate = 1800;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProfessional(slug: string): Promise<ProfessionalDetail | null> {
  const p = await prisma.professional.findUnique({
    where: { slug },
    include: {
      specialty: true,
      insurances: { include: { insurance: true } },
      reviews: { orderBy: { createdAt: 'desc' }, take: 20 },
      schedules: { where: { isActive: true }, orderBy: { dayOfWeek: 'asc' } },
    },
  });

  if (!p) return null;

  return {
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
    email: p.email,
    bio: p.bio,
    rating: p.rating,
    reviewCount: p.reviewCount,
    isVerified: p.isVerified,
    isClaimed: p.isClaimed,
    kairosEnabled: p.kairosEnabled,
    photos: p.photos,
    insurances: p.insurances.map((pi) => pi.insurance.name),
    reviews: p.reviews.map((r) => ({
      id: r.id,
      patientName: r.patientName,
      rating: r.rating,
      comment: r.comment,
      reply: r.reply,
      source: r.source,
      isVerified: r.isVerified,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt.toISOString(),
    })),
    schedules: p.schedules.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDuration: s.slotDuration,
      isActive: s.isActive,
    })),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const pro = await getProfessional(slug);

  if (!pro) {
    return {
      title: 'Profesional no encontrado',
      robots: { index: false, follow: false },
    };
  }

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://plexusmap.com'}/${slug}`;

  return {
    title: `${pro.name} — ${pro.specialty.name}`,
    description:
      pro.bio ||
      `${pro.name}, ${pro.specialty.name} en ${pro.address}. Rating ${pro.rating}/5 con ${pro.reviewCount} reseñas.`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: `${pro.name} — ${pro.specialty.name} | PlexusMap`,
      description: pro.bio || `${pro.specialty.name} en Ciudad de Panamá`,
      type: 'profile',
      url,
    },
  };
}

export default async function ProfessionalProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const professional = await getProfessional(slug);

  if (!professional) {
    notFound();
  }

  const url = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://plexusmap.com'}/${slug}`;

  return (
    <>
      <ProfessionalJsonLd professional={professional} url={url} />
      <BreadcrumbJsonLd professional={professional} url={url} />
      <ProfilePage professional={professional} />
    </>
  );
}
