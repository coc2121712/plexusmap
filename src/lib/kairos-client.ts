// ═══════════════════════════════════════════
// Kairos Client — Appointment scheduling bridge
// ═══════════════════════════════════════════

import type { TimeSlot } from '@/types';

// ─── Shared interface ───

export interface KairosClientInterface {
  getAvailability(tenantId: string, date: string): Promise<TimeSlot[]>;
  createAppointment(
    tenantId: string,
    slot: string,
    patient: { name: string; phone: string }
  ): Promise<{ appointmentId: string; confirmed: boolean }>;
  getAppointmentStatus(
    appointmentId: string
  ): Promise<{ status: string; dateTime: string }>;
}

// ─── Real client (calls Kairos API) ───

export class KairosClient implements KairosClientInterface {
  private baseUrl: string;
  private apiKey: string;
  private maxRetries = 3;
  private timeoutMs = 10_000;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // strip trailing slash
    this.apiKey = apiKey;
  }

  async getAvailability(tenantId: string, date: string): Promise<TimeSlot[]> {
    const data = await this.request<{ slots: TimeSlot[] }>(
      'GET',
      `/api/tenants/${tenantId}/availability?date=${date}`
    );
    return data.slots;
  }

  async createAppointment(
    tenantId: string,
    slot: string,
    patient: { name: string; phone: string }
  ): Promise<{ appointmentId: string; confirmed: boolean }> {
    return this.request<{ appointmentId: string; confirmed: boolean }>(
      'POST',
      `/api/tenants/${tenantId}/appointments`,
      { slot, patientName: patient.name, patientPhone: patient.phone }
    );
  }

  async getAppointmentStatus(
    appointmentId: string
  ): Promise<{ status: string; dateTime: string }> {
    return this.request<{ status: string; dateTime: string }>(
      'GET',
      `/api/appointments/${appointmentId}`
    );
  }

  // ─── HTTP with retry + exponential backoff ───

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Kairos-Key': this.apiKey,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const errorBody = await res.text().catch(() => '');
          throw new Error(`Kairos API ${res.status}: ${errorBody || res.statusText}`);
        }

        return (await res.json()) as T;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Don't retry on client errors (4xx)
        if (lastError.message.includes('Kairos API 4')) {
          throw lastError;
        }

        // Exponential backoff: 500ms, 1000ms, 2000ms
        if (attempt < this.maxRetries - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 * Math.pow(2, attempt))
          );
        }
      }
    }

    throw lastError || new Error('Kairos API request failed after retries');
  }
}

// ─── Factory: returns mock or real client ───

let _client: KairosClientInterface | null = null;

export function getKairosClient(): KairosClientInterface {
  if (_client) return _client;

  const baseUrl = process.env.KAIROS_API_URL;
  const apiKey = process.env.KAIROS_API_KEY || '';

  if (baseUrl) {
    _client = new KairosClient(baseUrl, apiKey);
  } else {
    // Dynamic import avoided — use lazy init
    const { KairosMockClient } = require('@/lib/kairos-mock');
    _client = new KairosMockClient() as KairosClientInterface;
  }

  return _client;
}
