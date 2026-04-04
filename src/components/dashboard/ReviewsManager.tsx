'use client';

import { useState } from 'react';
import type { ReviewSummary } from '@/types';

interface ReviewsManagerProps {
  reviews: ReviewSummary[];
}

export function ReviewsManager({ reviews }: ReviewsManagerProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [localReviews, setLocalReviews] = useState(reviews);
  const [saving, setSaving] = useState(false);

  const unreplied = localReviews.filter((r) => !r.reply).length;

  async function handleReply(reviewId: string) {
    if (!replyText.trim()) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/dashboard/reviews/${reviewId}/reply`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyText }),
      });

      if (!res.ok) throw new Error('Error');

      setLocalReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, reply: replyText } : r))
      );
      setReplyingTo(null);
      setReplyText('');
    } catch {
      alert('Error al enviar respuesta');
    } finally {
      setSaving(false);
    }
  }

  if (localReviews.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg font-medium">No hay reseñas aún</p>
        <p className="text-sm mt-1">Cuando tus pacientes dejen reseñas, aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unreplied > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
          Tienes {unreplied} reseña{unreplied > 1 ? 's' : ''} sin responder.
        </div>
      )}

      {localReviews.map((review) => {
        const date = new Date(review.createdAt);

        return (
          <div key={review.id} className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500">
                  {review.patientName?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {review.patientName || 'Paciente'}
                    </span>
                    {review.isVerified && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full">
                        Verificado
                      </span>
                    )}
                    {review.source === 'WHATSAPP' && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded-full">
                        WhatsApp
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {date.toLocaleDateString('es-PA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg key={s} xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${s <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`} viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>

            {review.comment && (
              <p className="text-sm text-gray-600 mt-3">{review.comment}</p>
            )}

            {/* Existing reply */}
            {review.reply && (
              <div className="mt-3 ml-4 pl-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-3">
                <p className="text-xs font-medium text-primary mb-1">Tu respuesta</p>
                <p className="text-sm text-gray-600">{review.reply}</p>
              </div>
            )}

            {/* Reply form */}
            {!review.reply && replyingTo === review.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Escribe tu respuesta..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReply(review.id)}
                    disabled={saving || !replyText.trim()}
                    className="bg-primary text-white text-xs font-medium px-4 py-2 rounded-lg hover:bg-primary-hover disabled:opacity-50"
                  >
                    {saving ? 'Enviando...' : 'Responder'}
                  </button>
                  <button
                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                    className="text-xs text-gray-500 px-4 py-2 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Reply button */}
            {!review.reply && replyingTo !== review.id && (
              <button
                onClick={() => setReplyingTo(review.id)}
                className="mt-3 text-xs text-primary font-medium hover:underline"
              >
                Responder
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
