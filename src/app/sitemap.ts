// Dynamic sitemap for SEO — all professionals + specialty landing pages
import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

// Force dynamic — sitemap needs DB access at runtime, not at build time
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://plexusmap.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Fetch all professionals and specialties
  const [professionals, specialties] = await Promise.all([
    prisma.professional.findMany({
      select: { slug: true, updatedAt: true },
    }),
    prisma.specialty.findMany({
      select: { slug: true },
    }),
  ]);

  // Home page
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/claim`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Specialty landing pages: /especialidad/optometria
  const specialtyPages: MetadataRoute.Sitemap = specialties.map((s) => ({
    url: `${BASE_URL}/especialidad/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Professional profile pages: /dr-juan-perez
  const professionalPages: MetadataRoute.Sitemap = professionals.map((p) => ({
    url: `${BASE_URL}/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...specialtyPages, ...professionalPages];
}
