import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { HomeJsonLd } from '@/components/seo/JsonLd';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#0F7B5F',
  width: 'device-width',
  initialScale: 1,
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://plexusmap.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  title: {
    default: 'PlexusMap — Encuentra profesionales de salud en Panamá',
    template: '%s | PlexusMap',
  },
  description:
    'Directorio geolocalizado de doctores, dentistas, optómetras y más profesionales de salud en Panamá. Busca, compara y agenda tu cita.',
  keywords: [
    'salud',
    'doctores',
    'Panamá',
    'citas médicas',
    'directorio médico',
    'optometría',
    'dentista',
    'dermatólogo',
    'pediatra',
  ],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PlexusMap',
  },
  openGraph: {
    type: 'website',
    locale: 'es_PA',
    siteName: 'PlexusMap',
    title: 'PlexusMap — Encuentra profesionales de salud en Panamá',
    description:
      'Directorio geolocalizado de doctores, dentistas, optómetras y más. Busca, compara y agenda.',
    url: SITE_URL,
    images: [
      {
        url: `${SITE_URL}/api/og`,
        width: 1200,
        height: 630,
        alt: 'PlexusMap — Directorio de profesionales de salud en Panamá',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PlexusMap — Encuentra profesionales de salud en Panamá',
    description:
      'Directorio geolocalizado de doctores, dentistas, optómetras y más. Busca, compara y agenda.',
    images: [`${SITE_URL}/api/og`],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/icons/plexusmap/plexusmap-favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/plexusmap/plexusmap-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/plexusmap/plexusmap-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/plexusmap/plexusmap-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: [{ url: '/icons/plexusmap/plexusmap-180-apple-touch.png', sizes: '180x180' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <HomeJsonLd />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/plexusmap/plexusmap-180-apple-touch.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#4A7C59" />
      </head>
      <body className="h-full">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
