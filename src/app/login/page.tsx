'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError('Email o contraseña incorrectos');
    } else {
      router.push('/dashboard');
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    setDevResetUrl('');
    setForgotLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const json = await res.json();

      if (!res.ok) {
        setForgotError(json.error || 'Error al enviar');
        return;
      }

      setForgotMessage(json.data.message);
      if (json.data.resetUrl) {
        setDevResetUrl(json.data.resetUrl);
      }
    } catch {
      setForgotError('Error de conexión');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Plexus<span className="text-primary">Map</span>
            </span>
          </a>
          <h1 className="text-xl font-semibold text-gray-900 mt-6">
            {showForgot ? 'Recuperar contraseña' : 'Iniciar sesión'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {showForgot
              ? 'Ingresa tu email para recibir un enlace de recuperación'
              : 'Accede a tu panel de profesional'}
          </p>
        </div>

        {showForgot ? (
          // Forgot password form
          <div className="bg-white rounded-xl border border-border p-6 space-y-4">
            {forgotMessage && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                {forgotMessage}
              </div>
            )}

            {devResetUrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700 font-medium mb-2">Dev Mode:</p>
                <a
                  href={devResetUrl}
                  className="inline-block text-xs font-medium bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700"
                >
                  Restablecer ahora
                </a>
              </div>
            )}

            {forgotError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {forgotError}
              </div>
            )}

            {!forgotMessage && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="tu@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading || !forgotEmail}
                  className="w-full bg-primary text-white font-medium text-sm py-3 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {forgotLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setShowForgot(false);
                setForgotMessage('');
                setForgotError('');
                setDevResetUrl('');
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Volver al login
            </button>
          </div>
        ) : (
          // Login form
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgot(true);
                    setForgotEmail(email); // pre-fill with login email
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-medium text-sm py-3 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿No tienes cuenta?{' '}
          <a href="/claim" className="text-primary hover:underline">
            Reclama tu perfil
          </a>
        </p>
      </div>
    </div>
  );
}
