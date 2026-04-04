'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ClaimData {
  claimId: string;
  email: string;
  name: string;
  professional: {
    id: string;
    slug: string;
    name: string;
  };
}

export function ClaimPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validate token on mount
  useEffect(() => {
    async function validateToken() {
      try {
        const res = await fetch(`/api/claim/verify?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!res.ok) {
          setError(json.error || 'Token inválido');
          return;
        }

        setClaimData(json.data);
      } catch {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/claim/verify/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Error al crear cuenta');
        return;
      }

      // Redirect to success state
      const params = new URLSearchParams({
        success: 'true',
        email: json.data.email,
        slug: json.data.slug,
      });
      router.push(`/claim/verify?${params.toString()}`);
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-500">Verificando token...</p>
      </div>
    );
  }

  if (error && !claimData) {
    return (
      <div className="text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Enlace inválido
        </h1>
        <p className="text-gray-600 mb-8">{error}</p>
        <a
          href="/claim"
          className="inline-flex items-center justify-center gap-2 bg-primary text-white font-medium text-sm px-6 py-3 rounded-xl hover:bg-primary-hover transition-colors"
        >
          Solicitar nuevo reclamo
        </a>
      </div>
    );
  }

  if (!claimData) return null;

  return (
    <div>
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Crea tu contraseña
        </h1>
        <p className="text-gray-600 mt-2 text-sm">
          Estás reclamando el perfil de <strong>{claimData.professional.name}</strong>
        </p>
      </div>

      {/* Claim info card */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {claimData.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{claimData.name}</p>
            <p className="text-xs text-gray-500">{claimData.email}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar contraseña
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Repite la contraseña"
          />
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
          )}
          {confirmPassword.length >= 8 && password === confirmPassword && (
            <p className="text-xs text-green-600 mt-1">Las contraseñas coinciden</p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting || password.length < 8 || password !== confirmPassword}
          className="w-full bg-primary text-white font-medium text-sm py-3 rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Creando cuenta...' : 'Crear cuenta y reclamar perfil'}
        </button>
      </form>
    </div>
  );
}
