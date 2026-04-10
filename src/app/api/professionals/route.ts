// GET /api/professionals — Search and list professionals (cached)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import type { ProfessionalSummary, PaginatedResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const specialty = searchParams.get('specialty') || '';
    const insurance = searchParams.get('insurance') || '';
    const claimed = searchParams.get('claimed'); // "true" | "false" | null
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') || '20')));

    // Cache key includes all query params
    const cacheKey = `professionals:${query}:${specialty}:${insurance}:${claimed}:${page}:${pageSize}`;

    const fetchProfessionals = unstable_cache(
      async () => {
        // Build where clause with proper typing
        const conditions: Prisma.ProfessionalWhereInput[] = [];

        if (query) {
          // Split query into tokens so "Karla Ng" matches "Karla Del Rosario Ng González"
          // Each token must appear somewhere in name, specialty or address
          const tokens = query.trim().split(/\s+/).filter(Boolean);
          if (tokens.length <= 1) {
            // Single word — simple contains
            conditions.push({
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { specialty: { name: { contains: query, mode: 'insensitive' } } },
                { address: { contains: query, mode: 'insensitive' } },
              ],
            });
          } else {
            // Multi-word: ALL tokens must match somewhere in the name
            // (specialty/address as fallback for full query)
            const tokenConditions = tokens.map(token => ({
              name: { contains: token, mode: 'insensitive' as const },
            }));
            conditions.push({
              OR: [
                { AND: tokenConditions },
                { specialty: { name: { contains: query, mode: 'insensitive' } } },
                { address: { contains: query, mode: 'insensitive' } },
              ],
            });
          }
        }

        if (specialty) {
          conditions.push({ specialty: { slug: specialty } });
        }

        if (insurance) {
          conditions.push({
            insurances: {
              some: {
                insurance: {
                  name: { contains: insurance, mode: 'insensitive' },
                },
              },
            },
          });
        }

        if (claimed === 'true') {
          conditions.push({ isClaimed: true });
        } else if (claimed === 'false') {
          conditions.push({ isClaimed: false });
        }

        const where: Prisma.ProfessionalWhereInput =
          conditions.length > 0 ? { AND: conditions } : {};

        const [professionals, total] = await Promise.all([
          prisma.professional.findMany({
            where,
            include: {
              specialty: true,
              insurances: {
                include: { insurance: true },
              },
            },
            orderBy: [{ isPriority: 'desc' }, { isVerified: 'desc' }, { rating: 'desc' }],
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          prisma.professional.count({ where }),
        ]);

        const data: ProfessionalSummary[] = professionals.map((p) => ({
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
          isPriority: p.isPriority,
          photos: p.photos,
          insurances: p.insurances.map((pi) => pi.insurance.name),
        }));

        const response: PaginatedResponse<ProfessionalSummary> = {
          data,
          total,
          page,
          pageSize,
          hasMore: page * pageSize < total,
        };

        return response;
      },
      [cacheKey],
      { revalidate: 60, tags: ['professionals'] }
    );

    const response = await fetchProfessionals();
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching professionals:', error);
    return NextResponse.json(
      { error: 'Error al buscar profesionales' },
      { status: 500 }
    );
  }
}
