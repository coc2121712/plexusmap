'use client';

import Image from 'next/image';
import { useMapStore } from '@/stores/map-store';
import { formatDistance, calculateDistance } from '@/lib/google-maps';
import { SkeletonProfessionalCard } from '@/components/ui/Skeleton';
import type { ProfessionalSummary } from '@/types';

export function ProfessionalList() {
  const { professionals, selectedProfessional, setSelectedProfessional, setMapCenter, setMapZoom, userLocation, isLoading, clearFilters } =
    useMapStore();

  if (isLoading) {
    return (
      <div>
        <div className="px-4 py-2 bg-gray-50">
          <div className="h-3 bg-gray-200 rounded animate-pulse w-32" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <SkeletonProfessionalCard key={i} />
        ))}
      </div>
    );
  }

  if (professionals.length === 0) {
    return (
      <div className="p-8 text-center">
        {/* Search with X icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 8.5l-3 3m0-3l3 3" />
        </svg>
        <p className="font-medium text-gray-700">No encontramos profesionales con esos filtros</p>
        <p className="text-sm text-gray-400 mt-1 mb-4">Intenta ampliar tu búsqueda o usa otros criterios</p>
        <button
          onClick={() => clearFilters()}
          className="text-sm font-medium text-primary hover:text-primary-hover transition-colors bg-primary/5 px-4 py-2 rounded-lg hover:bg-primary/10"
        >
          Limpiar filtros
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      <div className="px-4 py-2 text-xs font-medium text-gray-500 bg-gray-50">
        {professionals.length} profesional{professionals.length !== 1 ? 'es' : ''} encontrado{professionals.length !== 1 ? 's' : ''}
      </div>
      {professionals.map((pro) => (
        <ProfessionalCard
          key={pro.id}
          professional={pro}
          isSelected={selectedProfessional?.id === pro.id}
          userLocation={userLocation}
          onSelect={() => {
            setSelectedProfessional(pro);
            setMapCenter({ lat: pro.lat, lng: pro.lng });
            setMapZoom(16);
          }}
        />
      ))}
    </div>
  );
}

function ProfessionalCard({
  professional,
  isSelected,
  userLocation,
  onSelect,
}: {
  professional: ProfessionalSummary;
  isSelected: boolean;
  userLocation: { lat: number; lng: number } | null;
  onSelect: () => void;
}) {
  const distance = userLocation
    ? calculateDistance(userLocation.lat, userLocation.lng, professional.lat, professional.lng)
    : null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 hover:bg-blue-50/50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-2 border-primary' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 overflow-hidden">
          {professional.photos.length > 0 ? (
            <Image
              src={professional.photos[0]}
              alt={professional.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xl">{professional.specialty.icon || '🩺'}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-medium text-sm text-gray-900 truncate">
              {professional.name}
            </h3>
            {professional.isVerified && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {professional.isPriority && (
              <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">
                Destacado
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-0.5">
            {professional.specialty.icon} {professional.specialty.name}
          </p>

          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="font-medium text-gray-700">{professional.rating.toFixed(1)}</span>
              <span className="text-gray-400">({professional.reviewCount})</span>
            </span>
            {distance !== null && (
              <span className="text-xs text-gray-400">{formatDistance(distance)}</span>
            )}
          </div>

          <p className="text-xs text-gray-400 mt-1 truncate">{professional.address}</p>

          {professional.insurances.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {professional.insurances.slice(0, 2).map((ins) => (
                <span key={ins} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {ins}
                </span>
              ))}
              {professional.insurances.length > 2 && (
                <span className="text-[10px] px-1.5 py-0.5 text-gray-400">
                  +{professional.insurances.length - 2} más
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
