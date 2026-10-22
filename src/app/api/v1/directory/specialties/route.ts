// GET /api/v1/directory/specialties — Specialty taxonomy with professional counts (API key, scope directory:read)
import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import { SCOPES } from '@/lib/api-key';
import { prisma } from '@/lib/prisma';
import { CACHE_HEADERS, apiError } from '@/lib/directory-api';

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request, [SCOPES.DIRECTORY_READ]);
  if (auth instanceof NextResponse) return auth;

  try {
    const specialties = await prisma.specialty.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        icon: true,
        parent: { select: { slug: true } },
        _count: { select: { professionals: true } },
      },
    });

    return NextResponse.json(
      {
        data: specialties.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          icon: s.icon,
          parentSlug: s.parent?.slug ?? null,
          professionalCount: s._count.professionals,
        })),
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error in GET /api/v1/directory/specialties:', error);
    return apiError('Error al consultar el directorio.', 'internal_error', 500);
  }
}
