'use client';

import { useState } from 'react';

interface ClaimProfessional {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  address: string;
}

interface ClaimFormProps {
  professional: ClaimProfessional;
}

export function ClaimForm({ professional }: ClaimFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [devVerifyUrl, setDevVerifyUrl] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professionalId: professional.id,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          message: message.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || 'Error al enviar solicitud');
        return;
      }

      setSuccess(true);
      if (json.data?.verifyUrl) {
        setDevVerifyUrl(json.data.verifyUrl);
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-border p-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Solicitud enviada</h2>
        <p className="text-gray-600 text-sm">
          Revisa tu correo electrónico para verificar tu identidad y activar tu cuenta.
        </p>

        {devVerifyUrl && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-xs text-amber-700 font-medium mb-2">Dev Mode: Verificar directamente</p>
            <a
              href={`/claim/verify?token=${devVerifyUrl.split('token=')[1]}`}
              className="inline-block text-xs font-medium bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
            >
              Crear cuenta ahora
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-border p-6 sm:p-8 space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Contact info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Tu nombre completo *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Dr. Juan Pérez"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="doctor@clinica.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Teléfono *
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full px-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="+507 6000-0000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Mensaje (opcional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          placeholder="Información adicional para verificar tu identidad..."
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !name || !email || !phone}
        className="w-full bg-primary text-white font-medium text-sm py-3 rounded-xl hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? 'Enviando...' : 'Enviar solicitud de reclamo'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Tu información será verificada antes de otorgarte acceso al perfil.
      </p>
    </form>
  );
}
