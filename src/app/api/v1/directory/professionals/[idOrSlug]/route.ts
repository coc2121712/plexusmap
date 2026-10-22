// GET /api/v1/directory/professionals/:idOrSlug — Professional detail (API key, scope directory:read)
// Adds bio, photos, active schedules and the review rating distribution.
import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-auth';
import { SCOPES } from '@/lib/api-key';
import { CACHE_HEADERS, apiError, getProfessionalDetail } from '@/lib/directory-api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ idOrSlug: string }> }
) {
  const auth = await authenticateApiKey(request, [SCOPES.DIRECTORY_READ]);
  if (auth instanceof NextResponse) return auth;

  try {
    const { idOrSlug } = await params;
    if (idOrSlug.length > 200) {
      return apiError('Profesional no encontrado.', 'not_found', 404);
    }

    const internal = auth.scopes.includes(SCOPES.DIRECTORY_INTERNAL);
    const data = await getProfessionalDetail(idOrSlug, internal);
    if (!data) return apiError('Profesional no encontrado.', 'not_found', 404);

    return NextResponse.json({ data }, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Error in GET /api/v1/directory/professionals/:idOrSlug:', error);
    return apiError('Error al consultar el directorio.', 'internal_error', 500);
  }
}
