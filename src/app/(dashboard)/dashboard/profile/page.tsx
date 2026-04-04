import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { ProfileEditor } from '@/components/dashboard/ProfileEditor';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.professionalId) {
    return <p className="text-gray-500">No tienes un perfil profesional vinculado.</p>;
  }

  const professional = await prisma.professional.findUnique({
    where: { id: session.user.professionalId },
    include: {
      specialty: true,
      insurances: { include: { insurance: true } },
    },
  });

  if (!professional) redirect('/dashboard');

  const allInsurances = await prisma.insurance.findMany({ orderBy: { name: 'asc' } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mi Perfil</h1>
      <ProfileEditor
        professional={{
          id: professional.id,
          name: professional.name,
          phone: professional.phone || '',
          email: professional.email || '',
          bio: professional.bio || '',
          address: professional.address,
          lat: professional.lat,
          lng: professional.lng,
          cliniwebIcalUrl: professional.cliniwebIcalUrl || '',
          currentInsurances: professional.insurances.map((pi) => pi.insurance.id),
        }}
        allInsurances={allInsurances.map((i) => ({ id: i.id, name: i.name }))}
      />
    </div>
  );
}
