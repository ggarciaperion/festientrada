'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface TicketPayload {
  id: string; orderId: string; type: string;
  zone: string; qty: number; name: string; ts: number;
}
interface InfoResponse {
  ok: boolean; payload?: TicketPayload;
  total?: number; remaining?: number; used?: boolean;
  scans?: Array<{ at: string; count: number }>; error?: string;
}

// 'auto'    = non-general: auto-confirms all on load, no interaction
// 'select'  = general: staff chooses count each scan
type Mode      = 'auto' | 'select';
type PageState = 'loading' | 'confirming' | 'ready' | 'done' | 'exhausted' | 'invalid';

const ZONE_LABEL: Record<string, string> = {
  platinum: 'PLATINUM', vip: 'VIP', malecon: 'BOX MALECÓN', general: 'GENERAL',
};
const ZONE_COLOR: Record<string, string> = {
  platinum: '#FACC15', vip: '#a855f7', malecon: '#0ea5e9', general: '#3b82f6',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}
function plural(n: number, word: string) { return `${n} ${word}${n !== 1 ? 's' : ''}`; }

// ── Page ─────────────────────────────────────────────────────
export default function ValidarPage() {
  const params = useParams<{ token: string }>();
  const token  = decodeURIComponent(params?.token ?? '');

  const [state,   setState]   = useState<PageState>('loading');
  const [mode,    setMode]    = useState<Mode>('auto');
  const [info,    setInfo]    = useState<InfoResponse | null>(null);
  const [count,   setCount]   = useState(1);
  const [result,  setResult]  = useState<{ entered: number; remaining: number; total: number } | null>(null);
  const [error,   setError]   = useState('');

  const zone = info?.payload?.zone ?? '';

  // ── Load info on mount ────────────────────────────────────
  useEffect(() => {
    if (!token) { setState('invalid'); setError('Token no encontrado.'); return; }

    fetch(`/api/tickets/info?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then((data: InfoResponse) => {
        if (!data.ok || !data.payload) {
          setError(data.error ?? 'Entrada inválida.'); setState('invalid'); return;
        }
        setInfo(data);

        if ((data.remaining ?? 0) <= 0) { setState('exhausted'); return; }

        const isGeneral = data.payload!.zone === 'general';

        if (isGeneral) {
          // General: staff selects how many enter each scan (default 1)
          setCount(1);
          setMode('select');
          setState('ready');
        } else {
          // Platinum / VIP / Malecón: show confirmation screen, staff must press button
          setMode('auto');
          setState('ready');
        }
      })
      .catch(() => { setError('Error de red.'); setState('invalid'); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Confirm helper ────────────────────────────────────────
  const confirmEntries = (tok: string, qty: number) => {
    fetch('/api/tickets/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tok, count: qty }),
    })
      .then(r => r.json())
      .then((data: { ok: boolean; entered?: number; remaining?: number; total?: number; alreadyUsed?: boolean; error?: string }) => {
        if (data.ok) {
          setResult({ entered: data.entered!, remaining: data.remaining!, total: data.total! });
          setState('done');
        } else if (data.alreadyUsed) {
          setState('exhausted');
        } else {
          setError(data.error ?? 'Error al registrar.');
          setState('ready');
        }
      })
      .catch(() => { setError('Error de red.'); setState('ready'); });
  };

  const handleConfirm = () => {
    setState('confirming');
    confirmEntries(token, count);
  };

  const remaining = info?.remaining ?? 0;
  const total     = info?.total     ?? 0;
  const name      = info?.payload?.name ?? '';
  const scans     = info?.scans ?? [];

  return (
    <div className="min-h-screen bg-[#07071a] flex flex-col items-center justify-center p-4">

      <div className="mb-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Perion Entertainment</p>
        <p className="text-xs text-slate-500">Festival de Salsa y Timba · Chancay 2026</p>
      </div>

      <div className="w-full max-w-sm space-y-3">

        {/* ── LOADING / AUTO-CONFIRMING ── */}
        {(state === 'loading' || (state === 'confirming' && mode === 'auto')) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-400">
              {state === 'confirming' ? 'Registrando ingreso...' : 'Verificando entrada...'}
            </p>
          </div>
        )}

        {/* ── PLATINUM / VIP / MALECÓN: confirmación manual ── */}
        {state === 'ready' && mode === 'auto' && info?.payload && (
          <div className="rounded-2xl overflow-hidden border-2 border-amber-400">
            <div className="bg-amber-500 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="font-black text-white text-base">ENTRADA VÁLIDA</p>
                <p className="text-amber-100 text-xs">Confirma antes de entregar pulsera</p>
              </div>
            </div>
            <div className="bg-[#07071a] px-5 py-3 space-y-2 border-b border-white/5">
              <Row label="Nombre" value={name} />
              <Row label="Zona"   value={ZONE_LABEL[zone] ?? zone.toUpperCase()} color={ZONE_COLOR[zone]} />
              <Row label="Pulseras" value={`${total}`} />
            </div>
            <div className="bg-[#07071a] px-5 pb-5 pt-3">
              {error && <p className="text-rose-400 text-xs mb-3 text-center">{error}</p>}
              <button onClick={() => { setState('confirming'); confirmEntries(token, remaining); }}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95
                           text-black font-black text-base py-4 transition">
                ENTREGAR {plural(remaining, 'PULSERA')}
              </button>
            </div>
          </div>
        )}

        {/* ── GENERAL: selector de cantidad ── */}
        {state === 'ready' && mode === 'select' && info?.payload && (
          <div className="rounded-2xl overflow-hidden border-2 border-emerald-400">

            {/* Status */}
            <div className="bg-emerald-600 px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <p className="font-black text-white text-base">ENTRADA VÁLIDA</p>
                <p className="text-emerald-200 text-xs">
                  {remaining} de {total} {remaining === 1 ? 'entrada' : 'entradas'} disponibles
                </p>
              </div>
              {/* Dots */}
              <div className="ml-auto flex gap-1 flex-wrap max-w-[60px] justify-end">
                {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
                  <div key={i}
                    className={`w-2 h-2 rounded-full ${i < remaining ? 'bg-emerald-300' : 'bg-emerald-900'}`}
                  />
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="bg-[#07071a] px-5 py-3 space-y-2 border-b border-white/5">
              <Row label="Nombre" value={name} />
              <Row label="Zona"   value={ZONE_LABEL[zone] ?? zone.toUpperCase()} color={ZONE_COLOR[zone]} />
              <Row label="Tipo"   value="Entrada individual" />
            </div>

            {/* Count selector */}
            <div className="bg-[#0a0a1e] px-5 py-4">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 text-center">
                ¿Cuántas personas ingresan ahora?
              </p>
              <div className="flex items-center justify-center gap-5">
                <button onClick={() => setCount(c => Math.max(1, c - 1))} disabled={count <= 1}
                  className="w-12 h-12 rounded-full bg-white/10 text-white text-2xl font-bold
                             hover:bg-white/20 active:scale-95 transition disabled:opacity-30">−</button>
                <div className="text-center min-w-[60px]">
                  <p className="text-white font-black text-5xl leading-none">{count}</p>
                  <p className="text-slate-500 text-xs mt-1">{count === 1 ? 'persona' : 'personas'}</p>
                </div>
                <button onClick={() => setCount(c => Math.min(remaining, c + 1))} disabled={count >= remaining}
                  className="w-12 h-12 rounded-full bg-white/10 text-white text-2xl font-bold
                             hover:bg-white/20 active:scale-95 transition disabled:opacity-30">+</button>
              </div>
              {remaining > 1 && count < remaining && (
                <p className="text-center text-amber-500/70 text-xs mt-3">
                  Quedarán {remaining - count} {remaining - count === 1 ? 'entrada' : 'entradas'} para usar después
                </p>
              )}
            </div>

            <div className="bg-[#07071a] px-5 pb-5 pt-3">
              {error && <p className="text-rose-400 text-xs mb-3 text-center">{error}</p>}
              <button onClick={handleConfirm}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95
                           text-black font-black text-base py-4 transition">
                REGISTRAR {count === 1 ? '1 ENTRADA' : `${count} ENTRADAS`}
              </button>
            </div>
          </div>
        )}

        {/* ── CONFIRMING (general mode) ── */}
        {state === 'confirming' && mode === 'select' && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="w-10 h-10 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-400">Registrando ingreso...</p>
          </div>
        )}

        {/* ── DONE ── */}
        {state === 'done' && result && info?.payload && (
          <div className="rounded-2xl overflow-hidden border-2 border-emerald-400">
            <div className="bg-emerald-600 px-5 py-5 text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="font-black text-white text-xl">
                {mode === 'auto' ? 'ACCESO AUTORIZADO' : 'INGRESO REGISTRADO'}
              </p>
              <p className="text-emerald-100 text-sm mt-1">
                {mode === 'auto'
                  ? `Entregar ${plural(result.entered, zone === 'malecon' ? 'pulsera' : 'pulsera')}`
                  : plural(result.entered, 'entrada') + ' registrada' + (result.entered !== 1 ? 's' : '')}
              </p>
            </div>

            {/* Main highlight */}
            <div className="bg-[#0a2a0a] px-5 py-4 text-center border-b border-emerald-900">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">
                {mode === 'auto' ? 'Entregar' : 'Ingresos registrados'}
              </p>
              <p className="text-white font-black text-4xl">
                {mode === 'auto'
                  ? plural(result.entered, 'pulsera')
                  : plural(result.entered, 'entrada')}
              </p>
            </div>

            <div className="bg-[#07071a] px-5 py-3 space-y-2">
              <Row label="Nombre" value={name} />
              <Row label="Zona"   value={ZONE_LABEL[zone] ?? zone.toUpperCase()} color={ZONE_COLOR[zone]} />
            </div>

            {result.remaining > 0 ? (
              <div className="bg-amber-500/10 border-t border-amber-500/20 px-5 py-3 text-center">
                <p className="text-amber-400 font-bold">
                  {plural(result.remaining, 'entrada')} restantes
                </p>
                <p className="text-amber-600 text-xs mt-0.5">
                  El QR sigue activo — puede volver a escanearse
                </p>
              </div>
            ) : (
              <div className="bg-slate-800/40 border-t border-white/5 px-5 py-3 text-center">
                <p className="text-slate-400 text-sm">QR completamente utilizado</p>
              </div>
            )}
          </div>
        )}

        {/* ── EXHAUSTED ── */}
        {state === 'exhausted' && (
          <div className="rounded-2xl overflow-hidden border-2 border-rose-500">
            <div className="bg-rose-600 px-5 py-5 text-center">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <p className="font-black text-white text-xl">
                {zone === 'general' ? 'ENTRADAS AGOTADAS' : 'YA ENTREGADO'}
              </p>
              <p className="text-rose-100 text-sm mt-1">Este QR ya fue completamente utilizado</p>
            </div>
            {info?.payload && (
              <div className="bg-[#07071a] px-5 py-4 space-y-2">
                <Row label="Nombre" value={name} />
                <Row label="Zona"   value={ZONE_LABEL[zone] ?? zone.toUpperCase()} color={ZONE_COLOR[zone]} />
                {scans.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-slate-500 text-xs mb-2">Historial:</p>
                    {scans.map((s, i) => (
                      <p key={i} className="text-slate-400 text-xs">
                        {fmtTime(s.at)} — {s.count} {s.count === 1 ? 'entrada' : 'entradas'}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="bg-rose-950/40 px-5 py-4 text-center">
              <p className="text-rose-300 text-sm font-semibold">
                {zone === 'general'
                  ? 'Todas las entradas de este QR ya fueron utilizadas'
                  : 'Las pulseras de este acceso ya fueron entregadas'}
              </p>
              <p className="text-rose-700 text-xs mt-1">Si hay dudas, consulta con el administrador</p>
            </div>
          </div>
        )}

        {/* ── INVALID ── */}
        {state === 'invalid' && (
          <div className="rounded-2xl overflow-hidden border-2 border-slate-600">
            <div className="bg-slate-700 px-5 py-5 text-center">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </div>
              <p className="font-black text-white text-xl">QR INVÁLIDO</p>
            </div>
            <div className="bg-[#07071a] px-5 py-4 text-center">
              <p className="text-slate-400 text-sm">{error || 'El código QR no es válido o fue manipulado.'}</p>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-slate-700">
          Sistema de validación · Perion Entertainment
        </p>

      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-right text-white" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
