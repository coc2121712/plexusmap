'use client';

import { useState, useCallback, useRef } from 'react';
import { useMapStore } from '@/stores/map-store';
import type { SpecialtySummary } from '@/types';

interface SearchBarProps {
  specialties: SpecialtySummary[];
  insurances: { id: string; name: string }[];
}

export function SearchBar({ specialties, insurances }: SearchBarProps) {
  const { filters, setFilters, clearFilters, isLoading } = useMapStore();
  const [queryInput, setQueryInput] = useState(filters.query || '');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleQueryChange = useCallback(
    (value: string) => {
      setQueryInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setFilters({ query: value || undefined });
      }, 300);
    },
    [setFilters]
  );

  const handleSpecialtyChange = useCallback(
    (value: string) => {
      setFilters({ specialty: value || undefined });
    },
    [setFilters]
  );

  const handleInsuranceChange = useCallback(
    (value: string) => {
      setFilters({ insurance: value || undefined });
    },
    [setFilters]
  );

  const handleClear = useCallback(() => {
    setQueryInput('');
    clearFilters();
  }, [clearFilters]);

  const hasFilters = !!(filters.query || filters.specialty || filters.insurance);

  return (
    <div className="bg-white border-b border-border">
      <div className="max-w-screen-xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Text search */}
          <div className="relative flex-1 min-w-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={queryInput}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar por nombre, especialidad o dirección..."
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Specialty filter — now uses slugs */}
          <select
            value={filters.specialty || ''}
            onChange={(e) => handleSpecialtyChange(e.target.value)}
            className="px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-gray-700 min-w-[180px]"
          >
            <option value="">Todas las especialidades</option>
            {specialties.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>

          {/* Insurance filter */}
          <select
            value={filters.insurance || ''}
            onChange={(e) => handleInsuranceChange(e.target.value)}
            className="px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white text-gray-700 min-w-[180px]"
          >
            <option value="">Todas las aseguradoras</option>
            {insurances.map((ins) => (
              <option key={ins.id} value={ins.name}>
                {ins.name}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={handleClear}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-border rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
