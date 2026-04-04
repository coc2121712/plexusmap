import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ScheduleEditor } from '@/components/dashboard/ScheduleEditor';

export default async function SchedulePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.professionalId) {
    return <p className="text-gray-500">No tienes un perfil profesional vinculado.</p>;
  }

  const [schedules, professional] = await Promise.all([
    prisma.schedule.findMany({
      where: { professionalId: session.user.professionalId },
      orderBy: { dayOfWeek: 'asc' },
    }),
    prisma.professional.findUnique({
      where: { id: session.user.professionalId },
      select: { slug: true, cliniwebIcalUrl: true },
    }),
  ]);

  if (!professional) return <p className="text-gray-500">Perfil no encontrado.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Horario de atención</h1>
      <p className="text-sm text-gray-500 mb-6">
        Configura los días y horas en que atiendes pacientes.
      </p>
      <ScheduleEditor
        professionalId={session.user.professionalId}
        professionalSlug={professional.slug}
        cliniwebIcalUrl={professional.cliniwebIcalUrl}
        initialSchedules={schedules.map((s) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDuration: s.slotDuration,
          isActive: s.isActive,
        }))}
      />
    </div>
  );
}
