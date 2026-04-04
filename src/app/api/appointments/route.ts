// POST /api/appointments — Create an appointment via Kairos
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getKairosClient } from '@/lib/kairos-client';
import { createAppointmentSchema, parseBody } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = parseBody(createAppointmentSchema, body);
    if (!parsed.success) return parsed.response;

    const { professionalId, slot, patientName, patientPhone } = parsed.data;

    // Fetch professional
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: {
        id: true,
        kairosEnabled: true,
        kairosTenantId: true,
      },
    });

    if (!professional) {
      return NextResponse.json(
        { error: 'Profesional no encontrado' },
        { status: 404 }
      );
    }

    if (!professional.kairosEnabled) {
      return NextResponse.json(
        { error: 'Este profesional no tiene agendamiento habilitado' },
        { status: 404 }
      );
    }

    const tenantId = professional.kairosTenantId || professional.id;

    // Create appointment in Kairos
    const client = getKairosClient();
    const kairosResult = await client.createAppointment(tenantId, slot, {
      name: patientName,
      phone: patientPhone,
    });

    // Build dateTime from today + slot time
    const today = new Date().toISOString().split('T')[0];
    const [hours, minutes] = slot.split(':').map(Number);
    const dateTime = new Date(`${today}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`);

    // Save in PlexusMap DB
    const appointment = await prisma.appointment.create({
      data: {
        professionalId,
        patientName,
        patientPhone,
        dateTime,
        status: kairosResult.confirmed ? 'CONFIRMED' : 'PENDING',
        source: 'PLEXUSMAP',
        kairosAppointmentId: kairosResult.appointmentId,
      },
    });

    return NextResponse.json({
      data: {
        id: appointment.id,
        kairosAppointmentId: kairosResult.appointmentId,
        confirmed: kairosResult.confirmed,
        dateTime: appointment.dateTime.toISOString(),
        status: appointment.status,
      },
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Error al crear la cita' },
      { status: 500 }
    );
  }
}
