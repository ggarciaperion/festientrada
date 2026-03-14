'use client';

import { useEffect, useState } from 'react';

// Launch: March 14 2026 at 4:00 PM Peru time (UTC-5) = 21:00 UTC
export const LAUNCH_DATE = new Date('2026-03-14T21:00:00Z');
const LAUNCH = LAUNCH_DATE;

interface TimeLeft { h: number; m: number; s: number }

export default function CountdownModal() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [launched, setLaunched] = useState(false);

  useEffect(() => {
    // Already past launch — never show
    if (Date.now() >= LAUNCH.getTime()) return;

    const tick = () => {
      const diff = LAUNCH.getTime() - Date.now();
      if (diff <= 0) {
        setLaunched(true);
        setTimeLeft({ h: 0, m: 0, s: 0 });
        return;
      }
      setTimeLeft({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1_000),
      });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-hide 3 s after launch
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!launched) return;
    const t = setTimeout(() => setGone(true), 3000);
    return () => clearTimeout(t);
  }, [launched]);

  if (!timeLeft || gone) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop — non-clickable, fully blocks the page */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative bg-[#09090F] border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">

        {/* Top accent line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] rounded-full bg-gradient-to-r from-amber-500/0 via-amber-400 to-amber-500/0" />

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5 text-2xl">
          🎺
        </div>

        {launched ? (
          <>
            <p className="font-heading font-black text-2xl text-amber-400 mb-2">¡Ya está disponible!</p>
            <p className="text-slate-400 text-sm">La venta de entradas está abierta ahora.</p>
          </>
        ) : (
          <>
            <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold mb-2">
              Festival de Salsa y Timba · Chancay 2026
            </p>
            <p className="font-heading font-black text-white text-xl sm:text-2xl leading-tight mb-1">
              La venta inicia en
            </p>
            <p className="text-slate-500 text-xs mb-7">Hoy, 29 de marzo · 4:00 PM</p>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-3 mb-7">
              {[
                { value: pad(timeLeft.h), label: 'horas'    },
                { value: pad(timeLeft.m), label: 'minutos'  },
                { value: pad(timeLeft.s), label: 'segundos' },
              ].map(({ value, label }, i) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                      <span className="font-heading font-black text-3xl sm:text-4xl text-amber-400 tabular-nums">
                        {value}
                      </span>
                    </div>
                    <span className="text-slate-600 text-[10px] uppercase tracking-wider mt-1.5">{label}</span>
                  </div>
                  {i < 2 && <span className="text-amber-500/50 font-heading font-black text-2xl -mt-5">:</span>}
                </div>
              ))}
            </div>

            <p className="text-slate-500 text-xs mb-6 leading-relaxed">
              Prepárate para asegurar tu lugar.<br/>
              Boxes y entradas en zonas Platinum, VIP y Malecón.
            </p>
          </>
        )}

        {launched && (
          <p className="text-slate-500 text-xs mt-2">Cerrando en unos segundos...</p>
        )}
      </div>
    </div>
  );
}
