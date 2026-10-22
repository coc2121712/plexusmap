// GET /api/v1/directory/insurances — Insurers with professional counts (API key, scope directory:read)
import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import { SCOPES } from '@/lib/api-key';
import { prisma } from '@/lib/prisma';
import { CACHE_HEADERS, apiError } from '@/lib/directory-api';

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request, [SCOPES.DIRECTORY_READ]);
  if (auth instanceof NextResponse) return auth;

  try {
    const insurances = await prisma.insurance.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        logo: true,
        _count: { select: { professionals: true } },
      },
    });

    return NextResponse.json(
      {
        data: insurances.map((i) => ({
          id: i.id,
          name: i.name,
          logo: i.logo,
          professionalCount: i._count.professionals,
        })),
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error in GET /api/v1/directory/insurances:', error);
    return apiError('Error al consultar el directorio.', 'internal_error', 500);
  }
}
