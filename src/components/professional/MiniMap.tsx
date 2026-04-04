'use client';

import Image from 'next/image';

interface MiniMapProps {
  lat: number;
  lng: number;
  name: string;
  address: string;
}

export function MiniMap({ lat, lng, name, address }: MiniMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  // Google Static Maps API image (requires API key)
  const staticMapUrl = apiKey
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x300&scale=2&markers=color:red%7C${lat},${lng}&key=${apiKey}`
    : null;

  return (
    <div>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative group"
      >
        {staticMapUrl ? (
          /* Real Google Static Map */
          <div className="h-48 overflow-hidden relative">
            <Image
              src={staticMapUrl}
              alt={`Mapa de ${name}`}
              width={600}
              height={300}
              className="w-full h-full object-cover"
              loading="lazy"
              unoptimized
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="bg-white/90 text-primary text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                Abrir en Google Maps
              </span>
            </div>
          </div>
        ) : (
          /* Fallback — no API key */
          <div className="h-48 bg-gray-100 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-blue-100/30" />
            <div className="text-center z-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mx-auto text-primary mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-xs text-gray-500">Ver en Google Maps</p>
            </div>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </a>
      <div className="p-4">
        <p className="text-sm text-gray-700 font-medium">{name}</p>
        <p className="text-xs text-gray-500 mt-1">{address}</p>
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline"
        >
          Cómo llegar
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
