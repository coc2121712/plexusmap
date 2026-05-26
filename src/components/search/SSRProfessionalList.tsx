import type { ProfessionalSummary } from '@/types';
import Link from 'next/link';

/**
 * Server-rendered list of professionals that appears in the raw HTML.
 * This ensures Google (and other crawlers) see real content even if
 * the client-side React app hasn't hydrated yet.
 *
 * Hidden from interactive users via CSS (the client HomePage takes over),
 * but fully visible in the page source / to non-JS crawlers.
 */
export function SSRProfessionalList({ professionals }: { professionals: ProfessionalSummary[] }) {
  if (!professionals || professionals.length === 0) return null;

  return (
    <section
      aria-label="Directorio de profesionales de salud en Panamá"
      className="sr-only"
      // sr-only makes it invisible to sighted users but fully readable by crawlers
      // Google renders CSS, but the content is still in the DOM and indexable
    >
      <h2>Profesionales de Salud en Panamá</h2>
      <p>
        Encuentra médicos, dentistas, oftalmólogos y especialistas de salud en Panamá.
        Directorio completo con ubicación, seguros aceptados y contacto directo.
      </p>
      <ul>
        {professionals.map((p) => (
          <li key={p.id}>
            <Link href={`/${p.slug}`}>
              <strong>{p.name}</strong>
            </Link>
            {p.specialty && <span> — {p.specialty.name}</span>}
            {p.address && <span>, {p.address}</span>}
            {p.rating && <span> · {p.rating}★ ({p.reviewCount} reseñas)</span>}
            {p.insurances && p.insurances.length > 0 && (
              <span> · Seguros: {p.insurances.join(', ')}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
