'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-4 shrink-0 z-20">
      <div className="flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo-plexusmap.png"
            alt="PlexusMap"
            width={52}
            height={52}
            className="h-13 w-auto"
            priority
          />
          <span className="hidden sm:block text-lg font-semibold text-gray-900 tracking-tight">
            PlexusMap
          </span>
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/claim"
          className="hidden sm:inline-flex text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Soy profesional
        </Link>
        <Link
          href="/login"
          className="text-sm font-medium text-white bg-primary hover:bg-primary-hover px-4 py-2 rounded-lg transition-colors"
        >
          Iniciar sesión
        </Link>
      </div>
    </header>
  );
}
