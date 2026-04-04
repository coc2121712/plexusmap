'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/ui/Header';
import { SearchBar } from '@/components/search/SearchBar';
import { ProfessionalList } from '@/components/search/ProfessionalList';
import { MapView } from '@/components/map/MapView';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useMapStore } from '@/stores/map-store';
import type { SpecialtySummary, ProfessionalSummary } from '@/types';

interface HomePageProps {
  specialties: SpecialtySummary[];
  insurances: { id: string; name: string }[];
  initialProfessionals?: ProfessionalSummary[];
}

export function HomePage({ specialties, insurances, initialProfessionals }: HomePageProps) {
  const { setProfessionals, professionals } = useMapStore();
  const [mobileListExpanded, setMobileListExpanded] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);

  // Hydrate store with SSR data on mount (before client fetch replaces it)
  useEffect(() => {
    if (initialProfessionals && initialProfessionals.length > 0 && professionals.length === 0) {
      setProfessionals(initialProfessionals);
    }
  }, [initialProfessionals, setProfessionals, professionals.length]);

  // Client-side fetch (replaces SSR data when filters change)
  useProfessionals();

  return (
    <div className="flex flex-col h-screen">
      <Header />

      {/* Mobile: toggle filters button */}
      <div className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-border">
        <button
          onClick={() => setFiltersVisible(!filtersVisible)}
          className="flex items-center gap-2 text-sm font-medium text-gray-600"
          aria-label={filtersVisible ? 'Ocultar filtros' : 'Mostrar filtros'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {filtersVisible ? 'Ocultar filtros' : 'Filtros'}
        </button>
        <span className="text-xs text-gray-400">
          {professionals.length} resultado{professionals.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Desktop: always show. Mobile: collapsible */}
      <div className={`${filtersVisible ? 'block' : 'hidden'} md:block`}>
        <SearchBar specialties={specialties} insurances={insurances} />
      </div>

      {/* Main content: sidebar + map */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-[380px] flex-col border-r border-border bg-white overflow-y-auto">
          <ProfessionalList />
        </aside>

        {/* Map */}
        <main className="flex-1 relative" id="map-container">
          <MapView />
        </main>

        {/* Mobile: sliding drawer from bottom */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-20">
          {/* Drag handle / peek bar */}
          <button
            onClick={() => setMobileListExpanded(!mobileListExpanded)}
            className="w-full bg-white border-t border-border rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] px-4 pt-2 pb-1 flex flex-col items-center"
            aria-label={mobileListExpanded ? 'Contraer lista' : 'Expandir lista'}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300 mb-1.5" />
            <span className="text-xs font-medium text-gray-600">
              {professionals.length} profesional{professionals.length !== 1 ? 'es' : ''}
              {mobileListExpanded ? ' — toca para cerrar' : ' — toca para ver lista'}
            </span>
          </button>

          {/* Expandable list */}
          <div
            className={`bg-white overflow-y-auto transition-[max-height] duration-300 ease-in-out ${
              mobileListExpanded ? 'max-h-[60vh]' : 'max-h-0'
            }`}
          >
            <ProfessionalList />
          </div>
        </div>
      </div>
    </div>
  );
}
