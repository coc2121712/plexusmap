'use client';

import type { ReviewSummary } from '@/types';

interface ReviewCardProps {
  review: ReviewSummary;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const date = new Date(review.createdAt);
  const timeAgo = getTimeAgo(date);

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500">
            {review.patientName
              ? review.patientName.charAt(0).toUpperCase()
              : 'P'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">
                {review.patientName || 'Paciente'}
              </span>
              {review.isVerified && (
                <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded-full border border-green-100">
                  Verificado
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">{timeAgo}</span>
          </div>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-0.5 shrink-0">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${
                star <= review.rating ? 'text-yellow-400' : 'text-gray-200'
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>

      {review.comment && (
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">
          {review.comment}
        </p>
      )}

      {/* Professional's reply */}
      {review.reply && (
        <div className="mt-3 ml-4 pl-4 border-l-2 border-primary/30">
          <p className="text-xs font-medium text-primary mb-1">
            Respuesta del profesional
          </p>
          <p className="text-sm text-gray-600">{review.reply}</p>
        </div>
      )}

      {/* Source badge */}
      {review.source === 'WHATSAPP' && (
        <div className="mt-3">
          <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
            vía WhatsApp
          </span>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
  return `Hace ${Math.floor(diffDays / 365)} año${Math.floor(diffDays / 365) > 1 ? 's' : ''}`;
}
