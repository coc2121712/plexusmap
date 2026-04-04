// GET /api/appointments/availability?professionalId=xxx&date=YYYY-MM-DD
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getKairosClient } from '@/lib/kairos-client';

export async function GET(request: NextRequest) {
  try {
    const professionalId = request.nextUrl.searchParams.get('professionalId');
    const date = request.nextUrl.searchParams.get('date');

    if (!professionalId || !date) {
      return NextResponse.json(
        { error: 'professionalId y date son requeridos' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Formato de fecha inválido. Usa YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Fetch professional
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId },
      select: {
        id: true,
        name: true,
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

    // Use professionalId as tenantId fallback if kairosTenantId is not set
    const tenantId = professional.kairosTenantId || professional.id;

    const client = getKairosClient();
    const slots = await client.getAvailability(tenantId, date);

    return NextResponse.json({
      data: {
        professionalId: professional.id,
        professionalName: professional.name,
        date,
        slots,
      },
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Error al consultar disponibilidad' },
      { status: 500 }
    );
  }
}
