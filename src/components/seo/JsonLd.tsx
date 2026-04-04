// Schema.org JSON-LD structured data for Google Rich Results
import type { ProfessionalDetail, ReviewSummary, ScheduleSlot } from '@/types';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface JsonLdProps {
  professional: ProfessionalDetail;
  url: string;
}

export function ProfessionalJsonLd({ professional, url }: JsonLdProps) {
  const openingHours = professional.schedules
    .filter((s) => s.isActive)
    .map((s) => `${DAY_NAMES[s.dayOfWeek]} ${s.startTime}-${s.endTime}`);

  const reviews = professional.reviews.slice(0, 10).map((r) => ({
    '@type': 'Review',
    reviewRating: {
      '@type': 'Rating',
      ratingValue: r.rating,
      bestRating: 5,
    },
    author: {
      '@type': 'Person',
      name: r.patientName || 'Paciente',
    },
    ...(r.comment ? { reviewBody: r.comment } : {}),
    datePublished: r.createdAt,
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: professional.name,
    description: professional.bio || `${professional.specialty.name} en Panamá`,
    url,
    image: professional.photos[0] || undefined,
    telephone: professional.phone || undefined,
    email: professional.email || undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: professional.address,
      addressLocality: 'Ciudad de Panamá',
      addressCountry: 'PA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: professional.lat,
      longitude: professional.lng,
    },
    openingHours: openingHours.length > 0 ? openingHours : undefined,
    medicalSpecialty: professional.specialty.name,
    aggregateRating:
      professional.reviewCount > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: professional.rating,
            reviewCount: professional.reviewCount,
            bestRating: 5,
          }
        : undefined,
    review: reviews.length > 0 ? reviews : undefined,
    ...(professional.insurances.length > 0
      ? {
          paymentAccepted: professional.insurances.join(', '),
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Home page — WebSite + MedicalOrganization
export function HomeJsonLd() {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'PlexusMap',
      url: 'https://plexusmap.com',
      description:
        'Directorio geolocalizado de profesionales de salud en Panamá. Busca doctores, dentistas, optómetras y más.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://plexusmap.com?query={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'MedicalOrganization',
      name: 'PlexusMap',
      url: 'https://plexusmap.com',
      description:
        'Directorio de profesionales de salud verificados en Panamá.',
      areaServed: {
        '@type': 'Country',
        name: 'Panamá',
      },
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
