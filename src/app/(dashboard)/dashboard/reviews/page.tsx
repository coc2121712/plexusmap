import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ReviewsManager } from '@/components/dashboard/ReviewsManager';

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.professionalId) {
    return <p className="text-gray-500">No tienes un perfil profesional vinculado.</p>;
  }

  const reviews = await prisma.review.findMany({
    where: { professionalId: session.user.professionalId },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = reviews.map((r) => ({
    id: r.id,
    patientName: r.patientName,
    rating: r.rating,
    comment: r.comment,
    reply: r.reply,
    source: r.source,
    isVerified: r.isVerified,
    helpfulCount: r.helpfulCount,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Reseñas</h1>
      <p className="text-sm text-gray-500 mb-6">
        Gestiona y responde las reseñas de tus pacientes.
      </p>
      <ReviewsManager reviews={mapped} />
    </div>
  );
}
