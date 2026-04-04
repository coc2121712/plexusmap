'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ProfileEditorProps {
  professional: {
    id: string;
    name: string;
    phone: string;
    email: string;
    bio: string;
    address: string;
    lat: number;
    lng: number;
    cliniwebIcalUrl: string;
    currentInsurances: string[];
  };
  allInsurances: { id: string; name: string }[];
}

export function ProfileEditor({ professional, allInsurances }: ProfileEditorProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const [form, setForm] = useState({
    phone: professional.phone,
    email: professional.email,
    bio: professional.bio,
    address: professional.address,
    lat: professional.lat,
    lng: professional.lng,
    cliniwebIcalUrl: professional.cliniwebIcalUrl,
  });
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>(professional.currentInsurances);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/dashboard/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          insuranceIds: selectedInsurances,
        }),
      });

      if (!res.ok) throw new Error('Error al guardar');
      setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar los cambios.' });
    } finally {
      setSaving(false);
    }
  }

  function toggleInsurance(id: string) {
    setSelectedInsurances((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {message && (
        <div
          className={`text-sm p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Name (read-only) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
        <input
          type="text"
          value={professional.name}
          disabled
          className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-border rounded-lg text-gray-500"
        />
        <p className="text-xs text-gray-400 mt-1">
          Para cambiar tu nombre, contacta a soporte.
        </p>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="+507-XXX-XXXX"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email de contacto público
        </label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="contacto@miclinica.com"
        />
      </div>

      {/* Address with geocoding */}
      {apiKey ? (
        <AddressAutocomplete
          address={form.address}
          lat={form.lat}
          lng={form.lng}
          onChange={(address, lat, lng) => setForm({ ...form, address, lat, lng })}
        />
      ) : (
        <AddressManual
          address={form.address}
          lat={form.lat}
          lng={form.lng}
          onChange={(address, lat, lng) => setForm({ ...form, address, lat, lng })}
        />
      )}

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Biografía</label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          rows={4}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
          placeholder="Describe tu experiencia, especialización y enfoque..."
        />
        <p className="text-xs text-gray-400 mt-1">
          {form.bio.length}/500 caracteres
        </p>
      </div>

      {/* Advanced: Cliniweb iCal URL */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Configuración avanzada</h3>
        <p className="text-xs text-gray-400 mb-4">Integraciones con sistemas externos.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL de agenda Cliniweb (iCal)
          </label>
          <input
            type="url"
            value={form.cliniwebIcalUrl}
            onChange={(e) => setForm({ ...form, cliniwebIcalUrl: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono text-xs"
            placeholder="https://cliniweb.com/ical/tu-calendario.ics"
          />
          <p className="text-xs text-gray-400 mt-1">
            En Cliniweb, ve a Configuración → Agenda → Exportar calendario → copia la URL del feed iCal (.ics).
            Esta URL permite sincronizar tus citas existentes para evitar doble agenda.
          </p>
        </div>
      </div>

      {/* Insurances */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Aseguradoras aceptadas
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {allInsurances.map((ins) => (
            <label
              key={ins.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                selectedInsurances.includes(ins.id)
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border text-gray-600 hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedInsurances.includes(ins.id)}
                onChange={() => toggleInsurance(ins.id)}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  selectedInsurances.includes(ins.id)
                    ? 'bg-primary border-primary'
                    : 'border-gray-300'
                }`}
              >
                {selectedInsurances.includes(ins.id) && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="text-sm">{ins.name}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="bg-primary text-white font-medium text-sm px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </form>
  );
}

// ═══════════════════════════════════════════
// Address Autocomplete (with Google Maps API)
// ═══════════════════════════════════════════

interface AddressFieldProps {
  address: string;
  lat: number;
  lng: number;
  onChange: (address: string, lat: number, lng: number) => void;
}

interface Prediction {
  place_id: string;
  description: string;
}

function AddressAutocomplete({ address, lat, lng, onChange }: AddressFieldProps) {
  const [query, setQuery] = useState(address);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 3) {
      setPredictions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/geocode/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      if (data.predictions) {
        setPredictions(data.predictions);
        setShowDropdown(true);
      }
    } catch {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(value: string) {
    setQuery(value);
    onChange(value, lat, lng);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 350);
  }

  async function selectPrediction(prediction: Prediction) {
    setShowDropdown(false);
    setQuery(prediction.description);
    setLoading(true);

    try {
      const res = await fetch(`/api/geocode/details?place_id=${prediction.place_id}`);
      const data = await res.json();
      if (data.lat !== undefined && data.lng !== undefined) {
        onChange(prediction.description, data.lat, data.lng);
      } else {
        onChange(prediction.description, lat, lng);
      }
    } catch {
      onChange(prediction.description, lat, lng);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => predictions.length > 0 && setShowDropdown(true)}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary pr-8"
            placeholder="Buscar dirección en Panamá..."
          />
          {loading && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Predictions dropdown */}
        {showDropdown && predictions.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {predictions.map((p) => (
              <button
                key={p.place_id}
                type="button"
                onClick={() => selectPrediction(p)}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors border-b border-gray-50 last:border-b-0"
              >
                <span className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {p.description}
                </span>
              </button>
            ))}
            <div className="px-3 py-1.5 text-[10px] text-gray-400 text-right">
              Powered by Google
            </div>
          </div>
        )}
      </div>

      {/* Coordinates display (read-only) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Latitud</label>
          <input
            type="text"
            value={lat.toFixed(6)}
            disabled
            className="w-full px-3 py-2 text-xs bg-gray-50 border border-border rounded-lg text-gray-500 font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Longitud</label>
          <input
            type="text"
            value={lng.toFixed(6)}
            disabled
            className="w-full px-3 py-2 text-xs bg-gray-50 border border-border rounded-lg text-gray-500 font-mono"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Las coordenadas se actualizan automáticamente al seleccionar una dirección.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════
// Manual Address (no API key fallback)
// ═══════════════════════════════════════════

function AddressManual({ address, lat, lng, onChange }: AddressFieldProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
        <input
          type="text"
          value={address}
          onChange={(e) => onChange(e.target.value, lat, lng)}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Dirección completa"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Latitud</label>
          <input
            type="number"
            step="any"
            value={lat}
            onChange={(e) => onChange(address, parseFloat(e.target.value) || 0, lng)}
            className="w-full px-3 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
            placeholder="8.9824"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Longitud</label>
          <input
            type="number"
            step="any"
            value={lng}
            onChange={(e) => onChange(address, lat, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
            placeholder="-79.5199"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para autocompletado de direcciones.
      </p>
    </div>
  );
}
