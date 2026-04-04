'use client';

import Link from 'next/link';

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-4 shrink-0 z-20">
      <div className="flex items-center gap-2">
        {/* Logo */}
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
        <span className="text-lg font-bold text-gray-900 tracking-tight">
          Plexus<span className="text-primary">Map</span>
        </span>
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
