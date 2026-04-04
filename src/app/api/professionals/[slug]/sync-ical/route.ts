// POST /api/professionals/[slug]/sync-ical — Sync iCal feed into occupied appointments
// Requires auth: only the professional owner or admin
//
// TODO: For production, implement a cron job that calls this for all professionals
// with cliniwebIcalUrl every 10 minutes to keep availability data fresh.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { parseICalFeed, eventsToOccupiedSlots } from '@/lib/ical-parser';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { slug } = await params;

  const professional = await prisma.professional.findUnique({
    where: { slug },
    select: {
      id: true,
      cliniwebIcalUrl: true,
      user: { select: { id: true } },
    },
  });

  if (!professional) {
    return NextResponse.json({ error: 'Profesional no encontrado' }, { status: 404 });
  }

  // Only allow the linked user or admin
  const isOwner = professional.user?.id === session.user.id;
  const isAdmin = session.user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (!professional.cliniwebIcalUrl) {
    return NextResponse.json(
      { error: 'Este profesional no tiene una URL de iCal configurada' },
      { status: 400 }
    );
  }

  try {
    // Parse the iCal feed
    const events = await parseICalFeed(professional.cliniwebIcalUrl);

    if (events.length === 0) {
      return NextResponse.json({
        data: { synced: 0, total: 0, message: 'No se encontraron eventos futuros en el feed.' },
      });
    }

    // Convert events to occupied slots
    const occupied = eventsToOccupiedSlots(events);

    // Create appointments for occupied slots that don't already exist
    let synced = 0;

    for (const slotKey of occupied) {
      // slotKey format: "2026-04-03:09:00"
      const [dateStr, hours, mins] = slotKey.split(':');
      if (!dateStr || hours === undefined || mins === undefined) continue;

      const dateTime = new Date(`${dateStr}T${hours}:${mins}:00`);
      if (isNaN(dateTime.getTime())) continue;

      // Check if appointment already exists at this time
      const existing = await prisma.appointment.findFirst({
        where: {
          professionalId: professional.id,
          dateTime,
          source: 'PHONE', // iCal imports marked as PHONE source
        },
      });

      if (!existing) {
        await prisma.appointment.create({
          data: {
            professionalId: professional.id,
            patientName: 'Cliniweb',
            patientPhone: '',
            dateTime,
            status: 'CONFIRMED',
            source: 'PHONE', // External source
            kairosAppointmentId: `ical-${slotKey}`,
          },
        });
        synced++;
      }
    }

    return NextResponse.json({
      data: {
        synced,
        total: events.length,
        occupiedSlots: occupied.size,
        message: `Sincronizados ${synced} slots de ${events.length} eventos.`,
      },
    });
  } catch (error) {
    console.error('Error syncing iCal:', error);
    return NextResponse.json(
      { error: 'Error al sincronizar el calendario' },
      { status: 500 }
    );
  }
}
