'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TimeSlot } from '@/types';

interface BookingWidgetProps {
  professionalId: string;
  professionalName: string;
  address: string;
}

type Step = 'date' | 'time' | 'form' | 'success' | 'error';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_NAMES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDateLabel(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNext7Days(): Date[] {
  const days: Date[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d);
  }
  return days;
}

export function BookingWidget({ professionalId, professionalName, address }: BookingWidgetProps) {
  const [step, setStep] = useState<Step>('date');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmationData, setConfirmationData] = useState<{
    dateTime: string;
    status: string;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const days = getNext7Days();

  // ─── Fetch availability ───
  const fetchSlots = useCallback(async (date: Date) => {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await fetch(
        `/api/appointments/availability?professionalId=${professionalId}&date=${formatDateParam(date)}`
      );
      const json = await res.json();
      if (json.data?.slots) {
        setSlots(json.data.slots);
      }
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [professionalId]);

  // ─── Step transitions ───
  function goForward(to: Step) {
    setDirection('forward');
    setStep(to);
  }

  function goBack(to: Step) {
    setDirection('back');
    setStep(to);
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    setSelectedSlot(null);
    fetchSlots(date);
    goForward('time');
  }

  function selectSlot(time: string) {
    setSelectedSlot(time);
    goForward('form');
  }

  // ─── Submit appointment ───
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId,
          slot: selectedSlot,
          patientName: patientName.trim(),
          patientPhone: `+507${patientPhone.replace(/\D/g, '')}`,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'Error al crear la cita');
        goForward('error');
        return;
      }

      setConfirmationData({
        dateTime: json.data.dateTime,
        status: json.data.confirmed ? 'Confirmada' : 'Pendiente de confirmación',
      });
      goForward('success');
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
      goForward('error');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep('date');
    setSelectedDate(null);
    setSelectedSlot(null);
    setPatientName('');
    setPatientPhone('');
    setErrorMsg('');
    setConfirmationData(null);
  }

  // ─── Animation class ───
  const slideClass =
    direction === 'forward'
      ? 'animate-slide-in-right'
      : 'animate-slide-in-left';

  return (
    <section
      id="booking-widget"
      ref={containerRef}
      className="bg-white rounded-xl border border-border overflow-hidden"
    >
      {/* Header */}
      <div className="bg-primary/5 border-b border-primary/10 px-5 py-4">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-base font-semibold text-gray-900">Agendar cita</h2>
        </div>
        {/* Breadcrumb */}
        {step !== 'success' && step !== 'error' && (
          <div className="flex items-center gap-2 mt-2">
            {(['date', 'time', 'form'] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <div className="w-4 h-px bg-gray-300" />}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    step === s
                      ? 'bg-primary text-white'
                      : (['date', 'time', 'form'].indexOf(step) > i)
                        ? 'bg-primary/20 text-primary'
                        : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {i + 1}
                </div>
              </div>
            ))}
            <span className="text-xs text-gray-400 ml-2">
              {step === 'date' && 'Elige fecha'}
              {step === 'time' && 'Elige hora'}
              {step === 'form' && 'Tus datos'}
            </span>
          </div>
        )}
      </div>

      {/* Content area with slide animation */}
      <div className="relative overflow-hidden">
        <div key={step} className={`p-5 ${slideClass}`}>
          {step === 'date' && (
            <DatePicker
              days={days}
              selectedDate={selectedDate}
              onSelect={selectDate}
            />
          )}

          {step === 'time' && (
            <TimeSlotPicker
              slots={slots}
              loading={loadingSlots}
              selectedSlot={selectedSlot}
              selectedDate={selectedDate!}
              onSelect={selectSlot}
              onBack={() => goBack('date')}
            />
          )}

          {step === 'form' && (
            <PatientForm
              selectedDate={selectedDate!}
              selectedSlot={selectedSlot!}
              professionalName={professionalName}
              patientName={patientName}
              patientPhone={patientPhone}
              onNameChange={setPatientName}
              onPhoneChange={setPatientPhone}
              onSubmit={handleSubmit}
              onBack={() => goBack('time')}
              submitting={submitting}
            />
          )}

          {step === 'success' && confirmationData && (
            <SuccessScreen
              professionalName={professionalName}
              address={address}
              selectedDate={selectedDate!}
              selectedSlot={selectedSlot!}
              patientPhone={patientPhone}
              status={confirmationData.status}
              onReset={reset}
            />
          )}

          {step === 'error' && (
            <ErrorScreen
              message={errorMsg}
              onRetry={() => goBack('form')}
              onReset={reset}
            />
          )}
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-30px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s ease-out;
        }
      `}</style>
    </section>
  );
}

// ═══════════════════════════════════════════
// Step 1: Date Picker
// ═══════════════════════════════════════════

function DatePicker({
  days,
  selectedDate,
  onSelect,
}: {
  days: Date[];
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
}) {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        Selecciona el día para tu cita:
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {days.map((day, i) => {
          const isSelected =
            selectedDate?.toDateString() === day.toDateString();
          const isToday = i === 0;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={`shrink-0 flex flex-col items-center justify-center w-[72px] min-h-[72px] rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-white text-gray-700 hover:border-primary/40 hover:bg-primary/5'
              }`}
            >
              <span className="text-[11px] font-medium uppercase tracking-wide">
                {isToday ? 'Hoy' : DAY_NAMES[day.getDay()]}
              </span>
              <span className="text-lg font-bold leading-tight">{day.getDate()}</span>
              <span className="text-[10px] text-gray-400">{MONTH_NAMES[day.getMonth()]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// Step 2: Time Slot Picker
// ═══════════════════════════════════════════

function TimeSlotPicker({
  slots,
  loading,
  selectedSlot,
  selectedDate,
  onSelect,
  onBack,
}: {
  slots: TimeSlot[];
  loading: boolean;
  selectedSlot: string | null;
  selectedDate: Date;
  onSelect: (time: string) => void;
  onBack: () => void;
}) {
  const availableCount = slots.filter((s) => s.available).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Cambiar fecha
        </button>
        <span className="text-xs text-gray-400">
          {DAY_NAMES[selectedDate.getDay()]} {formatDateLabel(selectedDate)}
        </span>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Consultando disponibilidad...</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">No hay horarios disponibles para esta fecha.</p>
          <button
            onClick={onBack}
            className="mt-3 text-sm text-primary font-medium hover:underline"
          >
            Elegir otra fecha
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-400 mb-3">
            {availableCount} horario{availableCount !== 1 ? 's' : ''} disponible{availableCount !== 1 ? 's' : ''}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                onClick={() => slot.available && onSelect(slot.time)}
                disabled={!slot.available}
                className={`min-h-[44px] rounded-lg text-sm font-medium transition-all ${
                  !slot.available
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : selectedSlot === slot.time
                      ? 'bg-primary text-white ring-2 ring-primary ring-offset-1'
                      : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 hover:border-green-300'
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// Step 3: Patient Form
// ═══════════════════════════════════════════

function PatientForm({
  selectedDate,
  selectedSlot,
  professionalName,
  patientName,
  patientPhone,
  onNameChange,
  onPhoneChange,
  onSubmit,
  onBack,
  submitting,
}: {
  selectedDate: Date;
  selectedSlot: string;
  professionalName: string;
  patientName: string;
  patientPhone: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  submitting: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Cambiar hora
        </button>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-3 mb-5 text-sm">
        <div className="flex items-center gap-2 text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {DAY_NAMES[selectedDate.getDay()]} {formatDateLabel(selectedDate)} a las <strong>{selectedSlot}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2 text-gray-500 mt-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>{professionalName}</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tu nombre completo
          </label>
          <input
            type="text"
            value={patientName}
            onChange={(e) => onNameChange(e.target.value)}
            required
            placeholder="Nombre y apellido"
            className="w-full px-3 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 py-3 text-sm text-gray-500 bg-gray-50 border border-r-0 border-border rounded-l-lg">
              +507
            </span>
            <input
              type="tel"
              value={patientPhone}
              onChange={(e) => {
                // Only allow digits, max 8
                const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                onPhoneChange(digits);
              }}
              required
              placeholder="6XXX-XXXX"
              inputMode="tel"
              className="flex-1 px-3 py-3 text-sm border border-border rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !patientName.trim() || patientPhone.length < 7}
          className="w-full bg-primary text-white font-medium text-sm py-3 rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Agendando...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Confirmar Cita
            </>
          )}
        </button>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════
// Success Screen
// ═══════════════════════════════════════════

function SuccessScreen({
  professionalName,
  address,
  selectedDate,
  selectedSlot,
  patientPhone,
  status,
  onReset,
}: {
  professionalName: string;
  address: string;
  selectedDate: Date;
  selectedSlot: string;
  patientPhone: string;
  status: string;
  onReset: () => void;
}) {
  const formattedPhone = patientPhone.length >= 7
    ? `+507 ${patientPhone.slice(0, 4)}-${patientPhone.slice(4)}`
    : `+507 ${patientPhone}`;

  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-1">Cita agendada</h3>
      <p className="text-sm text-gray-500 mb-5">{status}</p>

      {/* Summary card */}
      <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2.5 mb-5">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm text-gray-700">{professionalName}</span>
        </div>
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm text-gray-700">
            {DAY_NAMES[selectedDate.getDay()]} {formatDateLabel(selectedDate)} a las {selectedSlot}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-sm text-gray-700">{address}</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5">
        <p className="text-xs text-blue-700">
          Recibirás confirmación por WhatsApp al <strong>{formattedPhone}</strong>
        </p>
      </div>

      <button
        onClick={onReset}
        className="text-sm text-primary font-medium hover:underline"
      >
        Volver al perfil
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════
// Error Screen
// ═══════════════════════════════════════════

function ErrorScreen({
  message,
  onRetry,
  onReset,
}: {
  message: string;
  onRetry: () => void;
  onReset: () => void;
}) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-1">Error al agendar</h3>
      <p className="text-sm text-gray-500 mb-5">{message}</p>

      <div className="flex flex-col gap-2">
        <button
          onClick={onRetry}
          className="bg-primary text-white font-medium text-sm py-3 rounded-xl hover:bg-primary-hover transition-colors min-h-[44px]"
        >
          Reintentar
        </button>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Empezar de nuevo
        </button>
      </div>
    </div>
  );
}
