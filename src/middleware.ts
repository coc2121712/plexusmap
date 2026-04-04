import { NextRequest, NextResponse } from 'next/server';

// In-memory rate limiter (per-process, resets on restart)
// For production, use Redis-based rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key);
    }
  }
}

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  cleanup();

  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > maxRequests;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Rate limit config
const LIMITS = {
  // Strict: auth & claim POST endpoints — 10 req/min
  strict: { max: 10, window: 60 * 1000 },
  // General: all other API routes — 100 req/min
  general: { max: 100, window: 60 * 1000 },
};

// Paths that get strict rate limiting (POST-only by default)
const STRICT_POST_PATHS = [
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/claim',
  '/api/claim/verify/complete',
];

// Paths that get strict rate limiting on ALL methods (GET included)
const STRICT_ALL_PATHS = [
  '/api/geocode/autocomplete',
  '/api/geocode/details',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate limit API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Skip rate limiting for GET /api/auth (NextAuth session checks)
  if (pathname.startsWith('/api/auth/') && request.method === 'GET') {
    return NextResponse.next();
  }

  const ip = getClientIP(request);
  const isStrictPost =
    STRICT_POST_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/')) &&
    request.method === 'POST';
  const isStrictAll =
    STRICT_ALL_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isStrict = isStrictPost || isStrictAll;

  const limit = isStrict ? LIMITS.strict : LIMITS.general;
  const bucket = isStrict ? `strict:${ip}` : `general:${ip}`;

  if (isRateLimited(bucket, limit.max, limit.window)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta más tarde.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
