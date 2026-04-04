// ═══════════════════════════════════════════
// iCal Feed Parser — Cliniweb & generic iCal
// ═══════════════════════════════════════════
//
// TODO: For production, set up a cron job (e.g. every 10 minutes) that calls
// syncICalForAll() to keep all professionals with cliniwebIcalUrl in sync.
// This avoids stale availability data and removes the need for manual sync.

import ICAL from 'ical.js';

export interface ICalEvent {
  start: Date;
  end: Date;
  summary: string;
  status: string;
}

/**
 * Fetch and parse an iCal feed URL, returning future events.
 * Returns empty array on any error (network, parse, malformed).
 */
export async function parseICalFeed(url: string): Promise<ICalEvent[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/calendar' },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`iCal fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const text = await res.text();
    if (!text.includes('BEGIN:VCALENDAR')) {
      console.error('iCal feed does not contain valid VCALENDAR data');
      return [];
    }

    const jcalData = ICAL.parse(text);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    const events: ICalEvent[] = [];

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent);

      const start = event.startDate?.toJSDate();
      const end = event.endDate?.toJSDate();

      if (!start || !end) continue;

      // Only future events (today or later)
      if (end < now) continue;

      events.push({
        start,
        end,
        summary: event.summary || '',
        status: vevent.getFirstPropertyValue('status')?.toString() || 'CONFIRMED',
      });
    }

    // Sort by start date
    events.sort((a, b) => a.start.getTime() - b.start.getTime());

    return events;
  } catch (err) {
    console.error('Error parsing iCal feed:', err);
    return [];
  }
}

/**
 * Convert iCal events into a set of occupied time slot keys.
 * Returns strings like "2026-04-03:09:00", "2026-04-03:09:30" for
 * each 30-minute slot that overlaps with an event.
 */
export function eventsToOccupiedSlots(
  events: ICalEvent[],
  slotDurationMinutes: number = 30
): Set<string> {
  const occupied = new Set<string>();

  for (const event of events) {
    // Skip cancelled events
    if (event.status === 'CANCELLED') continue;

    const start = event.start.getTime();
    const end = event.end.getTime();
    const slotMs = slotDurationMinutes * 60 * 1000;

    // Walk through each slot that this event overlaps
    // Align to slot boundaries starting from event start hour
    let cursor = start - (start % slotMs); // align to slot boundary
    if (cursor < start) cursor = start - (start % slotMs);

    while (cursor < end) {
      const d = new Date(cursor);
      const dateStr = d.toISOString().split('T')[0];
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      occupied.add(`${dateStr}:${hours}:${mins}`);
      cursor += slotMs;
    }
  }

  return occupied;
}
