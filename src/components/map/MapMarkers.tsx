'use client';

import { useCallback } from 'react';
import { AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { useMapStore } from '@/stores/map-store';
import { formatDistance, calculateDistance } from '@/lib/google-maps';
import type { ProfessionalSummary } from '@/types';

// Pin colors by specialty slug
const PIN_COLORS: Record<string, { bg: string; glyph: string; border: string }> = {
  'optometria':          { bg: '#2563eb', glyph: '#fff', border: '#1d4ed8' },
  'oftalmologia':        { bg: '#1e40af', glyph: '#fff', border: '#1e3a8a' },
  'odontologia-general': { bg: '#059669', glyph: '#fff', border: '#047857' },
  'ortodoncia':          { bg: '#10b981', glyph: '#fff', border: '#059669' },
  'dermatologia':        { bg: '#d97706', glyph: '#fff', border: '#b45309' },
  'pediatria':           { bg: '#ec4899', glyph: '#fff', border: '#db2777' },
  'medicina-general':    { bg: '#6b7280', glyph: '#fff', border: '#4b5563' },
  'medicina-interna':    { bg: '#64748b', glyph: '#fff', border: '#475569' },
  'cardiologia':         { bg: '#dc2626', glyph: '#fff', border: '#b91c1c' },
  'ginecologia':         { bg: '#8b5cf6', glyph: '#fff', border: '#7c3aed' },
  'traumatologia':       { bg: '#0891b2', glyph: '#fff', border: '#0e7490' },
  'psicologia':          { bg: '#a855f7', glyph: '#fff', border: '#9333ea' },
  'urologia':            { bg: '#0d9488', glyph: '#fff', border: '#0f766e' },
};

const DEFAULT_PIN = { bg: '#6b7280', glyph: '#fff', border: '#4b5563' };

export function MapMarkers() {
  const { professionals, selectedProfessional, setSelectedProfessional, userLocation } = useMapStore();
  const map = useMap();

  const handleMarkerClick = useCallback(
    (pro: ProfessionalSummary) => {
      setSelectedProfessional(pro);
      if (map) {
        map.panTo({ lat: pro.lat, lng: pro.lng });
      }
    },
    [map, setSelectedProfessional]
  );

  return (
    <>
      {userLocation && (
        <AdvancedMarker position={userLocation} title="Tu ubicación">
          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
        </AdvancedMarker>
      )}

      {professionals.map((pro) => {
        const pinStyle = PIN_COLORS[pro.specialty.slug] || DEFAULT_PIN;
        return (
          <AdvancedMarker
            key={pro.id}
            position={{ lat: pro.lat, lng: pro.lng }}
            title={pro.name}
            onClick={() => handleMarkerClick(pro)}
          >
            <Pin
              background={pinStyle.bg}
              glyphColor={pinStyle.glyph}
              borderColor={pinStyle.border}
              scale={selectedProfessional?.id === pro.id ? 1.3 : 1}
            />
          </AdvancedMarker>
        );
      })}

      {selectedProfessional && (
        <InfoWindow
          position={{ lat: selectedProfessional.lat, lng: selectedProfessional.lng }}
          onCloseClick={() => setSelectedProfessional(null)}
          pixelOffset={[0, -40]}
        >
          <InfoWindowContent
            professional={selectedProfessional}
            userLocation={userLocation}
          />
        </InfoWindow>
      )}
    </>
  );
}

function InfoWindowContent({
  professional,
  userLocation,
}: {
  professional: ProfessionalSummary;
  userLocation: { lat: number; lng: number } | null;
}) {
  const distance = userLocation
    ? calculateDistance(userLocation.lat, userLocation.lng, professional.lat, professional.lng)
    : null;

  return (
    <div className="p-1 min-w-[240px] max-w-[300px]">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-gray-900 leading-tight">
            {professional.name}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            {professional.specialty.icon} {professional.specialty.name}
          </p>
        </div>
        {professional.isVerified && (
          <span className="shrink-0 text-blue-600" title="Verificado">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {professional.rating.toFixed(1)} ({professional.reviewCount})
        </span>
        {distance !== null && (
          <span>{formatDistance(distance)}</span>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">{professional.address}</p>

      <a
        href={`/${professional.slug}`}
        className="mt-3 block w-full text-center text-xs font-medium bg-primary text-white py-1.5 px-3 rounded-md hover:bg-primary-hover transition-colors"
      >
        Ver perfil
      </a>
    </div>
  );
}
