// GET /api/geocode/autocomplete?input=xxx — proxy to Google Places Autocomplete
// Requires authenticated session (prevents abuse from anonymous bots)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  // Auth check — only logged-in users can geocode
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  if (!API_KEY) {
    return NextResponse.json({ predictions: [] });
  }

  const input = request.nextUrl.searchParams.get('input');
  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('components', 'country:pa');
    url.searchParams.set('language', 'es');
    url.searchParams.set('key', API_KEY);

    const res = await fetch(url.toString());
    const data = await res.json();

    // Return only the fields the client needs
    const predictions = (data.predictions || []).map((p: { place_id: string; description: string }) => ({
      place_id: p.place_id,
      description: p.description,
    }));

    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}
