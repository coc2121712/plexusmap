import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ChangePasswordForm } from '@/components/dashboard/ChangePasswordForm';

export default async function SecurityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Seguridad</h1>
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Cambiar contraseña</h2>
        <p className="text-sm text-gray-500 mb-6">
          Usa una contraseña única y robusta. Al cambiarla, se cerrarán automáticamente
          tus demás sesiones activas; esta sesión permanecerá abierta.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
