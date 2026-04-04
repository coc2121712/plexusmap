// PUT /api/dashboard/schedule — Update professional schedule
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { scheduleUpdateSchema, parseBody } from '@/lib/validations';

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.professionalId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = parseBody(scheduleUpdateSchema, body);
    if (!parsed.success) return parsed.response;

    const { schedules } = parsed.data;
    const professionalId = session.user.professionalId;

    // Delete all existing schedules and recreate
    await prisma.schedule.deleteMany({ where: { professionalId } });

    const activeSchedules = schedules.filter((s) => s.isActive);

    if (activeSchedules.length > 0) {
      await prisma.schedule.createMany({
        data: activeSchedules.map((s) => ({
          professionalId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDuration: s.slotDuration,
        })),
      });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Error al actualizar horario' }, { status: 500 });
  }
}
