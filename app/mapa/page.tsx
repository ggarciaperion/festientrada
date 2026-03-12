'use client';

import Link from 'next/link';
import MapSection from '@/app/components/MapSection';

function IconBack() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function MapaPage() {
  return (
    <main className="relative min-h-screen z-10">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090F]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/#mapa" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition">
            <IconBack /> <span>Volver al inicio</span>
          </Link>
          <span className="font-heading font-bold text-white text-sm hidden sm:block">
            Mapa Interactivo · Selección de Boxes
          </span>
          <div />
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="mb-8">
          <span className="section-label">Selección de Boxes</span>
          <h1 className="section-title">Mapa Interactivo del Venue</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Haz click en un box disponible para reservarlo · 10 minutos para completar la compra
          </p>
        </div>

        <MapSection />
      </div>
    </main>
  );
}
