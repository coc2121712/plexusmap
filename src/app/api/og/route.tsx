// GET /api/og — Dynamic OG image as PNG (1200×630)
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0F7B5F',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo circle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: 'rgba(255,255,255,0.15)',
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 56, fontWeight: 700, color: 'white' }}>PM</span>
        </div>
        {/* Title */}
        <span
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: 'white',
            lineHeight: 1.1,
          }}
        >
          PlexusMap
        </span>
        {/* Subtitle */}
        <span
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.8)',
            marginTop: 16,
          }}
        >
          Directorio de profesionales de salud en Panamá
        </span>
        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
