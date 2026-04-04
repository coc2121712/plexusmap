// ═══════════════════════════════════════════
// Kairos Mock Client — Development & testing
// ═══════════════════════════════════════════

import type { TimeSlot } from '@/types';
import type { KairosClientInterface } from '@/lib/kairos-client';

// Simple deterministic hash from string → number (for seeded randomness)
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

// Seeded pseudo-random: returns 0-1 based on seed
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export class KairosMockClient implements KairosClientInterface {
  async getAvailability(tenantId: string, date: string): Promise<TimeSlot[]> {
    // Simulate network latency (100-300ms)
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));

    const seed = hashCode(`${tenantId}:${date}`);
    const slots: TimeSlot[] = [];

    // 8:00 AM to 5:00 PM, every 30 minutes = 18 slots
    for (let i = 0; i < 18; i++) {
      const hour = 8 + Math.floor(i / 2);
      const minute = (i % 2) * 30;
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;

      // 30% chance of being unavailable (seeded by date + tenant for consistency)
      const available = seededRandom(seed, i) > 0.3;

      slots.push({ time, available });
    }

    return slots;
  }

  async createAppointment(
    tenantId: string,
    slot: string,
    patient: { name: string; phone: string }
  ): Promise<{ appointmentId: string; confirmed: boolean }> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    // Generate a fake appointment ID
    const appointmentId = `mock-${tenantId.slice(0, 8)}-${Date.now().toString(36)}`;

    // 90% chance of immediate confirmation
    const confirmed = Math.random() > 0.1;

    console.log(
      `[KairosMock] Created appointment: ${appointmentId} for ${patient.name} at ${slot} (confirmed: ${confirmed})`
    );

    return { appointmentId, confirmed };
  }

  async getAppointmentStatus(
    appointmentId: string
  ): Promise<{ status: string; dateTime: string }> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 100 + Math.random() * 150));

    return {
      status: 'CONFIRMED',
      dateTime: new Date().toISOString(),
    };
  }
}
