// GET /api/v1/directory/professionals — Search / sync professionals (API key, scope directory:read)
//
// Two modes:
//   · default: stable order by (updatedAt, id) with `cursor` — for incremental sync (`updatedSince`).
//   · lat + lng (+ radiusKm): nearest first, each row carries `distanceKm`.
import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import { SCOPES } from '@/lib/api-key';
import {
  CACHE_HEADERS,
  apiError,
  listProfessionals,
  parseListQuery,
} from '@/lib/directory-api';

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request, [SCOPES.DIRECTORY_READ]);
  if (auth instanceof NextResponse) return auth;

  try {
    const parsed = parseListQuery(new URL(request.url).searchParams);
    if (!parsed.ok) return parsed.response;

    const internal = auth.scopes.includes(SCOPES.DIRECTORY_INTERNAL);
    const result = await listProfessionals(parsed.data, internal);
    if (!result.ok) return result.response;

    return NextResponse.json(
      {
        data: result.data,
        total: result.total,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    console.error('Error in GET /api/v1/directory/professionals:', error);
    return apiError('Error al consultar el directorio.', 'internal_error', 500);
  }
}
