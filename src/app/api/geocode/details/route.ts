// GET /api/geocode/details?place_id=xxx — proxy to Google Geocoding API
// Requires authenticated session + rate limiting
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { rateLimit } from '@/lib/rate-limit';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  // Auth check — only logged-in users can geocode
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Rate limit: 20 requests per minute per user
  const rl = rateLimit(`geocode-dt:${(session.user as { id: string }).id}`, { maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    );
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'No API key configured' }, { status: 503 });
  }

  const placeId = request.nextUrl.searchParams.get('place_id');
  if (!placeId) {
    return NextResponse.json({ error: 'place_id required' }, { status: 400 });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('key', API_KEY);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.results?.[0]?.geometry?.location) {
      const { lat, lng } = data.results[0].geometry.location;
      return NextResponse.json({ lat, lng });
    }

    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}
