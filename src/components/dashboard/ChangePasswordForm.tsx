'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

// Mirrors the server-side policy in changePasswordSchema (issue #21).
const RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: 'Al menos 12 caracteres', test: (p) => p.length >= 12 },
  { label: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Un número', test: (p) => /[0-9]/.test(p) },
];

// Indexed by number of satisfied rules (0..4).
const STRENGTH = [
  { label: 'Muy débil', bar: 'w-1/4', color: 'bg-red-500', text: 'text-red-600' },
  { label: 'Débil', bar: 'w-1/4', color: 'bg-red-500', text: 'text-red-600' },
  { label: 'Media', bar: 'w-2/4', color: 'bg-amber-500', text: 'text-amber-600' },
  { label: 'Buena', bar: 'w-3/4', color: 'bg-yellow-500', text: 'text-yellow-600' },
  { label: 'Fuerte', bar: 'w-full', color: 'bg-green-500', text: 'text-green-600' },
];

export function ChangePasswordForm() {
  const { update } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const score = RULES.filter((r) => r.test(newPassword)).length;
  const allRulesMet = score === RULES.length;
  const matches = newPassword.length > 0 && newPassword === confirmPassword;
  const sameAsCurrent = newPassword.length > 0 && newPassword === currentPassword;
  const canSubmit =
    currentPassword.length > 0 && allRulesMet && matches && !sameAsCurrent && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: json.error || 'No se pudo cambiar la contraseña.' });
        return;
      }
      // Refresh this session's pwcAt (trigger 'update') so it survives while the
      // other sessions are invalidated server-side. See issue #21.
      await update();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage({
        type: 'success',
        text: 'Contraseña actualizada correctamente. Tus demás sesiones fueron cerradas.',
      });
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setSubmitting(false);
    }
  }

  const strength = STRENGTH[score];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <div
          className={`text-sm p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Current password */}
      <div>
        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
          Contraseña actual
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Tu contraseña actual"
        />
      </div>

      {/* New password */}
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
          Nueva contraseña
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Mínimo 12 caracteres"
        />

        {/* Strength meter */}
        {newPassword.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${strength.bar} ${strength.color}`} />
              </div>
              <span className={`text-xs font-medium ${strength.text}`}>{strength.label}</span>
            </div>
            <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
              {RULES.map((rule) => {
                const ok = rule.test(newPassword);
                return (
                  <li
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-300'}`} />
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {sameAsCurrent && (
          <p className="text-xs text-red-500 mt-1">La nueva contraseña debe ser diferente a la actual.</p>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
          Confirmar nueva contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          placeholder="Repite la nueva contraseña"
        />
        {confirmPassword.length > 0 && !matches && (
          <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden.</p>
        )}
        {matches && <p className="text-xs text-green-600 mt-1">Las contraseñas coinciden.</p>}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="bg-primary text-white font-medium text-sm px-6 py-3 rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Actualizando...' : 'Cambiar contraseña'}
      </button>
    </form>
  );
}
