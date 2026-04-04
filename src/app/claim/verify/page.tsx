import { Metadata } from 'next';
import { Header } from '@/components/ui/Header';
import { ClaimPasswordForm } from '@/components/claim/ClaimPasswordForm';

export const metadata: Metadata = {
  title: 'Verificación — PlexusMap',
};

export default async function ClaimVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; success?: string; slug?: string; email?: string }>;
}) {
  const { token, success, slug, email } = await searchParams;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 max-w-lg mx-auto px-4 py-16 w-full">
        {success === 'true' ? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Cuenta creada exitosamente
            </h1>
            <p className="text-gray-600 mb-2">
              Tu cuenta ha sido creada con el email <strong>{email}</strong>.
            </p>
            <p className="text-gray-600 mb-8">
              Ya puedes iniciar sesión y gestionar tu perfil profesional.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-primary text-white font-medium text-sm px-6 py-3 rounded-xl hover:bg-primary-hover transition-colors"
              >
                Iniciar sesión
              </a>
              {slug && (
                <a
                  href={`/${slug}`}
                  className="inline-flex items-center justify-center gap-2 bg-white border border-border text-gray-700 font-medium text-sm px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Ver mi perfil
                </a>
              )}
            </div>
          </div>
        ) : token ? (
          <ClaimPasswordForm token={token} />
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Verificación pendiente
            </h1>
            <p className="text-gray-600 mb-8">
              Revisa tu correo electrónico para completar la verificación de tu perfil.
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-white border border-border text-gray-700 font-medium text-sm px-6 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Volver al inicio
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
