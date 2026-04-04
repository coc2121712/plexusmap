'use client';

import { useEffect, useRef } from 'react';
import { useMapStore } from '@/stores/map-store';
import type { PaginatedResponse, ProfessionalSummary } from '@/types';

export function useProfessionals() {
  const { filters, setProfessionals, setIsLoading } = useMapStore();
  const abortRef = useRef<AbortController>(undefined);

  useEffect(() => {
    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    async function fetchProfessionals() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.query) params.set('query', filters.query);
        if (filters.specialty) params.set('specialty', filters.specialty);
        if (filters.insurance) params.set('insurance', filters.insurance);
        params.set('pageSize', '50');

        const res = await fetch(`/api/professionals?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error('Fetch failed');

        const data: PaginatedResponse<ProfessionalSummary> = await res.json();
        setProfessionals(data.data || []);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        console.error('Error fetching professionals:', err);
        setProfessionals([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfessionals();

    return () => {
      controller.abort();
    };
  }, [filters, setProfessionals, setIsLoading]);
}
