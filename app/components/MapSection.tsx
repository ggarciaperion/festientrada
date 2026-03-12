'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  boxService,
  getBoxSVGPos,
  BOX_PRICES,
  ZONE_COLORS,
  STATUS_COLORS,
  RESERVATION_MS,
  type Box,
  type BoxZone,
  type BoxStatus,
  type PurchaseType,
  type BoxBuyer,
} from '@/lib/boxes';

// ── Helpers ──────────────────────────────────────────────────
function fmtMs(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── Icons ────────────────────────────────────────────────────
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconSpin() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}
function IconTimer() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── Venue SVG Map ────────────────────────────────────────────
function VenueMap({ boxes, onBoxClick }: { boxes: Box[]; onBoxClick: (box: Box) => void }) {
  return (
    <svg
      viewBox="0 0 620 620"
      className="w-full max-w-2xl mx-auto select-none"
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
    >
      {/* Outer venue */}
      <rect x="30" y="20" width="560" height="570" rx="4" fill="#0d0d1a" stroke="#334155" strokeWidth="1.5" />

      {/* ── TOP STRIP ── */}
      {/* BAÑOS: x=30–115 */}
      <rect x="30"  y="20" width="85"  height="50" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="72"  y="49" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">BAÑOS</text>

      {/* BARRA: x=115–220 (extended to meet new divider) */}
      <rect x="115" y="20" width="105" height="50" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="168" y="49" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">BARRA</text>

      {/* ESCENARIO: x=220–590, h=50 — SOLO texto "ESCENARIO", sin precios */}
      <rect x="220" y="20" width="370" height="50" rx="4" fill="#1a1209" stroke="#D4A017" strokeWidth="1.5" />
      <text x="405" y="50" textAnchor="middle" fontSize="14" fill="#D4A017" fontWeight="800" letterSpacing="3">ESCENARIO</text>

      {/* ── DIVIDERS ── */}
      {/* Vertical divider Malecón / Platinum+VIP: movida a x=220 */}
      <line x1="220" y1="70" x2="220" y2="395" stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="30"  y1="395" x2="590" y2="395" stroke="#334155" strokeWidth="1" />


      {/* ── BOX MALECÓN vertical label (centrado en sección x=30–220) ── */}
      <text
        x="186" y="265"
        fontSize="9" fill="#0ea5e9" fontWeight="700" letterSpacing="2"
        textAnchor="middle"
        transform="rotate(-90, 186, 265)"
      >
        BOX MALECÓN
      </text>

      {/* ── PLATINUM section header (fuera del ESCENARIO, y=70–88) ── */}
      <rect x="220" y="70" width="370" height="18" fill="#1a1209" />
      <text x="405" y="83" textAnchor="middle" fontSize="8.5" fill="#D4A017" fontWeight="700" letterSpacing="1.5">
        ★  PLATINUM — Box S/{BOX_PRICES.platinum.full}  ·  Entrada individual S/{BOX_PRICES.platinum.individual}
      </text>

      {/* ── Separador Platinum / VIP ── */}
      <line x1="220" y1="226" x2="590" y2="226" stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />

      {/* ── VIP section header (y=233–247) ── */}
      <rect x="220" y="233" width="370" height="14" fill="#0f0520" />
      <text x="405" y="244" textAnchor="middle" fontSize="8.5" fill="#a855f7" fontWeight="700" letterSpacing="1.5">
        VIP — Box S/{BOX_PRICES.vip.full}  ·  Entrada individual S/{BOX_PRICES.vip.individual}
      </text>

      {/* ── GENERAL area ── */}
      <rect x="30" y="395" width="560" height="125" fill="#0a0a14" />
      <text x="310" y="463" textAnchor="middle" fontSize="20" fill="#1e3a5f" fontWeight="800" letterSpacing="4">GENERAL</text>
      <text x="310" y="482" textAnchor="middle" fontSize="10" fill="#1e293b">Acceso libre · Zona pista</text>

      {/* ── BOTTOM STRIP ── */}
      <rect x="30"  y="520" width="95" height="70" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="77"  y="559" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">ENTRADA</text>

      <rect x="210" y="520" width="130" height="70" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="275" y="559" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">BARRA</text>

      <rect x="455" y="520" width="135" height="70" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <text x="522" y="559" textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700" letterSpacing="1">BAÑOS</text>

      {/* PLAYA label outside left */}
      <text x="16" y="280" textAnchor="middle" fontSize="9" fill="#1e293b" fontWeight="700" letterSpacing="2"
        transform="rotate(-90, 16, 280)">PLAYA</text>

      {/* ── BOX SHAPES ── */}
      {boxes.map(box => {
        const pos    = getBoxSVGPos(box);
        const colors = STATUS_COLORS[box.status];
        const cx     = pos.x + pos.w / 2;
        const cy     = pos.y + pos.h / 2;
        const isClickable = box.status === 'available';

        return (
          <g
            key={box.id}
            onClick={() => isClickable && onBoxClick(box)}
            style={{ cursor: isClickable ? 'pointer' : 'default' }}
          >
            <rect
              x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="2"
              fill={colors.fill} stroke={colors.stroke} strokeWidth="1.2"
            />
            <text x={cx} y={cy + 3} textAnchor="middle" fontSize="7.5" fill={colors.text} fontWeight="700">
              {box.id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Box purchase modal ────────────────────────────────────────
type ModalStep = 'detail' | 'form' | 'confirm' | 'success';

function BoxModal({
  box,
  reservedMs,
  onClose,
  onReserve,
  onComplete,
}: {
  box: Box;
  reservedMs: number;
  onClose: () => void;
  onReserve: () => void;
  onComplete: () => void;
}) {
  const [step,         setStep]         = useState<ModalStep>('detail');
  const [purchaseType, setPurchaseType] = useState<PurchaseType>('full');
  const [entries,      setEntries]      = useState(1);
  const [name,         setName]         = useState('');
  const [email,        setEmail]        = useState('');
  const [phone,        setPhone]        = useState('');
  const [dni,          setDni]          = useState('');
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [processing,   setProcessing]   = useState(false);
  const [timeLeft,     setTimeLeft]     = useState(reservedMs);

  const isReservedByMe = reservedMs > 0;

  useEffect(() => {
    if (!isReservedByMe) return;
    setTimeLeft(boxService.getMyReservationMs());
    const id = setInterval(() => {
      const ms = boxService.getMyReservationMs();
      setTimeLeft(ms);
      if (ms <= 0) onClose();
    }, 1000);
    return () => clearInterval(id);
  }, [isReservedByMe, onClose]);

  const prices    = BOX_PRICES[box.zone];
  const totalPrice = purchaseType === 'full' ? prices.full : entries * prices.individual;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())  e.name  = 'Requerido';
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido';
    if (!phone.trim()) e.phone = 'Requerido';
    if (!dni.trim() || dni.length !== 8) e.dni = 'DNI debe tener 8 dígitos';
    return e;
  };

  const handleReserve = () => {
    onReserve();
    setStep('form');
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep('confirm');
  };

  const handleConfirm = async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 1500));
    const buyer: Omit<BoxBuyer, 'buyerId'> = {
      name, email, phone, dni,
      entries: purchaseType === 'full' ? box.capacity : entries,
      purchaseType,
      paidAmount: totalPrice,
      purchasedAt: new Date().toISOString(),
    };
    boxService.confirmPurchase(box.id, buyer);
    setProcessing(false);
    setStep('success');
  };

  const zoneColor = ZONE_COLORS[box.zone].stroke;
  const zoneLabel = ZONE_COLORS[box.zone].label;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#111122] border border-white/10 rounded-2xl overflow-hidden">

        {/* Reservation countdown bar */}
        {isReservedByMe && step !== 'success' && (
          <div className="h-1 bg-amber-500 transition-all duration-1000"
            style={{ width: `${(timeLeft / RESERVATION_MS) * 100}%` }} />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: zoneColor }}>
              {zoneLabel}
            </span>
            <h2 className="font-heading font-black text-white text-xl mt-0.5">Box {box.id}</h2>
          </div>
          <div className="flex items-center gap-3">
            {isReservedByMe && step !== 'success' && (
              <span className="flex items-center gap-1.5 text-amber-400 text-sm font-semibold tabular-nums">
                <IconTimer /> {fmtMs(timeLeft)}
              </span>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-white transition">
              <IconClose />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">

          {/* ── STEP: detail ── */}
          {step === 'detail' && (
            <div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Zona',        value: zoneLabel },
                  { label: 'Capacidad',   value: `${box.capacity} personas` },
                  { label: 'Disponibles', value: `${box.entriesAvailable} entradas` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/[0.03] rounded-xl p-3 text-center border border-white/6">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-xs font-bold text-white leading-tight">{value}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tipo de compra</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {/* Box completo */}
                <button
                  onClick={() => setPurchaseType('full')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    purchaseType === 'full'
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : 'border-white/8 hover:border-white/18'
                  }`}
                >
                  <p className="font-bold text-white text-sm mb-1">Box completo</p>
                  <p className="text-xs text-slate-400 mb-2">{box.capacity} personas</p>
                  <p className="font-heading font-black text-amber-400 text-xl">S/ {prices.full}</p>
                </button>

                {/* Entrada individual */}
                <button
                  onClick={() => setPurchaseType('individual')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    purchaseType === 'individual'
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : 'border-white/8 hover:border-white/18'
                  }`}
                >
                  <p className="font-bold text-white text-sm mb-1">Entrada individual</p>
                  <p className="text-xs text-slate-400 mb-2">1–{box.entriesAvailable} entradas</p>
                  <p className="font-heading font-black text-amber-400 text-xl">
                    S/ {prices.individual}
                    <span className="text-xs font-normal text-slate-400"> /persona</span>
                  </p>
                </button>
              </div>

              {/* Quantity selector (individual only) */}
              {purchaseType === 'individual' && (
                <div className="flex items-center gap-4 mb-5 bg-white/[0.02] rounded-xl px-4 py-3 border border-white/6">
                  <span className="text-sm text-slate-400 flex-1">Entradas individuales:</span>
                  <button onClick={() => setEntries(e => Math.max(1, e - 1))}
                    className="w-8 h-8 rounded-lg border border-white/10 text-white hover:bg-white/5 transition text-lg">–</button>
                  <span className="font-heading font-black text-xl text-white w-6 text-center tabular-nums">{entries}</span>
                  <button onClick={() => setEntries(e => Math.min(box.entriesAvailable, e + 1))}
                    className="w-8 h-8 rounded-lg border border-white/10 text-white hover:bg-white/5 transition text-lg">+</button>
                  <span className="text-sm font-bold text-amber-400 ml-1">S/ {entries * prices.individual}</span>
                </div>
              )}

              <button onClick={handleReserve} className="btn-primary w-full justify-center">
                Reservar —{' '}
                {purchaseType === 'full'
                  ? 'Box completo'
                  : `${entries} entrada${entries > 1 ? 's' : ''} individual${entries > 1 ? 'es' : ''}`}
                {' '}— S/ {totalPrice}
              </button>
              <p className="text-center text-[11px] text-slate-600 mt-3 flex items-center justify-center gap-1.5">
                <IconLock /> Box bloqueado 10 minutos mientras completas la compra
              </p>
            </div>
          )}

          {/* ── STEP: form ── */}
          {step === 'form' && (
            <form onSubmit={handleFormSubmit}>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                <IconTimer />
                <span className="text-amber-400 text-sm font-semibold">
                  Box reservado — <strong className="tabular-nums">{fmtMs(timeLeft)}</strong> para completar la compra
                </span>
              </div>

              <div className="space-y-3 mb-5">
                {([
                  { id: 'name',  label: 'Nombre completo',    type: 'text',  val: name,  set: setName,  ph: 'Juan Pérez García' },
                  { id: 'dni',   label: 'DNI',                type: 'text',  val: dni,   set: setDni,   ph: '12345678' },
                  { id: 'email', label: 'Correo electrónico', type: 'email', val: email, set: setEmail, ph: 'tu@email.com' },
                  { id: 'phone', label: 'Teléfono',           type: 'tel',   val: phone, set: setPhone, ph: '+51 999 999 999' },
                ] as const).map(({ id, label, type, val, set, ph }) => (
                  <div key={id}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
                    <input
                      type={type} value={val} placeholder={ph}
                      onChange={e => {
                        const v = id === 'dni'
                          ? e.target.value.replace(/\D/g, '').slice(0, 8)
                          : e.target.value;
                        (set as (v: string) => void)(v);
                      }}
                      className={`form-input text-sm ${errors[id] ? 'form-input-error' : ''}`}
                    />
                    {errors[id] && <p className="text-[11px] text-rose-400 mt-1">{errors[id]}</p>}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { boxService.releaseReservation(box.id); setStep('detail'); }}
                  className="btn-secondary flex-1 py-3 text-sm"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary flex-1 py-3 text-sm justify-center">
                  Continuar →
                </button>
              </div>
            </form>
          )}

          {/* ── STEP: confirm ── */}
          {step === 'confirm' && (
            <div>
              <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 mb-5">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Resumen de compra</p>
                {[
                  { label: 'Box',       value: `${box.id} · ${zoneLabel}` },
                  { label: 'Tipo',      value: purchaseType === 'full'
                      ? `Box completo (${box.capacity} personas)`
                      : `${entries} entrada${entries > 1 ? 's' : ''} individual${entries > 1 ? 'es' : ''}` },
                  { label: 'Comprador', value: name },
                  { label: 'DNI',       value: dni },
                  { label: 'Correo',    value: email },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-slate-400 shrink-0 mr-3">{label}</span>
                    <span className="text-white font-medium text-right truncate">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/8">
                  <span className="text-white font-semibold">Total</span>
                  <span className="font-heading font-black text-2xl text-amber-400">S/ {totalPrice}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('form')} disabled={processing}
                  className="btn-secondary flex-1 py-3 text-sm disabled:opacity-40">Editar</button>
                <button onClick={handleConfirm} disabled={processing}
                  className="btn-primary flex-1 py-3 text-sm justify-center disabled:opacity-60">
                  {processing ? <><IconSpin /> Procesando...</> : 'Confirmar pago'}
                </button>
              </div>
              <p className="text-center text-[10px] text-slate-700 mt-3">Demo · No se realiza ningún cobro real</p>
            </div>
          )}

          {/* ── STEP: success ── */}
          {step === 'success' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="font-heading font-black text-white text-xl mb-2">¡Compra confirmada!</h3>
              <p className="text-slate-400 text-sm mb-1">Box {box.id} · {zoneLabel}</p>
              <p className="text-slate-500 text-xs mb-6">
                Confirmación enviada a <strong className="text-slate-300">{email}</strong>
              </p>
              <button onClick={onComplete} className="btn-primary w-full justify-center">
                Ver mapa actualizado
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── MapSection — embeddable in any page ──────────────────────
export default function MapSection() {
  const [boxes,         setBoxes]         = useState<Box[]>([]);
  const [selectedBox,   setSelectedBox]   = useState<Box | null>(null);
  const [reservedMs,    setReservedMs]     = useState(0);
  const [myReservedBox, setMyReservedBox] = useState<Box | null>(null);
  const [mounted,       setMounted]       = useState(false);

  const load = useCallback(() => {
    setBoxes(boxService.getBoxes());
    setMyReservedBox(boxService.getMyReservedBox());
    setReservedMs(boxService.getMyReservationMs());
  }, []);

  useEffect(() => { setMounted(true); load(); }, [load]);

  // Poll every 5 s (multi-tab sync)
  useEffect(() => {
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  // Countdown for floating nav timer
  useEffect(() => {
    if (!myReservedBox) return;
    const id = setInterval(() => {
      const ms = boxService.getMyReservationMs();
      setReservedMs(ms);
      if (ms <= 0) { setMyReservedBox(null); load(); }
    }, 1000);
    return () => clearInterval(id);
  }, [myReservedBox, load]);

  const handleBoxClick  = (box: Box) => { setSelectedBox(box); setReservedMs(boxService.getMyReservationMs()); };
  const handleReserve   = () => { if (!selectedBox) return; boxService.reserveBox(selectedBox.id); load(); setReservedMs(boxService.getMyReservationMs()); setMyReservedBox(boxService.getMyReservedBox()); };
  const handleClose     = () => { setSelectedBox(null); load(); };
  const handleComplete  = () => { setSelectedBox(null); setMyReservedBox(null); load(); };

  const stats = mounted ? boxService.getStats() : { available: 0, reserved: 0, sold: 0, totalBoxes: 0 };

  return (
    <>
      {/* Floating timer in page (shown when user has an active reservation) */}
      {mounted && myReservedBox && reservedMs > 0 && (
        <div className="mb-4 flex justify-center">
          <button
            onClick={() => setSelectedBox(myReservedBox)}
            className="flex items-center gap-2 bg-amber-500/15 border border-amber-500/30 rounded-full px-5 py-2 text-amber-400 text-sm font-semibold hover:bg-amber-500/20 transition animate-pulse"
          >
            <IconTimer />
            Box {myReservedBox.id} reservado — {fmtMs(reservedMs)} restantes
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8 items-start">

        {/* ── Map ── */}
        <div className="lg:col-span-2">
          {/* Legend */}
          <div className="flex flex-wrap gap-5 mb-3 justify-center">
            {(Object.entries(STATUS_COLORS) as [BoxStatus, typeof STATUS_COLORS[BoxStatus]][]).map(([s, c]) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border" style={{ background: c.fill, borderColor: c.stroke }} />
                <span className="text-xs text-slate-400">
                  {s === 'available' ? 'Disponible' : s === 'temp_reserved' ? 'Reservado (10 min)' : 'Vendido'}
                </span>
              </div>
            ))}
          </div>

          <div className="card p-3 sm:p-5">
            {mounted
              ? <VenueMap boxes={boxes} onBoxClick={handleBoxClick} />
              : <div className="flex items-center justify-center h-72">
                  <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                </div>
            }
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="space-y-4">

          {/* Zone prices */}
          <div className="card p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Zonas y Precios</p>
            <div className="space-y-4">
              {(['platinum', 'vip', 'malecon'] as BoxZone[]).map(zone => (
                <div key={zone}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: ZONE_COLORS[zone].stroke }}>
                      {ZONE_COLORS[zone].label}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white/[0.03] rounded-lg p-2.5 text-center border border-white/5">
                      <p className="text-[10px] text-slate-500 mb-0.5">Box 8 personas</p>
                      <p className="font-bold text-white text-sm">S/ {BOX_PRICES[zone].full}</p>
                    </div>
                    <div className="bg-white/[0.03] rounded-lg p-2.5 text-center border border-white/5">
                      <p className="text-[10px] text-slate-500 mb-0.5">Entrada individual</p>
                      <p className="font-bold text-white text-sm">S/ {BOX_PRICES[zone].individual}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="card p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">¿Cómo funciona?</p>
            <ol className="space-y-3">
              {[
                'Haz click en un box verde (disponible)',
                'Elige box completo o entrada individual',
                'Tienes 10 min para completar la compra',
                'Ingresa tus datos y confirma el pago',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                  <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* Purchase modal */}
      {selectedBox && (
        <BoxModal
          box={selectedBox}
          reservedMs={reservedMs}
          onClose={handleClose}
          onReserve={handleReserve}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
