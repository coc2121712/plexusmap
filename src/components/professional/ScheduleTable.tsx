'use client';

import type { ScheduleSlot } from '@/types';

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface ScheduleTableProps {
  schedules: ScheduleSlot[];
}

export function ScheduleTable({ schedules }: ScheduleTableProps) {
  const today = new Date().getDay();

  if (schedules.length === 0) {
    return (
      <p className="text-sm text-gray-400">
        Horario no disponible
      </p>
    );
  }

  // Build a map for all 7 days
  const scheduleMap = new Map<number, ScheduleSlot>();
  schedules.forEach((s) => scheduleMap.set(s.dayOfWeek, s));

  return (
    <div className="space-y-1.5">
      {[1, 2, 3, 4, 5, 6, 0].map((day) => {
        const slot = scheduleMap.get(day);
        const isToday = day === today;

        return (
          <div
            key={day}
            className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
              isToday ? 'bg-primary/5 font-medium' : ''
            }`}
          >
            <span
              className={`${
                isToday ? 'text-primary' : slot ? 'text-gray-700' : 'text-gray-400'
              }`}
            >
              {DAY_LABELS[day]}
              {isToday && (
                <span className="ml-1.5 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full">
                  Hoy
                </span>
              )}
            </span>
            <span
              className={`text-xs ${
                slot ? (isToday ? 'text-primary' : 'text-gray-600') : 'text-gray-400'
              }`}
            >
              {slot ? `${slot.startTime} – ${slot.endTime}` : 'Cerrado'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
