import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { StatsOverview } from '@/components/dashboard/StatsOverview';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const professionalId = session?.user?.professionalId;

  if (!professionalId) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel de administración</h1>
        <p className="text-gray-500 mt-2">
          Bienvenido, {session?.user?.name}. Tu cuenta no está vinculada a un perfil profesional.
        </p>
      </div>
    );
  }

  const [professional, recentReviews, appointmentCount] = await Promise.all([
    prisma.professional.findUnique({
      where: { id: professionalId },
      include: { specialty: true },
    }),
    prisma.review.findMany({
      where: { professionalId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.appointment.count({
      where: {
        professionalId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    }),
  ]);

  if (!professional) {
    return <p className="text-gray-500">Perfil no encontrado.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Hola, {professional.name.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">
          {professional.specialty.icon} {professional.specialty.name}
        </p>
      </div>

      <StatsOverview
        stats={{
          rating: professional.rating,
          reviewCount: professional.reviewCount,
          pendingAppointments: appointmentCount,
          isVerified: professional.isVerified,
          profileViews: 0, // TODO: tracking
        }}
      />

      {/* Recent reviews */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reseñas recientes</h2>
        {recentReviews.length > 0 ? (
          <div className="space-y-3">
            {recentReviews.map((r) => (
              <div key={r.id} className="bg-white rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {r.patientName || 'Paciente'}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 ${s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                {r.comment && (
                  <p className="text-sm text-gray-500 mt-2">{r.comment}</p>
                )}
                {!r.reply && (
                  <a href="/dashboard/reviews" className="text-xs text-primary hover:underline mt-2 inline-block">
                    Responder
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No hay reseñas aún.</p>
        )}
      </section>
    </div>
  );
}
