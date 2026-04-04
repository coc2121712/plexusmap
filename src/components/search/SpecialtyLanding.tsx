'use client';

import Image from 'next/image';
import { Header } from '@/components/ui/Header';
import type { ProfessionalSummary, SpecialtySummary } from '@/types';

interface SpecialtyLandingProps {
  specialty: SpecialtySummary;
  professionals: ProfessionalSummary[];
}

export function SpecialtyLanding({ specialty, professionals }: SpecialtyLandingProps) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      {/* Hero */}
      <div className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <a href="/" className="text-sm text-primary hover:underline mb-4 inline-block">
            ← Volver al directorio
          </a>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
            {specialty.icon} {specialty.name} en Panamá
          </h1>
          <p className="text-lg text-gray-500 mt-2">
            {professionals.length} profesional{professionals.length !== 1 ? 'es' : ''} disponible{professionals.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-8 w-full">
        {professionals.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-medium">No hay profesionales registrados aún</p>
            <p className="text-sm mt-2">Pronto agregaremos más profesionales en esta especialidad.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {professionals.map((pro) => (
              <ProfessionalRow key={pro.id} professional={pro} />
            ))}
          </div>
        )}
      </div>

      <footer className="mt-auto bg-white border-t border-border py-6 text-center text-xs text-gray-400">
        PlexusMap — Directorio de profesionales de salud en Panamá
      </footer>
    </div>
  );
}

function ProfessionalRow({ professional }: { professional: ProfessionalSummary }) {
  return (
    <a
      href={`/${professional.slug}`}
      className="flex items-start gap-4 bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/30 transition-all"
    >
      {/* Avatar */}
      <div className="shrink-0 w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden">
        {professional.photos.length > 0 ? (
          <Image
            src={professional.photos[0]}
            alt={professional.name}
            width={64}
            height={64}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-2xl">{professional.specialty.icon || '🩺'}</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900">{professional.name}</h2>
          {professional.isVerified && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        <p className="text-sm text-gray-500 mt-0.5">{professional.address}</p>

        <div className="flex items-center gap-4 mt-2">
          {/* Rating */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ${star <= Math.round(professional.rating) ? 'text-yellow-400' : 'text-gray-200'}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-sm font-medium text-gray-700 ml-1">
              {professional.rating.toFixed(1)}
            </span>
            <span className="text-sm text-gray-400">
              ({professional.reviewCount})
            </span>
          </div>
        </div>

        {/* Insurances */}
        {professional.insurances.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {professional.insurances.slice(0, 3).map((ins) => (
              <span
                key={ins}
                className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full"
              >
                {ins}
              </span>
            ))}
            {professional.insurances.length > 3 && (
              <span className="text-[11px] px-2 py-0.5 text-gray-400">
                +{professional.insurances.length - 3} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Arrow */}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-300 shrink-0 mt-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}
