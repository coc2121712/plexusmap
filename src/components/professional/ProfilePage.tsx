'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/ui/Header';
import { ReviewCard } from '@/components/professional/ReviewCard';
import { ScheduleTable } from '@/components/professional/ScheduleTable';
import { ContactActions } from '@/components/professional/ContactActions';
import { MiniMap } from '@/components/professional/MiniMap';
import { PublicReviewForm } from '@/components/professional/PublicReviewForm';
import { BookingWidget } from '@/components/booking/BookingWidget';
import type { ProfessionalDetail, ReviewSummary } from '@/types';

interface ProfilePageProps {
  professional: ProfessionalDetail;
}

export function ProfilePage({ professional }: ProfilePageProps) {
  const [localReviews, setLocalReviews] = useState<ReviewSummary[]>(professional.reviews);
  const [localCount, setLocalCount] = useState(professional.reviewCount);

  function handleReviewAdded(review: { id: string; patientName: string; rating: number; comment: string | null; createdAt: string }) {
    const newReview: ReviewSummary = {
      ...review,
      reply: null,
      source: 'PLEXUSMAP',
      isVerified: false,
      helpfulCount: 0,
    };
    setLocalReviews((prev) => [newReview, ...prev]);
    setLocalCount((c) => c + 1);
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <main className="flex-1">
        {/* Hero section */}
        <div className="bg-white border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden">
                  {professional.photos.length > 0 ? (
                    <Image
                      src={professional.photos[0]}
                      alt={professional.name}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                      priority
                    />
                  ) : (
                    <span className="text-5xl">{professional.specialty.icon || '🩺'}</span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {professional.name}
                  </h1>
                  {professional.isVerified && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 shrink-0 mt-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                <p className="text-lg text-gray-600 mt-1">
                  {professional.specialty.icon} {professional.specialty.name}
                </p>

                {/* Rating */}
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 ${
                          star <= Math.round(professional.rating)
                            ? 'text-yellow-400'
                            : 'text-gray-200'
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {professional.rating.toFixed(1)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({professional.reviewCount} reseña{professional.reviewCount !== 1 ? 's' : ''})
                  </span>
                </div>

                {/* Address */}
                <p className="text-sm text-gray-500 mt-2 flex items-start gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {professional.address}
                </p>

                {/* Insurances */}
                {professional.insurances.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {professional.insurances.map((ins) => (
                      <span
                        key={ins}
                        className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-100"
                      >
                        {ins}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Contact actions (desktop) */}
              <div className="hidden sm:block shrink-0">
                <ContactActions professional={professional} />
              </div>
            </div>
          </div>
        </div>

        {/* Contact actions (mobile) */}
        <div className="sm:hidden bg-white border-b border-border px-4 py-3">
          <ContactActions professional={professional} />
        </div>

        {/* Content grid */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Bio */}
              {professional.bio && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Acerca de
                  </h2>
                  <p className="text-gray-600 leading-relaxed">
                    {professional.bio}
                  </p>
                </section>
              )}

              {/* Booking Widget — only for Kairos-enabled professionals */}
              {professional.kairosEnabled && (
                <BookingWidget
                  professionalId={professional.id}
                  professionalName={professional.name}
                  address={professional.address}
                />
              )}

              {/* Reviews */}
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Reseñas ({localCount})
                </h2>

                {/* Public review form */}
                <div className="mb-6">
                  <PublicReviewForm
                    professionalSlug={professional.slug}
                    professionalName={professional.name}
                    onReviewAdded={handleReviewAdded}
                  />
                </div>

                {localReviews.length > 0 ? (
                  <div className="space-y-4">
                    {localReviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">
                    Sé el primero en dejar una reseña.
                  </p>
                )}
              </section>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Schedule */}
              <section className="bg-white rounded-xl border border-border p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3">
                  Horario de atención
                </h2>
                <ScheduleTable schedules={professional.schedules} />
              </section>

              {/* Mini map */}
              <section className="bg-white rounded-xl border border-border overflow-hidden">
                <MiniMap
                  lat={professional.lat}
                  lng={professional.lng}
                  name={professional.name}
                  address={professional.address}
                />
              </section>

              {/* Claim CTA */}
              {!professional.isClaimed && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      ¿Eres este profesional?
                    </h3>
                  </div>
                  <p className="text-gray-600 text-xs mb-3">
                    Reclama tu perfil gratis y toma control de tu presencia en línea.
                  </p>
                  <ul className="space-y-1.5 mb-4">
                    {[
                      'Editar tu biografía y fotos',
                      'Agregar tu número de WhatsApp',
                      'Responder reseñas de pacientes',
                      'Recibir consultas de pacientes',
                      'Aparecer más alto en búsquedas',
                    ].map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2 text-xs text-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={`/claim?professional=${professional.slug}`}
                    className="flex items-center justify-center gap-2 w-full text-sm font-medium bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Reclamar mi perfil — Gratis
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-6 text-center text-xs text-gray-400">
        PlexusMap — Directorio de profesionales de salud en Panamá
      </footer>
    </div>
  );
}
