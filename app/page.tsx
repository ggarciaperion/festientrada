'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import MapSection from '@/app/components/MapSection';

/* ── Zone definitions ──────────────────────────────────── */
const ZONES = [
  {
    id:       'platinum',
    name:     'PLATINUM',
    label:    'Experiencia Premium',
    price:    200,
    accent:   '#D4A017',
    text:     'text-amber-400',
    bg:       'bg-amber-500',
    dim:      'bg-amber-500/10',
    border:   'border-amber-500/30',
    badge:    null,
    features: [
      'Zona frontal al escenario',
      'Mesa reservada con servicio de botella',
      'Meet & Greet con artistas',
      'Regalo exclusivo del festival',
      'Acceso a lounge VIP',
      'Ingreso preferencial sin cola',
    ],
  },
  {
    id:       'supervip',
    name:     'SUPER VIP',
    label:    'Acceso Privilegiado',
    price:    150,
    accent:   '#DC2626',
    text:     'text-rose-400',
    bg:       'bg-rose-600',
    dim:      'bg-rose-500/10',
    border:   'border-rose-500/30',
    badge:    'MÁS POPULAR',
    features: [
      'Zona preferencial demarcada',
      'Acceso a barra exclusiva',
      'Vista privilegiada del escenario',
      'Ingreso con fila preferencial',
    ],
  },
  {
    id:       'vip',
    name:     'VIP',
    label:    'Zona Premium',
    price:    100,
    accent:   '#7C3AED',
    text:     'text-violet-400',
    bg:       'bg-violet-600',
    dim:      'bg-violet-500/10',
    border:   'border-violet-500/30',
    badge:    null,
    features: [
      'Zona VIP demarcada',
      'Mejor ubicación que general',
      'Acceso a barra VIP',
      'Ingreso con fila preferencial',
    ],
  },
  {
    id:       'general',
    name:     'GENERAL',
    label:    'Acceso al Festival',
    price:    50,
    accent:   '#2563EB',
    text:     'text-blue-400',
    bg:       'bg-blue-600',
    dim:      'bg-blue-500/10',
    border:   'border-blue-500/30',
    badge:    null,
    features: [
      'Acceso completo al festival',
      'Zona pista general',
      'Vista al escenario principal',
    ],
  },
] as const;

/* ── Artists ───────────────────────────────────────────── */
const ARTISTS = [
  { id: 1, name: 'Chevy y su Caliente',           role: 'Salsa · Timba',    grad: 'from-amber-700 to-yellow-500',  accent: '#D4A017', star: true,  video: '/videos/chevy.mp4' },
  { id: 2, name: 'Alex Ramírez La Leyenda',       role: 'Salsa · Timba',    grad: 'from-rose-800  to-red-600',     accent: '#f43f5e', star: false, video: '/videos/alex.mp4' },
  { id: 3, name: 'El Charangón y su Salsa Koc',   role: 'Salsa · Charanga', grad: 'from-violet-800 to-purple-600', accent: '#a855f7', star: false, video: '/videos/charangon.mp4' },
  { id: 4, name: "Bair y los K'bos de la Salsa",  role: 'Salsa',            grad: 'from-blue-800  to-cyan-600',    accent: '#0ea5e9', star: false, video: '/videos/bair.mp4' },
  { id: 5, name: 'DJ Xian Romero',                role: 'DJ',               grad: 'from-teal-700  to-emerald-600', accent: '#10b981', star: false, video: '/videos/xian.mp4' },
];

/* ── FAQ data ───────────────────────────────────────────── */
const FAQ = [
  {
    q: '¿Cómo compro mis entradas?',
    a: 'La compra es 100% online. Selecciona tu zona, completa tus datos y realiza el pago. Recibirás tu ticket digital con código QR al instante en tu correo electrónico.',
  },
  {
    q: '¿Hay puntos de venta físicos?',
    a: 'No. Para garantizar la autenticidad de cada ticket, todas las entradas se venden únicamente de forma online a través de esta página.',
  },
  {
    q: '¿Cómo funciona el código QR?',
    a: 'Cada entrada tiene un QR único e irrepetible. Al llegar al evento, presenta tu QR en el acceso para que sea escaneado y validado. Una vez validado no puede volver a usarse.',
  },
  {
    q: '¿Puedo comprar varias entradas?',
    a: 'Sí, puedes comprar hasta 10 entradas en una sola orden. Cada entrada tendrá su propio código QR individual.',
  },
  {
    q: '¿Las entradas son reembolsables?',
    a: 'Las entradas no son reembolsables, pero sí son transferibles. Puedes enviar tu ticket digital a otra persona si no puedes asistir al evento.',
  },
  {
    q: '¿Cuál es el horario del evento?',
    a: 'El festival inicia a las 20:00 horas del Domingo 29 de Marzo de 2026. Las puertas abrirán a las 19:00. Te recomendamos llegar con anticipación.',
  },
  {
    q: '¿Qué pasa si pierdo mi ticket?',
    a: 'Tu ticket está vinculado a tu correo electrónico. Siempre podrás descargarlo nuevamente desde el email de confirmación que recibirás al comprar.',
  },
];

/* ── Icons (SVG inline para no depender de librerías) ─── */
function IconCalendar() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
function IconLocation() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2"
      className={`shrink-0 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}
function IconMap() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="1.5">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconTicket() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}
function IconNote() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.25)">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6"  cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1L10.5 5.5H14.5L11.5 8.5L12.5 13L8 10.5L3.5 13L4.5 8.5L1.5 5.5H5.5L8 1Z" fill="#D4A017"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────── */
export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <main className="relative min-h-screen z-10">

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090F]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <IconStar />
            </div>
            <span className="font-heading font-bold text-white text-sm">
              Perion Entertainment
            </span>
          </Link>

          {/* Links desktop */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#evento"   className="nav-link">El Evento</a>
            <a href="#artistas" className="nav-link">Artistas</a>
            <a href="#mapa"     className="nav-link">Mapa Boxes</a>
            <a href="#faq"      className="nav-link">FAQ</a>
          </div>

          {/* CTA */}
          <Link href="/comprar" className="btn-primary text-sm px-5 py-2.5 shrink-0 hidden sm:inline-flex">
            Comprar entradas
          </Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="hero-glow" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center z-10 py-10 sm:py-24">

          {/* Label */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-3 sm:mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-amber-400 text-xs font-semibold tracking-widest uppercase">
              Chancay · Perú · 2026
            </span>
          </div>

          {/* Title */}
          <h1 className="font-heading font-black leading-[0.92] tracking-tight text-white mb-3 sm:mb-6"
              style={{ fontSize: 'clamp(2.75rem, 10vw, 6rem)' }}>
            FESTIVAL<br />
            <span className="text-amber-400">DE SALSA</span><br />
            Y TIMBA
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-base sm:text-xl max-w-xl mx-auto mb-3 sm:mb-8">
            El primer festival de salsa y timba en el Malecón del Puerto de Chancay.
            Una noche de ritmo, sabor y baile frente al mar.
          </p>

          {/* Info pills */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-4 sm:mb-10">
            <div className="info-badge">
              <IconCalendar />
              Domingo 29 de Marzo, 2026
            </div>
            <div className="info-badge">
              <IconClock />
              Desde las 4:00 PM
            </div>
            <div className="info-badge">
              <IconLocation />
              Malecón del Puerto, Chancay
            </div>
          </div>

          {/* Countdown */}
          {mounted && <Countdown targetDate="2026-03-29T20:00:00" />}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-5 sm:mt-10">
            <a href="#mapa" className="btn-primary text-base px-8 py-3.5">
              Comprar Entradas
            </a>
            <a href="#mapa" className="btn-secondary text-base px-8 py-3.5">
              Ver Zonas y Precios
            </a>
          </div>

          {/* Trust */}
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 mt-3 sm:mt-8">
            <div className="trust-badge"><IconShield />Compra segura</div>
            <div className="trust-badge"><IconTicket />Ticket digital instantáneo</div>
            <div className="trust-badge"><IconLock />QR único e irrepetible</div>
          </div>
        </div>
      </section>


      {/* ── Artists ─────────────────────────────────────────── */}
      <section id="artistas" className="py-5 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-4 sm:mb-8">
            <span className="section-label">Artistas</span>
            <h2 className="section-title">Line Up</h2>
            <p className="text-slate-400 mt-3 text-sm">
              Artistas confirmados · Una noche de salsa y timba frente al mar
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
            {ARTISTS.map((a) => (
              <div
                key={a.id}
                className="artist-card"
                style={a.star ? { boxShadow: `0 0 0 1.5px ${a.accent}55, 0 4px 24px ${a.accent}22` } : undefined}
              >
                {/* Avatar */}
                <div className={`relative aspect-square overflow-hidden bg-gradient-to-br ${a.grad} flex items-center justify-center`}>
                  {a.video ? (
                    <>
                      <video
                        src={a.video}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* overlay sutil */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />
                    </>
                  ) : (
                    <IconNote />
                  )}
                </div>
                {/* Info */}
                <div className="p-2.5 sm:p-4">
                  <p className="font-heading font-bold text-white text-xs sm:text-sm leading-snug">{a.name}</p>
                  <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5">{a.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Interactive Map ──────────────────────────────────── */}
      <section id="mapa" className="py-5 sm:py-10 bg-white/[0.015]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-5 sm:mb-10">
            <span className="section-label">Selección de Boxes</span>
            <h2 className="section-title">Elige tu zona del evento</h2>
            <p className="text-slate-400 mt-3 text-sm max-w-xl mx-auto">
              Haz click en cualquier box disponible para reservarlo. Tienes 10 minutos para completar la compra.
            </p>
          </div>
          <MapSection />
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="py-5 sm:py-10 bg-white/[0.015]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-4 sm:mb-8">
            <span className="section-label">Ayuda</span>
            <h2 className="section-title">Preguntas Frecuentes</h2>
          </div>

          <div>
            {FAQ.map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 mb-6 sm:gap-8 sm:mb-10">

            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-2">
              <p className="font-heading font-bold text-white text-lg mb-2">Perion Entertainment</p>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Organizadores de eventos y experiencias musicales únicas en Perú.
              </p>
            </div>

            {/* Contacto */}
            <div>
              <p className="font-semibold text-white text-sm mb-4">Contacto</p>
              <div className="space-y-2">
                <a href="mailto:info@perionentertainment.com"
                   className="block text-sm text-slate-400 hover:text-white transition">
                  info@perionentertainment.com
                </a>
                <a href="tel:+51999999999"
                   className="block text-sm text-slate-400 hover:text-white transition">
                  +51 999 999 999
                </a>
                <p className="text-sm text-slate-400">Lima, Perú</p>
              </div>
            </div>

            {/* Links */}
            <div>
              <p className="font-semibold text-white text-sm mb-4">Festival</p>
              <div className="space-y-2">
                <a href="#evento"   className="block text-sm text-slate-400 hover:text-white transition">El Evento</a>
                <a href="#artistas" className="block text-sm text-slate-400 hover:text-white transition">Artistas</a>
                <a href="#zonas"    className="block text-sm text-slate-400 hover:text-white transition">Zonas</a>
                <a href="#faq"      className="block text-sm text-slate-400 hover:text-white transition">FAQ</a>
                <Link href="/comprar"
                      className="block text-sm text-amber-400 hover:text-amber-300 transition font-semibold mt-1">
                  Comprar Entradas →
                </Link>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-slate-600 text-xs">
              © 2026 Perion Entertainment. Todos los derechos reservados.
            </p>
            <p className="text-slate-700 text-xs">Festival de Salsa y Timba · Chancay 2026</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ── Countdown ─────────────────────────────────────────── */
function Countdown({ targetDate }: { targetDate: string }) {
  const [t, setT] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff > 0) {
        setT({
          days:    Math.floor(diff / 86_400_000),
          hours:   Math.floor((diff % 86_400_000) / 3_600_000),
          minutes: Math.floor((diff % 3_600_000)  / 60_000),
          seconds: Math.floor((diff % 60_000)      / 1_000),
        });
      }
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const units = [
    { value: t.days,    label: 'Días'  },
    { value: t.hours,   label: 'Horas' },
    { value: t.minutes, label: 'Min'   },
    { value: t.seconds, label: 'Seg'   },
  ];

  return (
    <div>
      <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold mb-4">Faltan</p>
      <div className="flex justify-center gap-3">
        {units.map(({ value, label }) => (
          <div key={label} className="countdown-unit">
            <div className="countdown-number">{String(value).padStart(2, '0')}</div>
            <div className="countdown-label">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FAQ Item ───────────────────────────────────────────── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="faq-item">
      <button className="faq-trigger" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <IconChevron open={open} />
      </button>
      {open && <div className="faq-content">{answer}</div>}
    </div>
  );
}
