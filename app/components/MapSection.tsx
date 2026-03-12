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
  type BoxBuyer,
} from '@/lib/boxes';

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

function VenueMap({
  boxes,
  onBoxClick,
  selectedBoxId,
}: {
  boxes: Box[];
  onBoxClick: (box: Box) => void;
  selectedBoxId?: string | null;
}) {
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
        ★  PLATINUM — Box S/{BOX_PRICES.platinum.full}  ·  Entrada S/{BOX_PRICES.platinum.individual}
      </text>
      <line x1="220" y1="226" x2="590" y2="226" stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
      <rect x="220" y="233" width="370" height="14" fill="#0f0520" />
      <text x="405" y="244" textAnchor="middle" fontSize="8.5" fill="#a855f7" fontWeight="700" letterSpacing="1.5">
        VIP — Box S/{BOX_PRICES.vip.full}  ·  Entrada S/{BOX_PRICES.vip.individual}
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
    </svg>
  );
}

// ── Shared form fields ───────────────────────────────────────
type FormData = { name: string; email: string; phone: string; dni: string };
type FormErrors = Partial<FormData>;

function validateForm(f: FormData): FormErrors {
  const e: FormErrors = {};
  if (!f.name.trim())  e.name  = 'Requerido';
  if (!f.email.trim() || !/\S+@\S+\.\S+/.test(f.email)) e.email = 'Correo inválido';
  if (!f.phone.trim()) e.phone = 'Requerido';
  if (!f.dni.trim() || f.dni.length !== 8) e.dni = 'Debe tener 8 dígitos';
  return e;
}

function FormFields({
  data,
  errors,
  onChange,
}: {
  data: FormData;
  errors: FormErrors;
  onChange: (f: FormData) => void;
}) {
  const fields = [
    { id: 'name',  label: 'Nombre completo',    type: 'text',  ph: 'Juan Pérez García' },
    { id: 'dni',   label: 'DNI',                type: 'text',  ph: '12345678' },
    { id: 'email', label: 'Correo electrónico', type: 'email', ph: 'tu@email.com' },
    { id: 'phone', label: 'Teléfono',           type: 'tel',   ph: '+51 999 999 999' },
  ] as const;
  return (
    <div className="space-y-3">
      {fields.map(({ id, label, type, ph }) => (
        <div key={id}>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</label>
          <input
            type={type}
            value={data[id]}
            placeholder={ph}
            onChange={e => {
              const v = id === 'dni' ? e.target.value.replace(/\D/g, '').slice(0, 8) : e.target.value;
              onChange({ ...data, [id]: v });
            }}
            className={`form-input text-sm py-3 ${errors[id] ? 'form-input-error' : ''}`}
          />
          {errors[id] && <p className="text-[11px] text-rose-400 mt-1">{errors[id]}</p>}
        </div>
      ))}
    </div>
  );
}

// ── Panel types ──────────────────────────────────────────────
type PanelView =
  | 'idle'
  | 'box_form'
  | 'box_reserved'
  | 'individual_form'
  | 'success';

// ── Right Panel ──────────────────────────────────────────────
function PurchasePanel({
  view,
  selectedBox,
  reservedMs,
  onBoxReserve,
  onBoxConfirm,
  onIndividualConfirm,
  onReset,
  onOpenIndividual,
}: {
  view: PanelView;
  selectedBox: Box | null;
  reservedMs: number;
  onBoxReserve: (form: FormData) => void;
  onBoxConfirm: () => void;
  onIndividualConfirm: (zone: BoxZone | 'general', entries: number, form: FormData) => void;
  onReset: () => void;
  onOpenIndividual: () => void;
}) {
  const [form,       setForm]       = useState<FormData>({ name: '', email: '', phone: '', dni: '' });
  const [errors,     setErrors]     = useState<FormErrors>({});
  const [processing, setProcessing] = useState(false);
  const [timeLeft,   setTimeLeft]   = useState(reservedMs);
  const [indZone,    setIndZone]    = useState<BoxZone | 'general'>('platinum');
  const [indEntries, setIndEntries] = useState(1);

  // Sync timer
  useEffect(() => {
    if (view !== 'box_reserved') return;
    setTimeLeft(boxService.getMyReservationMs());
    const id = setInterval(() => {
      const ms = boxService.getMyReservationMs();
      setTimeLeft(ms);
      if (ms <= 0) onReset();
    }, 1000);
    return () => clearInterval(id);
  }, [view, onReset]);

  // Reset form when panel resets
  useEffect(() => {
    if (view === 'idle') { setForm({ name: '', email: '', phone: '', dni: '' }); setErrors({}); }
  }, [view]);

  const indPrice = indZone === 'general' ? 0 : BOX_PRICES[indZone as BoxZone].individual;

  // ── IDLE ─────────────────────────────────────────────────
  if (view === 'idle') {
    return (
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">¿Qué deseas comprar?</p>

        {/* Option A: Box */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-400"><IconBox /></span>
            <p className="font-bold text-white text-sm">Comprar Box completo</p>
          </div>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Reserva un box para <strong className="text-slate-300">8 personas</strong>. Selecciona directamente en el mapa un box verde disponible.
          </p>
          <div className="grid grid-cols-3 gap-1.5 mb-1">
            {(['platinum', 'vip', 'malecon'] as BoxZone[]).map(z => (
              <div key={z} className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/5">
                <p className="text-[9px] font-bold uppercase" style={{ color: ZONE_COLORS[z].stroke }}>{ZONE_COLORS[z].label}</p>
                <p className="text-white text-xs font-bold mt-0.5">S/ {BOX_PRICES[z].full}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2 text-center">👆 Toca un box verde en el mapa</p>
        </div>

        {/* Option B: Individual */}
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
                <p className="text-white text-xs font-bold mt-0.5">S/ {BOX_PRICES[z].individual} <span className="text-[9px] text-slate-500 font-normal">/ persona</span></p>
              </div>
            ))}
            <div className="bg-white/[0.03] rounded-lg p-2 text-center border border-white/5">
              <p className="text-[9px] font-bold uppercase text-blue-400">GENERAL</p>
              <p className="text-white text-xs font-bold mt-0.5 text-slate-500 text-[10px]">Precio libre</p>
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
    const zone   = ZONE_COLORS[selectedBox.zone];
    const price  = BOX_PRICES[selectedBox.zone].full;

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

        {/* Box info */}
        <div className="rounded-xl p-4 mb-4 border"
          style={{ background: `${zone.stroke}11`, borderColor: `${zone.stroke}33` }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: zone.stroke }}>{zone.label}</p>
              <p className="font-heading font-black text-white text-2xl leading-none mt-0.5">Box {selectedBox.id}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Capacidad</p>
              <p className="font-bold text-white text-sm">8 personas</p>
            </div>
          </div>
          <div className="border-t border-white/10 pt-2 mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">Box completo</p>
            <p className="font-heading font-black text-amber-400 text-xl">S/ {price}</p>
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

  // ── BOX RESERVED (confirmar pago) ────────────────────────
  if (view === 'box_reserved' && selectedBox) {
    const zone  = ZONE_COLORS[selectedBox.zone];
    const price = BOX_PRICES[selectedBox.zone].full;

    const handleConfirm = async () => {
      setProcessing(true);
      await new Promise(r => setTimeout(r, 1500));
      onBoxConfirm();
      setProcessing(false);
    };

    return (
      <div>
        {/* Timer */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
            <IconTimer /> Box bloqueado para ti
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
            { label: 'Box',      value: `${selectedBox.id} · ${zone.label}` },
            { label: 'Tipo',     value: 'Box completo (8 personas)' },
            { label: 'Comprador',value: form.name },
            { label: 'DNI',      value: form.dni },
            { label: 'Correo',   value: form.email },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
              <span className="text-slate-400 shrink-0 mr-3">{label}</span>
              <span className="text-white font-medium text-right truncate">{value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/8">
            <span className="text-white font-semibold">Total</span>
            <span className="font-heading font-black text-2xl text-amber-400">S/ {price}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onReset} disabled={processing}
            className="btn-secondary flex-1 py-3 text-sm disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={handleConfirm} disabled={processing}
            className="btn-primary flex-1 py-3 text-sm justify-center disabled:opacity-60">
            {processing ? <><IconSpin /> Procesando...</> : 'Confirmar pago'}
          </button>
        </div>
        <p className="text-center text-[10px] text-slate-700 mt-2">Demo · No se realiza ningún cobro real</p>
      </div>
    );
  }

  // ── INDIVIDUAL FORM ──────────────────────────────────────
  if (view === 'individual_form') {
    const isGeneral    = indZone === 'general';
    const pricePerUnit = isGeneral ? 0 : BOX_PRICES[indZone as BoxZone].individual;
    const totalPrice   = isGeneral ? indPrice : pricePerUnit * indEntries;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isGeneral && indPrice <= 0) return;
      const errs = validateForm(form);
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;
      setProcessing(true);
      await new Promise(r => setTimeout(r, 1200));
      onIndividualConfirm(indZone, indEntries, form);
      setProcessing(false);
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
              const price = isBox ? `S/ ${BOX_PRICES[z as BoxZone].individual}` : 'Precio libre';
              return (
                <button key={z} onClick={() => { setIndZone(z); setIndEntries(1); }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    indZone === z ? 'border-opacity-60 bg-opacity-10' : 'border-white/8 hover:border-white/20'
                  }`}
                  style={indZone === z ? { borderColor: `${color}88`, background: `${color}18` } : {}}>
                  <p className="text-[10px] font-bold uppercase" style={{ color }}>{label}</p>
                  <p className="text-white text-sm font-bold mt-0.5">{price}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            {isGeneral ? 'Cantidad' : `Cantidad · S/ ${pricePerUnit} / persona`}
          </label>
          <div className="flex items-center gap-3 bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3">
            <button onClick={() => setIndEntries(n => Math.max(1, n - 1))}
              className="w-10 h-10 rounded-lg border border-white/10 text-white hover:bg-white/5 transition text-xl font-bold">−</button>
            <span className="font-heading font-black text-2xl text-white flex-1 text-center tabular-nums">{indEntries}</span>
            <button onClick={() => setIndEntries(n => n + 1)}
              className="w-10 h-10 rounded-lg border border-white/10 text-white hover:bg-white/5 transition text-xl font-bold">+</button>
          </div>
          {!isGeneral && (
            <p className="text-right text-sm font-bold text-amber-400 mt-1.5">Total: S/ {totalPrice}</p>
          )}
        </div>

        {/* Price override for general */}
        {isGeneral && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Precio total (S/)</label>
            <input type="number" min={0} value={indPrice || ''}
              onChange={e => { /* controlled via indPrice local — use form trick */ }}
              placeholder="Ingresa el precio"
              className="form-input text-sm py-3 w-full" />
          </div>
        )}

        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tus datos</p>
        <form onSubmit={handleSubmit}>
          <FormFields data={form} errors={errors} onChange={setForm} />
          <button type="submit" disabled={processing}
            className="btn-primary w-full justify-center py-3.5 mt-4 text-sm disabled:opacity-60">
            {processing
              ? <><IconSpin /> Procesando...</>
              : `Comprar ${indEntries} entrada${indEntries > 1 ? 's' : ''} · S/ ${isGeneral ? '?' : totalPrice}`}
          </button>
        </form>
      </div>
    );
  }

  // ── SUCCESS ──────────────────────────────────────────────
  if (view === 'success') {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
          <IconCheck />
        </div>
        <h3 className="font-heading font-black text-white text-xl mb-2">¡Compra confirmada!</h3>
        <p className="text-slate-400 text-sm mb-1">
          {selectedBox ? `Box ${selectedBox.id} · ${ZONE_COLORS[selectedBox.zone].label}` : 'Entradas individuales'}
        </p>
        <p className="text-slate-500 text-xs mb-6">
          Confirmación enviada a <strong className="text-slate-300">{form.email}</strong>
        </p>
        <button onClick={onReset} className="btn-primary w-full justify-center py-3.5">
          Ver mapa actualizado
        </button>
      </div>
    );
  }

  return null;
}

// ── MapSection — main export ─────────────────────────────────
export default function MapSection() {
  const [boxes,       setBoxes]       = useState<Box[]>([]);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [view,        setView]        = useState<PanelView>('idle');
  const [reservedMs,  setReservedMs]  = useState(0);
  const [mounted,     setMounted]     = useState(false);

  const load = useCallback(() => {
    setBoxes(boxService.getBoxes());
    setReservedMs(boxService.getMyReservationMs());
  }, []);

  useEffect(() => { setMounted(true); load(); }, [load]);
  useEffect(() => { const id = setInterval(load, 5000); return () => clearInterval(id); }, [load]);

  // Timer tick
  useEffect(() => {
    if (view !== 'box_reserved') return;
    const id = setInterval(() => {
      const ms = boxService.getMyReservationMs();
      setReservedMs(ms);
      if (ms <= 0) handleReset();
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const handleBoxClick = (box: Box) => {
    if (selectedBox?.id === box.id) {
      // Second click → deselect
      setSelectedBox(null);
      setView('idle');
      return;
    }
    setSelectedBox(box);
    setView('box_form');
  };

  const handleBoxReserve = (form: { name: string; email: string; phone: string; dni: string }) => {
    if (!selectedBox) return;
    boxService.reserveBox(selectedBox.id);
    setReservedMs(boxService.getMyReservationMs());
    // Store form data in a ref-like way via panel's own state
    setView('box_reserved');
    load();
  };

  const handleBoxConfirm = () => {
    if (!selectedBox) return;
    // The form data is inside PurchasePanel — we need to pass it up
    // We'll use the buyer data that was stored in panel
    setView('success');
    load();
  };

  const handleIndividualConfirm = (zone: BoxZone | 'general', entries: number, form: { name: string; email: string; phone: string; dni: string }) => {
    // Individual purchases don't lock a box, just record
    setView('success');
  };

  const handleReset = () => {
    if (selectedBox && view === 'box_reserved') {
      boxService.releaseReservation(selectedBox.id);
    }
    setSelectedBox(null);
    setView('idle');
    load();
  };

  return (
    <>
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
                <p className="font-heading font-black text-amber-400">S/ {BOX_PRICES[selectedBox.zone].full}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="card p-5">
          <PurchasePanel
            view={view}
            selectedBox={selectedBox}
            reservedMs={reservedMs}
            onBoxReserve={handleBoxReserve}
            onBoxConfirm={handleBoxConfirm}
            onIndividualConfirm={handleIndividualConfirm}
            onReset={handleReset}
            onOpenIndividual={() => { setSelectedBox(null); setView('individual_form'); }}
          />
        </div>
      </div>
    </>
  );
}
