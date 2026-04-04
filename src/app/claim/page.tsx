import { Metadata } from 'next';
import { Header } from '@/components/ui/Header';
import { ClaimSearch } from '@/components/claim/ClaimSearch';

export const metadata: Metadata = {
  title: 'Reclamar perfil — PlexusMap',
  description: 'Reclama tu perfil profesional en PlexusMap para gestionar tu información, responder reseñas y recibir citas.',
};

export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ professional?: string; error?: string }>;
}) {
  const { professional: preselectedSlug, error } = await searchParams;

  const errorMessages: Record<string, string> = {
    invalid: 'El enlace de verificación es inválido o ha expirado.',
    'already-processed': 'Esta solicitud ya fue procesada.',
    'already-claimed': 'Este perfil ya fue reclamado por otro profesional.',
    server: 'Ocurrió un error. Intenta de nuevo.',
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reclama tu perfil</h1>
          <p className="text-gray-600 mt-2">
            Verifica tu identidad para gestionar tu información, responder reseñas y recibir citas en PlexusMap.
          </p>
        </div>

        {error && errorMessages[error] && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {errorMessages[error]}
          </div>
        )}

        <ClaimSearch preselectedSlug={preselectedSlug || null} />
      </main>
    </div>
  );
}
