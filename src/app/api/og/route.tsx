// GET /api/og — Dynamic OG image as PNG (1200×630)
import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  let logoBase64 = '';
  try {
    const logoPath = join(process.cwd(), 'public', 'logo-plexusmap.png');
    const logoData = await readFile(logoPath);
    logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
  } catch {
    // Logo not available — render without it
  }

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
          position: 'relative',
        }}
      >
        {/* Logo top-left */}
        {logoBase64 && (
          <img
            src={logoBase64}
            alt=""
            width={100}
            height={100}
            style={{
              position: 'absolute',
              top: 32,
              left: 40,
              borderRadius: 16,
            }}
          />
        )}
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
          Directorio de profesionales de salud en Panam&aacute;
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
