// ═══════════════════════════════════════════
// API key authentication for /api/v1/directory (machine-to-machine)
//
// Accepts `Authorization: Bearer <key>` or `x-api-key: <key>`. Keys are looked
// up by SHA-256 hash; the raw key is never stored. Errors are `{ error, code }`
// (`error` in Spanish like the rest of the app, `code` stable for clients).
// ═══════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { hashApiKey, type Scope } from '@/lib/api-key';

export interface ApiAuthContext {
  apiKeyId: string;
  name: string;
  scopes: string[];
}

const RATE_LIMIT_MAX = 120; // requests per minute, per API key
const RATE_LIMIT_WINDOW_MS = 60_000;
const LAST_USED_REFRESH_MS = 5 * 60_000; // avoid a DB write on every request

function fail(
  error: string,
  code: string,
  status: number,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json({ error, code }, { status, headers });
}

function extractRawKey(request: Request): string | null {
  const bearer = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')?.trim() ?? '');
  if (bearer) return bearer[1];
  return request.headers.get('x-api-key')?.trim() || null;
}

/**
 * Returns the auth context, or a ready-to-return error response.
 *
 *   const auth = await authenticateApiKey(request, [SCOPES.DIRECTORY_READ]);
 *   if (auth instanceof NextResponse) return auth;
 */
export async function authenticateApiKey(
  request: Request,
  requiredScopes: Scope[] = []
): Promise<ApiAuthContext | NextResponse> {
  const rawKey = extractRawKey(request);
  if (!rawKey) {
    return fail(
      'Falta la API key. Usa Authorization: Bearer <key> o el header x-api-key.',
      'missing_api_key',
      401
    );
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(rawKey) },
    select: {
      id: true,
      name: true,
      scopes: true,
      active: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
    },
  });

  if (!apiKey) return fail('API key inválida.', 'invalid_api_key', 401);
  if (!apiKey.active || apiKey.revokedAt) {
    return fail('API key revocada o inactiva.', 'api_key_inactive', 403);
  }
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return fail('API key vencida.', 'api_key_expired', 403);
  }

  const limit = rateLimit(`apikey:${apiKey.id}`, {
    maxRequests: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!limit.allowed) {
    return fail(
      `Demasiadas solicitudes. Máximo ${RATE_LIMIT_MAX} por minuto por API key.`,
      'rate_limited',
      429,
      { 'Retry-After': String(limit.retryAfter) }
    );
  }

  for (const scope of requiredScopes) {
    if (!apiKey.scopes.includes(scope)) {
      return fail(`Permiso insuficiente. Se requiere: ${scope}`, 'insufficient_scope', 403);
    }
  }

  // Best-effort usage stamp, throttled; never fails the request.
  const lastUsed = apiKey.lastUsedAt?.getTime() ?? 0;
  if (Date.now() - lastUsed > LAST_USED_REFRESH_MS) {
    try {
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });
    } catch (error) {
      console.error('Error updating ApiKey.lastUsedAt:', error);
    }
  }

  return { apiKeyId: apiKey.id, name: apiKey.name, scopes: apiKey.scopes };
}
