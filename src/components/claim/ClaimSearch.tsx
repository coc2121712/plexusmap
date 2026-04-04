'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ClaimForm } from '@/components/claim/ClaimForm';

interface ClaimProfessional {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  address: string;
}

interface ClaimSearchProps {
  preselectedSlug: string | null;
}

export function ClaimSearch({ preselectedSlug }: ClaimSearchProps) {
  const [selected, setSelected] = useState<ClaimProfessional | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ClaimProfessional[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!preselectedSlug);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch unclaimed professionals matching query
  const fetchProfessionals = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const url = query
        ? `/api/professionals?claimed=false&query=${encodeURIComponent(query)}&pageSize=10`
        : `/api/professionals?claimed=false&pageSize=10`;
      const res = await fetch(url);
      const json = await res.json();
      const mapped: ClaimProfessional[] = (json.data || []).map((p: { id: string; slug: string; name: string; specialty: { name: string }; address: string }) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        specialty: p.specialty.name,
        address: p.address,
      }));
      setResults(mapped);
      if (query) setShowDropdown(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // If preselected slug, fetch that specific professional on mount
  useEffect(() => {
    if (!preselectedSlug) return;

    async function loadPreselected() {
      try {
        const res = await fetch(`/api/professionals?claimed=false&query=${encodeURIComponent(preselectedSlug!)}&pageSize=10`);
        const json = await res.json();
        const match = (json.data || []).find((p: { slug: string }) => p.slug === preselectedSlug);
        if (match) {
          setSelected({
            id: match.id,
            slug: match.slug,
            name: match.name,
            specialty: match.specialty.name,
            address: match.address,
          });
          setSearch(match.name);
        }
      } catch {
        // ignore — user can search manually
      } finally {
        setInitialLoading(false);
      }
    }

    loadPreselected();
  }, [preselectedSlug]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setSelected(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(() => fetchProfessionals(value), 350);
  }

  function selectProfessional(pro: ClaimProfessional) {
    setSelected(pro);
    setSearch(pro.name);
    setShowDropdown(false);
  }

  function clearSelection() {
    setSelected(null);
    setSearch('');
    setResults([]);
  }

  if (initialLoading) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Cargando perfil...</p>
      </div>
    );
  }

  // If a professional is selected, show the claim form
  if (selected) {
    return (
      <div className="space-y-4">
        {/* Selected professional card */}
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div>
            <p className="text-sm font-medium text-gray-900">{selected.name}</p>
            <p className="text-xs text-gray-500">{selected.specialty} — {selected.address}</p>
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <ClaimForm professional={selected} />
      </div>
    );
  }

  // Search mode
  return (
    <div className="bg-white rounded-xl border border-border p-6 sm:p-8">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Buscar tu perfil profesional
      </label>
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            placeholder="Escribe tu nombre o especialidad..."
            className="w-full px-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {results.length > 0 ? (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProfessional(p)}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-border last:border-0"
                >
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.specialty} — {p.address}</p>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500">
                No se encontraron perfiles sin reclamar.
              </div>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        Solo se muestran perfiles que aún no han sido reclamados.
      </p>
    </div>
  );
}
