// GET /api/icon?size=192|512 — Dynamic PWA icon as PNG
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const sizeParam = request.nextUrl.searchParams.get('size');
  const size = sizeParam === '512' ? 512 : 192;
  const fontSize = size === 512 ? 216 : 80;
  const radius = Math.round(size * 0.16); // ~16% corner radius

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F7B5F',
          borderRadius: radius,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <span style={{ fontSize, fontWeight: 700, color: 'white' }}>PM</span>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
