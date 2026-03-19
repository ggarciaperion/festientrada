'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
const CheckoutPanel = dynamic(() => import('./CheckoutPanel'), { ssr: false });
import {
  getBoxSVGPos,
  BOX_PRICES,
  ZONE_COLORS,
  STATUS_COLORS,
  RESERVATION_MS,
  type Box,
  type BoxZone,
  type BoxStatus,
} from '@/lib/boxes';
import { isDiscountActive, getPrice, DISCOUNT_LABEL } from '@/lib/pricing';

// ── Session helpers ───────────────────────────────────────────
function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem('box-session');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('box-session', sid);
  }
  return sid;
}
function saveReservation(boxId: string) {
  sessionStorage.setItem('box-reservation', JSON.stringify({ boxId, at: Date.now() }));
}
function clearReservation() {
  sessionStorage.removeItem('box-reservation');
}
function getReservationMs(): number {
  const raw = sessionStorage.getItem('box-reservation');
  if (!raw) return 0;
  const { at } = JSON.parse(raw) as { boxId: string; at: number };
  return Math.max(0, RESERVATION_MS - (Date.now() - at));
}

// ── Helpers ──────────────────────────────────────────────────
function fmtMs(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── Icons ────────────────────────────────────────────────────
function IconSpin()  { return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4"/></svg>; }
function IconTimer() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function IconLock()  { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function IconCheck() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>; }
function IconBox()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>; }
function IconTicket(){ return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="12" x2="15" y2="12"/></svg>; }
function IconBack()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>; }

// ── Venue SVG Map ────────────────────────────────────────────
const SELECTED_STYLE = { fill: '#1e3a5f', stroke: '#60a5fa', text: '#93c5fd' };

// Returns which zones are fully sold out (no available or temp_reserved boxes)
function soldOutZones(boxes: Box[]): Record<BoxZone, boolean> {
  const zones: BoxZone[] = ['platinum', 'vip', 'malecon'];
  const result = {} as Record<BoxZone, boolean>;
  for (const zone of zones) {
    const zoneBoxes = boxes.filter(b => b.zone === zone);
    result[zone] = zoneBoxes.length > 0 && zoneBoxes.every(b => b.status === 'sold');
  }
  return result;
}

// SVG stamp overlay for a sold-out zone
function SoldOutStamp({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <g pointerEvents="none">
      {/* dim overlay */}
      <rect x={x} y={y} width={w} height={h} fill="#000" fillOpacity="0.55" rx="2" />
      {/* rotated stamp */}
      <g transform={`rotate(-30, ${cx}, ${cy})`}>
        <rect x={cx - 72} y={cy - 22} width={144} height={44} rx="4"
          fill="none" stroke="#ef4444" strokeWidth="3" strokeOpacity="0.9" />
        <rect x={cx - 68} y={cy - 18} width={136} height={36} rx="3"
          fill="none" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.5" />
        <text x={cx} y={cy + 7} textAnchor="middle" fontSize="22"
          fill="#ef4444" fillOpacity="0.95" fontWeight="900" letterSpacing="6">
          AGOTADO
        </text>
      </g>
    </g>
  );
}

function VenueMap({
  boxes,
  onBoxClick,
  selectedBoxId,
}: {
  boxes: Box[];
  onBoxClick: (box: Box) => void;
  selectedBoxId?: string | null;
}) {
  const soldOut = soldOutZones(boxes);
  return (
    <svg
      viewBox="0 0 620 620"
      className="w-full select-none"
      style={{ fontFamily: 'var(--font-inter), sans-serif', touchAction: 'manipulation' }}
    >
      <rect x="30" y="20" width="560" height="570" rx="4" fill="#0d0d1a" stroke="#334155" strokeWidth="1.5" />

      <rect x="30"  y="20" width="85"  height="50" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="72"  y="49" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">BAÑOS</text>
      <rect x="115" y="20" width="105" height="50" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="168" y="49" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">BARRA</text>
      <rect x="220" y="20" width="370" height="50" rx="4" fill="#1a1209" stroke="#D4A017" strokeWidth="1.5" />
      <text x="405" y="50" textAnchor="middle" fontSize="14" fill="#D4A017" fontWeight="800" letterSpacing="3">ESCENARIO</text>

      <line x1="220" y1="70"  x2="220" y2="395" stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="30"  y1="395" x2="590" y2="395" stroke="#334155" strokeWidth="1" />

      <text x="186" y="265" fontSize="9" fill="#0ea5e9" fontWeight="700" letterSpacing="2"
        textAnchor="middle" transform="rotate(-90, 186, 265)">BOX MALECÓN</text>

      <rect x="220" y="70" width="370" height="18" fill="#1a1209" />
      <text x="405" y="83" textAnchor="middle" fontSize="8.5" fill="#D4A017" fontWeight="700" letterSpacing="1.5">
        ★  PLATINUM — Box S/{getPrice(BOX_PRICES.platinum.full)}  ·  Entrada S/{getPrice(BOX_PRICES.platinum.individual)}
      </text>
      <line x1="220" y1="226" x2="590" y2="226" stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
      <rect x="220" y="233" width="370" height="14" fill="#0f0520" />
      <text x="405" y="244" textAnchor="middle" fontSize="8.5" fill="#a855f7" fontWeight="700" letterSpacing="1.5">
        VIP — Box S/{getPrice(BOX_PRICES.vip.full)}  ·  Entrada S/{getPrice(BOX_PRICES.vip.individual)}
      </text>

      <rect x="30" y="395" width="560" height="125" fill="#0a0a14" />
      <text x="310" y="463" textAnchor="middle" fontSize="20" fill="#1e3a5f" fontWeight="800" letterSpacing="4">GENERAL</text>
      <text x="310" y="482" textAnchor="middle" fontSize="10" fill="#1e293b">Acceso libre · Zona pista</text>

      <rect x="30"  y="520" width="95"  height="70" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="77"  y="559" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">ENTRADA</text>
      <rect x="210" y="520" width="130" height="70" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="275" y="559" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">BARRA</text>
      <rect x="455" y="520" width="135" height="70" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="522" y="559" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">BAÑOS</text>
      <text x="16" y="280" textAnchor="middle" fontSize="9" fill="#1e293b" fontWeight="700" letterSpacing="2"
        transform="rotate(-90, 16, 280)">PLAYA</text>

      {boxes.map(box => {
        const pos        = getBoxSVGPos(box);
        const isSelected = selectedBoxId === box.id;
        const colors     = isSelected ? SELECTED_STYLE : STATUS_COLORS[box.status];
        const isClickable = box.status === 'available';
        const cx = pos.x + pos.w / 2;
        const cy = pos.y + pos.h / 2;
        return (
          <g key={box.id} onClick={() => isClickable && onBoxClick(box)}
            style={{ cursor: isClickable ? 'pointer' : 'default' }}>
            <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="2"
              fill={colors.fill} stroke={colors.stroke}
              strokeWidth={isSelected ? 2 : 1.2} />
            {isSelected && (
              <rect x={pos.x - 2} y={pos.y - 2} width={pos.w + 4} height={pos.h + 4} rx="4"
                fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="3 2" />
            )}
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize="7.5" fill={colors.text} fontWeight="700">
              {box.id}
            </text>
          </g>
        );
      })}

      {/* ── Sold-out zone stamps ── */}
      {soldOut.platinum && <SoldOutStamp x={221} y={88}  w={368} h={136} />}
      {soldOut.vip      && <SoldOutStamp x={221} y={247} w={368} h={146} />}
      {soldOut.malecon  && <SoldOutStamp x={31}  y={71}  w={187} h={322} />}
    </svg>
  );
}

// ── Shared form fields ───────────────────────────────────────
type FormData   = { name: string; email: string; phone: string; dni: string };
type FormErrors = Partial<FormData>;

function validateForm(f: FormData): FormErrors {
  const e: FormErrors = {};
  if (!f.name.trim()) e.name = 'Requerido';
  if (!f.email.trim() || !/\S+@\S+\.\S+/.test(f.email)) e.email = 'Correo inválido';
  if (!/^\d{9}$/.test(f.phone)) e.phone = 'Debe tener exactamente 9 dígitos';
  if (!f.dni.trim() || f.dni.length < 8) e.dni = 'Debe tener 8 o 9 dígitos';
  return e;
}

function FormFields({
  data, errors, onChange,
}: {
  data: FormData; errors: FormErrors; onChange: (f: FormData) => void;
}) {
  const fields = [
    { id: 'name',  label: 'Nombre completo',    type: 'text',  ph: 'Juan Pérez García',  numeric: false },
    { id: 'dni',   label: 'DNI',                type: 'text',  ph: '12345678',           numeric: true  },
    { id: 'email', label: 'Correo electrónico', type: 'email', ph: 'tu@email.com',       numeric: false },
    { id: 'phone', label: 'Teléfono',           type: 'tel',   ph: '999999999',          numeric: true  },
  ] as const;
  return (
    <div className="space-y-3">
      {fields.map(({ id, label, type, ph, numeric }) => (
        <div key={id}>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
          <input
            type={type}
            inputMode={numeric ? 'numeric' : undefined}
            value={data[id]}
            placeholder={ph}
            required
            onChange={e => {
              let v = e.target.value;
              if (id === 'phone') v = v.replace(/\D/g, '').slice(0, 9);
              if (id === 'dni')   v = v.replace(/\D/g, '').slice(0, 9);
              onChange({ ...data, [id]: v });
            }}
            className={`form-input text-sm py-3 ${errors[id] ? 'form-input-error' : ''}`}
          />
          {errors[id] && <p className="text-[11px] text-rose-400 mt-1">{errors[id]}</p>}
          {id === 'email' && !errors[id] && (
            <p className="text-[11px] text-amber-500/80 mt-1 flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{flexShrink:0}}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Tu QR de ingreso se enviará a este correo. Usa uno válido al que tengas acceso.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Simulate checkout (test mode) ────────────────────────────
function SimulateCheckout({
  amount,
  description,
  buyerInfo,
  purchaseDetails,
  onSuccess,
  onCancel,
}: {
  amount:          number;
  description:     string;
  buyerInfo:       FormData;
  purchaseDetails: { type: 'box' | 'individual'; zone: string; qty: number };
  onSuccess:       (orderId: string, ticketToken: string) => void;
  onCancel:        () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const simulate = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/payment/simulate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ buyerInfo, purchaseDetails, amount }),
      });
      const data = await res.json() as { ok: boolean; orderId?: string; ticketToken?: string; error?: string };
      if (data.ok && data.orderId) {
        onSuccess(data.orderId, data.ticketToken ?? '');
      } else {
        setError(data.error ?? 'Error simulando pago');
      }
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={onCancel}
        className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs mb-4 transition">
        <IconBack /> Volver
      </button>

      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total a pagar</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{description}</p>
        </div>
        <p className="font-heading font-black text-2xl text-amber-400">S/ {amount}</p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
        <p className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">Modo de prueba</p>
        <p className="text-slate-400 text-xs">La pasarela de pago está desactivada. Este botón simula un pago exitoso y genera el QR y correo de confirmación.</p>
      </div>

      <button
        onClick={simulate}
        disabled={loading}
        className="btn-primary w-full justify-center py-3.5 text-sm"
      >
        {loading ? 'Procesando...' : 'Simular pago exitoso (PRUEBA)'}
      </button>
      {error && <p className="text-rose-400 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}

// ── Ticket QR display ────────────────────────────────────────
function TicketQR({ token }: { token: string }) {
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    const url = `${window.location.origin}/validar/${token}`;
    import('qrcode').then(({ default: QRCode }) =>
      QRCode.toDataURL(url, { width: 200, margin: 1, errorCorrectionLevel: 'M' })
        .then(setQrSrc)
        .catch(console.error)
    );
  }, [token]);

  if (!qrSrc) {
    return <div className="w-[180px] h-[180px] bg-white/5 rounded-xl animate-pulse mx-auto" />;
  }
  return (
    <div className="bg-white rounded-xl p-2 inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSrc} alt="QR de entrada" className="w-[168px] h-[168px]" />
    </div>
  );
}

// ── Panel types ──────────────────────────────────────────────
type PanelView =
  | 'idle'
  | 'box_form'
  | 'box_reserved'
  | 'individual_form'
  | 'checkout'
  | 'success';

// ── Purchase context ─────────────────────────────────────────
type PurchaseCtx =
  | { type: 'box';        price: number }
  | { type: 'individual'; zone: BoxZone | 'general'; entries: number; price: number };

// ── Right Panel ──────────────────────────────────────────────
function PurchasePanel({
  view,
  selectedBox,
  reservedMs,
  ticketToken,
  onBoxReserve,
  onProceedToCheckout,
  onIndividualProceed,
  onReset,
  onOpenIndividual,
}: {
  view: PanelView;
  selectedBox: Box | null;
  reservedMs: number;
  ticketToken: string | null;
  onBoxReserve: (form: FormData) => void;
  onProceedToCheckout: () => void;
  onIndividualProceed: (zone: BoxZone | 'general', entries: number, form: FormData) => void;
  onReset: () => void;
  onOpenIndividual: () => void;
}) {
  const [form,       setForm]       = useState<FormData>({ name: '', email: '', phone: '', dni: '' });
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [timeLeft,   setTimeLeft]   = useState(reservedMs);
  const [indZone,    setIndZone]    = useState<BoxZone | 'general'>('platinum');
  const [indEntries, setIndEntries] = useState(1);

  useEffect(() => {
    if (view !== 'box_reserved') return;
    setTimeLeft(getReservationMs());
    const id = setInterval(() => {
      const ms = getReservationMs();
      setTimeLeft(ms);
      if (ms <= 0) onReset();
    }, 1000);
    return () => clearInterval(id);
  }, [view, onReset]);

  useEffect(() => {
    if (view === 'idle') { setForm({ name: '', email: '', phone: '', dni: '' }); setErrors({}); }
  }, [view]);

  const discount      = isDiscountActive();
  const pricePerUnit  = indZone === 'general' ? getPrice(10) : getPrice(BOX_PRICES[indZone as BoxZone].individual);
  const indTotalPrice = pricePerUnit * indEntries;

  // ── IDLE ─────────────────────────────────────────────────
  if (view === 'idle') {
    return (
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">¿Qué deseas comprar?</p>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400"><IconBox /></span>
            <p className="font-bold text-white text-sm">Comprar Box completo</p>
          </div>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Reserva un box para <strong className="text-slate-300">10 personas</strong>. Selecciona directamente en el mapa un box verde disponible.
          </p>
          {discount && (
            <div className="mb-3 flex items-center justify-between bg-gradient-to-r from-rose-600/25 to-rose-500/10 border border-rose-500/40 rounded-xl px-3 py-2">
              <p className="text-xs font-black text-white">Pre-venta · {DISCOUNT_LABEL}</p>
              <span className="bg-rose-600 rounded-lg px-2.5 py-1 text-xs font-black text-white shadow shadow-rose-500/40">-15%</span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5 mb-1">
            {(['platinum', 'vip', 'malecon'] as BoxZone[]).map(z => (
              <div key={z} className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/5">
                <p className="text-[9px] font-bold uppercase" style={{ color: ZONE_COLORS[z].stroke }}>{ZONE_COLORS[z].label}</p>
                {discount && <p className="text-[8px] text-red-400 line-through font-semibold leading-none">S/ {BOX_PRICES[z].full}</p>}
                <p className="text-white text-xs font-bold mt-0.5">S/ {getPrice(BOX_PRICES[z].full)}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2 text-center">👆 Toca un box verde en el mapa</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-violet-400"><IconTicket /></span>
            <p className="font-bold text-white text-sm">Comprar Entrada individual</p>
          </div>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Compra una o varias entradas a una zona específica, sin reservar box.
          </p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {(['platinum', 'vip', 'malecon'] as BoxZone[]).map(z => (
              <div key={z} className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/5">
                <p className="text-[9px] font-bold uppercase" style={{ color: ZONE_COLORS[z].stroke }}>{ZONE_COLORS[z].label}</p>
                {discount && <p className="text-[8px] text-red-400 line-through font-semibold leading-none">S/ {BOX_PRICES[z].individual}</p>}
                <p className="text-white text-xs font-bold mt-0.5">S/ {getPrice(BOX_PRICES[z].individual)} <span className="text-[9px] text-slate-500 font-normal">/ persona</span></p>
              </div>
            ))}
            <div className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/5">
              <p className="text-[9px] font-bold uppercase text-blue-400">GENERAL</p>
              {discount && <p className="text-[8px] text-red-400 line-through font-semibold leading-none">S/ 10</p>}
              <p className="text-white text-xs font-bold mt-0.5">S/ {getPrice(10)} <span className="text-[9px] text-slate-500 font-normal">/ persona</span></p>
            </div>
          </div>
          <button onClick={onOpenIndividual} className="w-full btn-secondary py-2.5 text-sm justify-center">
            Seleccionar zona →
          </button>
        </div>
      </div>
    );
  }

  // ── BOX FORM ─────────────────────────────────────────────
  if (view === 'box_form' && selectedBox) {
    const zone      = ZONE_COLORS[selectedBox.zone];
    const origPrice = BOX_PRICES[selectedBox.zone].full;
    const price     = getPrice(origPrice);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validateForm(form);
      setErrors(errs);
      if (Object.keys(errs).length === 0) onBoxReserve(form);
    };

    return (
      <div>
        <button onClick={onReset} className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs mb-4 transition">
          <IconBack /> Cambiar selección
        </button>

        <div className="rounded-xl p-4 mb-4 border"
          style={{ background: `${zone.stroke}11`, borderColor: `${zone.stroke}33` }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: zone.stroke }}>{zone.label}</p>
              <p className="font-heading font-black text-white text-2xl leading-none mt-0.5">Box {selectedBox.id}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Capacidad</p>
              <p className="font-bold text-white text-sm">10 personas</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-2 mt-2 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Box completo</p>
              {discount && <span className="inline-block mt-1 bg-rose-600 rounded px-2 py-0.5 text-[9px] font-black text-white">-15% PRE-VENTA</span>}
            </div>
            <div className="text-right">
              {discount && <p className="text-xs text-red-400 line-through font-semibold">S/ {origPrice}</p>}
              <p className="font-heading font-black text-amber-400 text-xl">S/ {price}</p>
            </div>
          </div>
        </div>

        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tus datos</p>
        <form onSubmit={handleSubmit}>
          <FormFields data={form} errors={errors} onChange={setForm} />
          <button type="submit" className="btn-primary w-full justify-center py-3.5 mt-4 text-sm">
            Reservar Box {selectedBox.id} — S/ {price}
          </button>
          <p className="text-center text-[10px] text-slate-600 mt-2 flex items-center justify-center gap-1">
            <IconLock /> Se bloqueará 10 min para completar el pago
          </p>
        </form>
      </div>
    );
  }

  // ── BOX RESERVED — proceder al pago ──────────────────────
  if (view === 'box_reserved' && selectedBox) {
    const zone      = ZONE_COLORS[selectedBox.zone];
    const origPrice = BOX_PRICES[selectedBox.zone].full;
    const price     = getPrice(origPrice);

    return (
      <div>
        {/* Timer */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
            <IconTimer /> Box reservado para ti
          </div>
          <span className="font-heading font-black text-amber-400 text-xl tabular-nums">{fmtMs(timeLeft)}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full mb-4 overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-1000"
            style={{ width: `${(timeLeft / RESERVATION_MS) * 100}%` }} />
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 mb-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Resumen de compra</p>
          {[
            { label: 'Box',    value: `${selectedBox.id} · ${zone.label}` },
            { label: 'Tipo',   value: 'Box completo (10 personas)' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
              <span className="text-slate-400 shrink-0 mr-3">{label}</span>
              <span className="text-white font-medium text-right truncate">{value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/8">
            <span className="text-white font-semibold">Total</span>
            <div className="text-right">
              {discount && <p className="text-xs text-red-400 line-through font-semibold">S/ {origPrice}</p>}
              <span className="font-heading font-black text-2xl text-amber-400">S/ {price}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onReset}
            className="btn-secondary flex-1 py-3 text-sm">
            Cancelar
          </button>
          <button onClick={onProceedToCheckout}
            className="btn-primary flex-1 py-3 text-sm justify-center">
            Pagar ahora →
          </button>
        </div>
      </div>
    );
  }

  // ── INDIVIDUAL FORM ──────────────────────────────────────
  if (view === 'individual_form') {
    const isGeneral = indZone === 'general';

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validateForm(form);
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;
      onIndividualProceed(indZone, indEntries, form);
    };

    return (
      <div>
        <button onClick={onReset} className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs mb-4 transition">
          <IconBack /> Volver
        </button>

        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Entrada individual</p>

        {/* Zone selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Zona</label>
          <div className="grid grid-cols-2 gap-2">
            {(['platinum', 'vip', 'malecon', 'general'] as (BoxZone | 'general')[]).map(z => {
              const isBox = z !== 'general';
              const label = isBox ? ZONE_COLORS[z as BoxZone].label : 'GENERAL';
              const color = isBox ? ZONE_COLORS[z as BoxZone].stroke : '#3b82f6';
              const origAmt = isBox ? BOX_PRICES[z as BoxZone].individual : 10;
              return (
                <button key={z} onClick={() => { setIndZone(z); setIndEntries(1); }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    indZone === z ? 'border-opacity-60 bg-opacity-10' : 'border-white/8 hover:border-white/20'
                  }`}
                  style={indZone === z ? { borderColor: `${color}88`, background: `${color}18` } : {}}>
                  <p className="text-[10px] font-bold uppercase" style={{ color }}>{label}</p>
                  {discount && <p className="text-[9px] text-red-400 line-through font-semibold leading-none">S/ {origAmt}</p>}
                  <p className="text-white text-sm font-bold mt-0.5">S/ {getPrice(origAmt)}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {`Cantidad · S/ ${pricePerUnit} / persona`}
          </label>
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3">
            <button onClick={() => setIndEntries(n => Math.max(1, n - 1))}
              className="w-10 h-10 rounded-lg border border-white/10 text-white hover:bg-white/5 transition text-xl font-bold">−</button>
            <span className="font-heading font-black text-2xl text-white flex-1 text-center tabular-nums">{indEntries}</span>
            <button onClick={() => setIndEntries(n => n + 1)}
              className="w-10 h-10 rounded-lg border border-white/10 text-white hover:bg-white/5 transition text-xl font-bold">+</button>
          </div>
          {!isGeneral && (
            <p className="text-right text-sm font-bold text-amber-400 mt-1.5">Total: S/ {indTotalPrice}</p>
          )}
          {isGeneral && (
            <p className="text-right text-sm font-bold text-amber-400 mt-1.5">Total: S/ {indTotalPrice}</p>
          )}
        </div>

        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tus datos</p>
        <form onSubmit={handleSubmit}>
          <FormFields data={form} errors={errors} onChange={setForm} />
          <button type="submit"
            className="btn-primary w-full justify-center py-3.5 mt-4 text-sm">
            Continuar al pago · S/ {indTotalPrice}
          </button>
        </form>
      </div>
    );
  }

  // ── SUCCESS ──────────────────────────────────────────────
  if (view === 'success') {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
          <IconCheck />
        </div>
        <h3 className="font-heading font-black text-white text-xl mb-1">¡Pago confirmado!</h3>
        <p className="text-slate-400 text-sm mb-1">
          {selectedBox ? `Box ${selectedBox.id} · ${ZONE_COLORS[selectedBox.zone].label}` : 'Entradas individuales'}
        </p>

        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4 mb-5 text-left">
          <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1">
            Revisa tu correo
          </p>
          <p className="text-slate-400 text-xs leading-relaxed">
            Te enviamos un correo de confirmación con tu <strong className="text-white">código QR de acceso</strong>.
            Preséntalo en la puerta el día del evento para recoger tu pulsera.
          </p>
        </div>

        <button onClick={onReset} className="btn-primary w-full justify-center py-3.5">
          Ver mapa actualizado
        </button>
      </div>
    );
  }

  return null;
}

// ── CheckoutModal ─────────────────────────────────────────────
function CheckoutModal({ children, onCancel }: { children: React.ReactNode; onCancel: () => void }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <style>{`
        @keyframes sheetIn {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .sheet-in { animation: sheetIn 0.25s ease-out both; }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.90)', backdropFilter: 'blur(6px)' }}
        onClick={onCancel}
      >
        {/* Sheet */}
        <div
          className="sheet-in w-full sm:max-w-md bg-[#0d1117] border border-white/10
                     rounded-t-2xl sm:rounded-2xl overflow-hidden"
          style={{ maxHeight: '92dvh' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8">
            <p className="text-white font-bold text-sm tracking-wide">Pagar con tarjeta</p>
            <button
              onClick={onCancel}
              className="text-slate-500 hover:text-white transition text-lg leading-none"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
          {/* Scrollable content */}
          <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(92dvh - 56px)' }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

// ── SuccessModal ──────────────────────────────────────────────
function SuccessModal({ label, onClose }: { label: string; onClose: () => void }) {
  return (
    <>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .modal-in { animation: modalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
      `}</style>

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-5"
        style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        {/* Card — stopPropagation so clicking card doesn't close */}
        <div
          className="modal-in relative bg-[#0d1117] border border-emerald-500/40 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Big animated check */}
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-5">
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none"
              stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>

          <h2 className="font-heading font-black text-white text-2xl mb-1">¡Pago confirmado!</h2>
          <p className="text-emerald-400 text-sm font-semibold mb-1">{label}</p>
          <p className="text-slate-500 text-xs mb-5">Festival de Salsa y Timba · Chancay 2026</p>

          {/* Email notice */}
          <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-xl p-4 mb-6 text-left">
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1.5">
              📧 Revisa tu correo
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Te enviamos un correo con tu{' '}
              <strong className="text-white">código QR de acceso</strong>.
              Preséntalo en la puerta del evento para recoger tu pulsera.
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-primary w-full justify-center py-3.5 text-sm"
          >
            ACEPTAR
          </button>
        </div>
      </div>
    </>
  );
}

// ── MapSection — main export ─────────────────────────────────
export default function MapSection() {
  const [boxes,       setBoxes]       = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [view,        setView]        = useState<PanelView>('idle');
  const [reservedMs,  setReservedMs]  = useState(0);
  const [mounted,     setMounted]     = useState(false);
  const [buyerData,   setBuyerData]   = useState<FormData | null>(null);
  const [purchaseCtx, setPurchaseCtx] = useState<PurchaseCtx | null>(null);
  const [ticketToken, setTicketToken] = useState<string | null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [modalLabel,  setModalLabel]  = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/boxes');
      const data = await res.json() as { ok: boolean; boxes?: Box[] };
      if (data.ok && data.boxes) setBoxes(data.boxes);
    } catch { /* network error — keep current state */ }
    setReservedMs(getReservationMs());
  }, []);

  useEffect(() => { setMounted(true); load(); }, [load]);
  useEffect(() => {
    // Pause polling during checkout — re-renders would reset the payment Brick
    if (view === 'checkout') return;
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load, view]);

  // Scroll the right panel into view when box gets reserved (fixes mobile scroll-to-FAQ)
  useEffect(() => {
    if (view === 'box_reserved') {
      // Small delay so the DOM has rendered the new panel content
      const t = setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [view]);

  // Timer tick for box_reserved
  useEffect(() => {
    if (view !== 'box_reserved') return;
    const id = setInterval(() => {
      const ms = getReservationMs();
      setReservedMs(ms);
      if (ms <= 0) handleReset();
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleBoxClick = (box: Box) => {
    if (selectedBox?.id === box.id) {
      setSelectedBox(null);
      setView('idle');
      return;
    }
    setSelectedBox(box);
    setView('box_form');
  };

  const handleBoxReserve = async (form: FormData) => {
    if (!selectedBox) return;
    const sessionId = getSessionId();
    const res  = await fetch('/api/boxes/reserve', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ boxId: selectedBox.id, sessionId }),
    });
    const data = await res.json() as { ok: boolean; error?: string };
    if (!data.ok) {
      // Box was taken — refresh map and reset
      load();
      setSelectedBox(null);
      setView('idle');
      return;
    }
    saveReservation(selectedBox.id);
    setReservedMs(getReservationMs());
    setBuyerData(form);
    setPurchaseCtx({ type: 'box', price: getPrice(BOX_PRICES[selectedBox.zone].full) });
    setView('box_reserved');
    load();
  };

  const handleIndividualProceed = (zone: BoxZone | 'general', entries: number, form: FormData) => {
    const pricePerUnit = zone === 'general' ? getPrice(10) : getPrice(BOX_PRICES[zone as BoxZone].individual);
    setBuyerData(form);
    setPurchaseCtx({ type: 'individual', zone, entries, price: pricePerUnit * entries });
    setView('checkout');
  };

  // Called by CheckoutPanel on successful payment
  const handlePaymentSuccess = async (orderId: string, token: string) => {
    // Build modal label before we clear state
    const label = purchaseCtx?.type === 'box' && selectedBox
      ? `Box ${selectedBox.id} · ${ZONE_COLORS[selectedBox.zone].label}`
      : purchaseCtx?.type === 'individual' && purchaseCtx.zone
        ? `${purchaseCtx.entries} entrada(s) · ${purchaseCtx.zone === 'general' ? 'General' : ZONE_COLORS[purchaseCtx.zone as BoxZone].label}`
        : 'Entradas confirmadas';

    if (purchaseCtx?.type === 'box' && selectedBox && buyerData) {
      const sessionId = getSessionId();
      await fetch('/api/boxes/confirm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          boxId: selectedBox.id,
          sessionId,
          buyer: {
            name:         buyerData.name,
            email:        buyerData.email,
            phone:        buyerData.phone,
            dni:          buyerData.dni,
            entries:      10,
            purchaseType: 'full',
            paidAmount:   purchaseCtx.price,
            purchasedAt:  new Date().toISOString(),
          },
        }),
      });
      clearReservation();
    }

    setTicketToken(token || null);
    setModalLabel(label);
    setShowModal(true);
    setView('idle');
    load();
  };

  const handleReset = async () => {
    if (selectedBox && (view === 'box_reserved' || view === 'checkout')) {
      const sessionId = getSessionId();
      fetch('/api/boxes/release', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ boxId: selectedBox.id, sessionId }),
      }).catch(() => {/* non-blocking */});
      clearReservation();
    }
    setSelectedBox(null);
    setBuyerData(null);
    setPurchaseCtx(null);
    setTicketToken(null);
    setView('idle');
    load();
  };

  // Checkout description string
  const checkoutDescription = (() => {
    if (!purchaseCtx) return '';
    if (purchaseCtx.type === 'box' && selectedBox) {
      return `Box ${selectedBox.id} · ${ZONE_COLORS[selectedBox.zone].label} · Festival de Salsa y Timba`;
    }
    if (purchaseCtx.type === 'individual') {
      const zoneLabel = purchaseCtx.zone === 'general'
        ? 'General'
        : ZONE_COLORS[purchaseCtx.zone as BoxZone].label;
      return `${purchaseCtx.entries} entrada(s) ${zoneLabel} · Festival de Salsa y Timba`;
    }
    return 'Festival de Salsa y Timba';
  })();

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedBox(null);
    setBuyerData(null);
    setPurchaseCtx(null);
    setTicketToken(null);
    router.push('/');
  };

  return (
    <>
      {showModal && <SuccessModal label={modalLabel} onClose={handleModalClose} />}

      {/* ── Checkout modal (emerges over the map on all devices) ── */}
      {view === 'checkout' && purchaseCtx && buyerData && (
        <CheckoutModal onCancel={handleReset}>
          {process.env.NEXT_PUBLIC_SIMULATE_PAYMENT === 'true' ? (
            <SimulateCheckout
              amount={purchaseCtx.price}
              description={checkoutDescription}
              buyerInfo={buyerData}
              purchaseDetails={
                purchaseCtx.type === 'box'
                  ? { type: 'box', zone: selectedBox?.zone ?? 'platinum', qty: 10 }
                  : { type: 'individual', zone: purchaseCtx.zone, qty: purchaseCtx.entries }
              }
              onSuccess={handlePaymentSuccess}
              onCancel={handleReset}
            />
          ) : (
            <CheckoutPanel
              amount={purchaseCtx.price}
              description={checkoutDescription}
              buyerInfo={buyerData}
              purchaseDetails={
                purchaseCtx.type === 'box'
                  ? { type: 'box', zone: selectedBox?.zone ?? 'platinum', qty: 10 }
                  : { type: 'individual', zone: purchaseCtx.zone, qty: purchaseCtx.entries }
              }
              onSuccess={handlePaymentSuccess}
              onCancel={handleReset}
            />
          )}
        </CheckoutModal>
      )}

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">

        {/* ── Map column ── */}
        <div className="lg:col-span-2">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-3 justify-center">
            {(Object.entries(STATUS_COLORS) as [BoxStatus, typeof STATUS_COLORS[BoxStatus]][]).map(([s, c]) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border" style={{ background: c.fill, borderColor: c.stroke }} />
                <span className="text-xs text-slate-400">
                  {s === 'available' ? 'Disponible' : s === 'temp_reserved' ? 'Reservado' : 'Vendido'}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm border" style={{ background: '#1e3a5f', borderColor: '#60a5fa' }} />
              <span className="text-xs text-blue-400">Seleccionado</span>
            </div>
          </div>

          <div className="card p-3 sm:p-4">
            <div className="overflow-x-auto -mx-1 px-1">
              <div style={{ minWidth: '320px' }}>
                {mounted
                  ? <VenueMap boxes={boxes} onBoxClick={handleBoxClick} selectedBoxId={selectedBox?.id} />
                  : <div className="flex items-center justify-center h-64"><div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" /></div>
                }
              </div>
            </div>
          </div>

          {/* Mobile: selected box bar */}
          {selectedBox && view === 'box_form' && (
            <div className="lg:hidden mt-3 card p-4" style={{ borderColor: '#3b82f680', border: '1px solid' }}>
              <p className="text-xs text-slate-500 mb-1">Box seleccionado · desplázate abajo para comprar</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-heading font-black text-white text-xl">{selectedBox.id}</span>
                  <span className="text-sm ml-2" style={{ color: ZONE_COLORS[selectedBox.zone].stroke }}>
                    {ZONE_COLORS[selectedBox.zone].label}
                  </span>
                </div>
                <p className="font-heading font-black text-amber-400">S/ {getPrice(BOX_PRICES[selectedBox.zone].full)}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="card p-5" ref={panelRef}>
          <PurchasePanel
            view={view}
            selectedBox={selectedBox}
            reservedMs={reservedMs}
            ticketToken={ticketToken}
            onBoxReserve={handleBoxReserve}
            onProceedToCheckout={() => setView('checkout')}
            onIndividualProceed={handleIndividualProceed}
            onReset={handleReset}
            onOpenIndividual={() => { setSelectedBox(null); setView('individual_form'); }}
          />
        </div>
      </div>
    </>
  );
}
