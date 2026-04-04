'use client';

import { useState } from 'react';

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface ScheduleItem {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

interface ScheduleEditorProps {
  professionalId: string;
  professionalSlug: string;
  cliniwebIcalUrl: string | null;
  initialSchedules: ScheduleItem[];
}

function defaultSchedules(): ScheduleItem[] {
  return [0, 1, 2, 3, 4, 5, 6].map((day) => ({
    dayOfWeek: day,
    startTime: '08:00',
    endTime: '17:00',
    slotDuration: 30,
    isActive: day >= 1 && day <= 5, // Mon-Fri active
  }));
}

export function ScheduleEditor({ professionalId, professionalSlug, cliniwebIcalUrl, initialSchedules }: ScheduleEditorProps) {
  // Merge initial with defaults so all 7 days exist
  const merged = defaultSchedules().map((def) => {
    const existing = initialSchedules.find((s) => s.dayOfWeek === def.dayOfWeek);
    return existing || def;
  });

  const [schedules, setSchedules] = useState<ScheduleItem[]>(merged);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function updateDay(dayOfWeek: number, updates: Partial<ScheduleItem>) {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, ...updates } : s))
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/dashboard/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedules }),
      });

      if (!res.ok) throw new Error('Error');
      setMessage({ type: 'success', text: 'Horario actualizado correctamente.' });
    } catch {
      setMessage({ type: 'error', text: 'Error al guardar el horario.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/professionals/${professionalSlug}/sync-ical`, {
        method: 'POST',
      });

      const json = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'Error al sincronizar.' });
        return;
      }

      setMessage({
        type: 'success',
        text: json.data?.message || `Sincronización completada: ${json.data?.synced || 0} slots nuevos.`,
      });
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión al sincronizar.' });
    } finally {
      setSyncing(false);
    }
  }

  // Reorder: Mon-Sat, then Sun
  const ordered = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-4">
      {message && (
        <div className={`text-sm p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {ordered.map((day) => {
          const schedule = schedules.find((s) => s.dayOfWeek === day)!;
          return (
            <div
              key={day}
              className={`bg-white rounded-lg border p-4 transition-colors ${
                schedule.isActive ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Toggle */}
                <button
                  type="button"
                  onClick={() => updateDay(day, { isActive: !schedule.isActive })}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    schedule.isActive ? 'bg-primary' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      schedule.isActive ? 'translate-x-4' : ''
                    }`}
                  />
                </button>

                {/* Day name */}
                <span className="w-24 text-sm font-medium text-gray-700">
                  {DAY_LABELS[day]}
                </span>

                {schedule.isActive && (
                  <>
                    {/* Start time */}
                    <input
                      type="time"
                      value={schedule.startTime}
                      onChange={(e) => updateDay(day, { startTime: e.target.value })}
                      className="px-2 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-gray-400 text-sm">a</span>
                    {/* End time */}
                    <input
                      type="time"
                      value={schedule.endTime}
                      onChange={(e) => updateDay(day, { endTime: e.target.value })}
                      className="px-2 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {/* Slot duration */}
                    <select
                      value={schedule.slotDuration}
                      onChange={(e) => updateDay(day, { slotDuration: parseInt(e.target.value) })}
                      className="px-2 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value={15}>15 min</option>
                      <option value={20}>20 min</option>
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>60 min</option>
                    </select>
                  </>
                )}

                {!schedule.isActive && (
                  <span className="text-sm text-gray-400">Cerrado</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white font-medium text-sm px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar horario'}
        </button>

        {cliniwebIcalUrl && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center justify-center gap-2 bg-white border border-border text-gray-700 font-medium text-sm px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sincronizar con Cliniweb
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
