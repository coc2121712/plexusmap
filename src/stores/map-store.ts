// Zustand store for map + search state
import { create } from 'zustand';
import type { ProfessionalSummary, SearchFilters } from '@/types';

interface MapState {
  // Professionals data
  professionals: ProfessionalSummary[];
  selectedProfessional: ProfessionalSummary | null;
  isLoading: boolean;

  // Search filters
  filters: SearchFilters;

  // User location
  userLocation: { lat: number; lng: number } | null;

  // Map viewport
  mapCenter: { lat: number; lng: number };
  mapZoom: number;

  // Actions
  setProfessionals: (pros: ProfessionalSummary[]) => void;
  setSelectedProfessional: (pro: ProfessionalSummary | null) => void;
  setIsLoading: (loading: boolean) => void;
  setFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  setUserLocation: (loc: { lat: number; lng: number } | null) => void;
  setMapCenter: (center: { lat: number; lng: number }) => void;
  setMapZoom: (zoom: number) => void;
}

export const useMapStore = create<MapState>((set) => ({
  professionals: [],
  selectedProfessional: null,
  isLoading: false,

  filters: {},

  userLocation: null,

  mapCenter: { lat: 8.9824, lng: -79.5199 }, // Panama City
  mapZoom: 13,

  setProfessionals: (professionals) => set({ professionals }),
  setSelectedProfessional: (selectedProfessional) => set({ selectedProfessional }),
  setIsLoading: (isLoading) => set({ isLoading }),

  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),

  clearFilters: () => set({ filters: {} }),

  setUserLocation: (userLocation) => set({ userLocation }),

  setMapCenter: (mapCenter) => set({ mapCenter }),
  setMapZoom: (mapZoom) => set({ mapZoom }),
}));
