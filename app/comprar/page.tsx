'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { db, FESTIVAL_EVENT, type Ticket, type TicketEntry, type TicketType } from '@/lib/database';
import { isDiscountActive, getPrice, DISCOUNT_LABEL } from '@/lib/pricing';
import { generateQRCode, generateEntryURL } from '@/lib/qr-generator';

/* ── Zone config ───────────────────────────────────────── */
const ZONE_CONFIG: Record<TicketType, {
  name: string; label: string;
  text: string; bg: string; ring: string; dim: string;
}> = {
  platinum: {
    name:  'PLATINUM',
    label: 'Experiencia Premium',
    text:  'text-amber-400',
    bg:    'bg-amber-500',
    ring:  'border-amber-500/40 bg-amber-500/10',
    dim:   'border-amber-500/20',
  },
  supervip: {
    name:  'SUPER VIP',
    label: 'Acceso Privilegiado',
    text:  'text-rose-400',
    bg:    'bg-rose-600',
    ring:  'border-rose-500/40 bg-rose-500/10',
    dim:   'border-rose-500/20',
  },
  vip: {
    name:  'VIP',
    label: 'Zona Premium',
    text:  'text-violet-400',
    bg:    'bg-violet-600',
    ring:  'border-violet-500/40 bg-violet-500/10',
    dim:   'border-violet-500/20',
  },
  general: {
    name:  'GENERAL',
    label: 'Acceso al Festival',
    text:  'text-blue-400',
    bg:    'bg-blue-600',
    ring:  'border-blue-500/40 bg-blue-500/10',
    dim:   'border-blue-500/20',
  },
};

const VALID_TYPES: TicketType[] = ['general', 'vip', 'supervip', 'platinum'];

/* ── Inline icons ──────────────────────────────────────── */
function IconBack() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  );
}
function IconSpin() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#D4A017" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconLock() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

/* ── Form Field ────────────────────────────────────────── */
function Field({
  label, hint, error, children,
}: {
  label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5">{label}</label>
      {children}
      {hint  && !error && <p className="text-[11px] text-slate-600 mt-1">{hint}</p>}
      {error &&           <p className="text-[11px] text-rose-400    mt-1">{error}</p>}
    </div>
  );
}

/* ── Main component (wrapped in Suspense for useSearchParams) ── */
function ComprarContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const tipoParam    = searchParams.get('tipo') as TicketType | null;
  const initial: TicketType = tipoParam && VALID_TYPES.includes(tipoParam) ? tipoParam : 'vip';

  const [zone,       setZone]       = useState<TicketType>(initial);
  const [quantity,   setQuantity]   = useState(1);
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [dni,        setDni]        = useState('');
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [showModal,  setShowModal]  = useState(false);
  const [processing, setProcessing] = useState(false);

  const prices     = FESTIVAL_EVENT.prices;
  const discount   = isDiscountActive();
  const unitPrice  = getPrice(prices[zone]);
  const total      = unitPrice * quantity;
  const cfg       = ZONE_CONFIG[zone];

  /* Scroll al tope al abrir modal */
  useEffect(() => {
    if (showModal) document.body.style.overflow = 'hidden';
    else           document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  /* Validación */
  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!name.trim())                   e.name  = 'Campo requerido';
    if (!email.trim())                  e.email = 'Campo requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Correo inválido';
    if (!phone.trim())                  e.phone = 'Campo requerido';
    if (!dni.trim())                    e.dni   = 'Campo requerido';
    else if (dni.length !== 8)          e.dni   = 'El DNI debe tener 8 dígitos';
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length === 0) setShowModal(true);
  };

  const processPayment = async () => {
    setProcessing(true);
    await new Promise(r => setTimeout(r, 2000));

    try {
      const ticketId = uuidv4();
      const entries: TicketEntry[] = Array.from({ length: quantity }, () => {
        const entryId = uuidv4();
        return { entryId, ticketType: zone, qrData: generateEntryURL(entryId), validated: false };
      });

      const mainQR = await generateQRCode(`${window.location.origin}/ticket/${ticketId}`);

      const ticket: Ticket = {
        id: ticketId, eventId: FESTIVAL_EVENT.id, ticketType: zone,
        buyerName: name, buyerEmail: email, buyerPhone: phone, buyerDNI: dni,
        quantity, totalPrice: total,
        purchaseDate: new Date().toISOString(),
        qrCode: mainQR, validated: false, tickets: entries,
      };

      db.saveTicket(ticket);
      router.push(`/ticket/${ticketId}`);
    } catch (err) {
      console.error(err);
      alert('Error al procesar la compra. Por favor intenta de nuevo.');
      setProcessing(false);
      setShowModal(false);
    }
  };

  return (
    <main className="relative min-h-screen z-10">
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#09090F]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition">
            <IconBack />
            <span>Volver al inicio</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
            <IconLock />
            Compra segura
          </div>
        </div>
      </nav>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        {/* Page title */}
        <div className="mb-10">
          <h1 className="font-heading font-black text-3xl sm:text-4xl text-white tracking-tight">
            Comprar Entradas
          </h1>
          <p className="text-slate-400 mt-2">
            Festival de Salsa y Timba · Domingo 29 de Marzo 2026 · Chancay
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">

          {/* ── Left: Form ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Discount banner */}
            {discount && (
              <div className="bg-gradient-to-r from-rose-600/30 to-rose-500/10 border border-rose-500/50 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 shadow-lg shadow-rose-500/10">
                <div>
                  <p className="font-heading font-black text-white text-lg leading-tight tracking-tight">
                    Pre-venta · 15% de descuento
                  </p>
                  <p className="text-sm text-rose-300 mt-0.5">{DISCOUNT_LABEL} a las 12:00 pm</p>
                </div>
                <div className="flex-shrink-0 bg-rose-600 rounded-xl px-4 py-2.5 shadow-lg shadow-rose-600/40">
                  <p className="font-heading font-black text-white text-2xl leading-none">-15%</p>
                </div>
              </div>
            )}

            {/* Zone selector */}
            <div className="card p-6">
              <h2 className="font-heading font-bold text-white text-sm uppercase tracking-wider mb-4">
                1. Selecciona tu zona
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(ZONE_CONFIG) as [TicketType, typeof ZONE_CONFIG[TicketType]][]).map(([type, c]) => (
                  <label
                    key={type}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      zone === type ? c.ring : 'border-white/6 hover:border-white/14'
                    }`}
                  >
                    <input
                      type="radio" name="zone" value={type}
                      checked={zone === type}
                      onChange={() => setZone(type)}
                      className="sr-only"
                    />
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors ${
                      zone === type ? c.bg : 'bg-white/10'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-xs ${zone === type ? c.text : 'text-white'}`}>
                        {c.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{c.label}</p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      {discount && (
                        <span className="text-[9px] text-red-400 line-through leading-none font-semibold">
                          S/ {prices[type]}
                        </span>
                      )}
                      <span className={`font-heading font-bold text-sm ${
                        zone === type ? c.text : 'text-slate-400'
                      }`}>
                        S/ {getPrice(prices[type])}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="card p-6">
              <h2 className="font-heading font-bold text-white text-sm mb-4 uppercase tracking-wider">
                2. Cantidad de entradas
              </h2>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 rounded-lg border border-white/10 text-white hover:bg-white/5 transition text-lg leading-none"
                >
                  –
                </button>
                <span className="font-heading font-black text-2xl text-white w-8 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(q => Math.min(10, q + 1))}
                  className="w-9 h-9 rounded-lg border border-white/10 text-white hover:bg-white/5 transition text-lg leading-none"
                >
                  +
                </button>
                <span className="text-slate-500 text-xs ml-1">Máximo 10 por compra</span>
              </div>
            </div>

            {/* Personal data */}
            <form onSubmit={handleSubmit} className="card p-6">
              <h2 className="font-heading font-bold text-white text-sm mb-5 uppercase tracking-wider">
                3. Datos del comprador
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nombre completo" error={errors.name}>
                  <input
                    type="text" value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Juan Pérez García"
                    className={`form-input ${errors.name ? 'form-input-error' : ''}`}
                  />
                </Field>

                <Field label="DNI" error={errors.dni}>
                  <input
                    type="text" value={dni}
                    onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="12345678"
                    maxLength={8}
                    className={`form-input ${errors.dni ? 'form-input-error' : ''}`}
                  />
                </Field>

                <Field label="Correo electrónico" hint="Recibirás tu ticket aquí" error={errors.email}>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                  />
                </Field>

                <Field label="Teléfono" error={errors.phone}>
                  <input
                    type="tel" value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+51 999 999 999"
                    className={`form-input ${errors.phone ? 'form-input-error' : ''}`}
                  />
                </Field>
              </div>

              <button type="submit" className="btn-primary w-full mt-6 text-base justify-center">
                Continuar al pago — S/ {total.toFixed(2)}
              </button>

              <p className="text-[11px] text-slate-600 text-center mt-3 flex items-center justify-center gap-1.5">
                <IconLock /> Compra 100% segura · Tus datos están protegidos
              </p>
            </form>
          </div>

          {/* ── Right: Summary ────────────────────────────────── */}
          <div>
            <div className="card p-6 sticky top-24">
              <h2 className="font-heading font-bold text-white text-sm mb-5 uppercase tracking-wider">
                Resumen
              </h2>

              {/* Event pill */}
              <div className="rounded-xl bg-gradient-to-br from-amber-900/25 to-ink-200/50 border border-amber-500/10 p-4 mb-5">
                <p className="font-heading font-bold text-white text-sm leading-tight">
                  Festival de Salsa y Timba
                </p>
                <p className="text-amber-400/70 text-xs mt-0.5">Chancay 2026</p>
              </div>

              {/* Details */}
              <dl className="space-y-2.5 text-sm mb-5">
                {[
                  { label: 'Fecha',     value: '29 Mar 2026' },
                  { label: 'Hora',      value: '8:00 PM' },
                  { label: 'Lugar',     value: 'Malecón de Chancay' },
                  { label: 'Zona',      value: cfg.name,    special: cfg.text },
                  { label: 'Cantidad',  value: `${quantity}` },
                  { label: 'P. unitario', value: `S/ ${unitPrice}${discount ? ` (antes S/ ${prices[zone]})` : ''}` },
                ].map(({ label, value, special }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-400">{label}</span>
                    <span className={`font-medium ${special ?? 'text-white'}`}>{value}</span>
                  </div>
                ))}
              </dl>

              <hr className="divider mb-4" />

              <div className="flex justify-between items-end mb-6">
                <span className="text-white font-semibold">Total</span>
                <span className="font-heading font-black text-2xl text-amber-400">
                  S/ {total.toFixed(2)}
                </span>
              </div>

              {/* Benefits */}
              <ul className="space-y-2">
                {[
                  `${quantity} ticket${quantity > 1 ? 's' : ''} con QR único`,
                  'Confirmación inmediata',
                  'Válido para 1 persona c/u',
                ].map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
                    <IconCheck /> {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Info card */}
            <div className="card p-5 mt-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                Información
              </p>
              {[
                'Entradas no reembolsables',
                'Transferibles a otra persona',
                'Cada QR es de un solo uso',
                'Guarda tu ticket en un lugar seguro',
              ].map((info, i) => (
                <p key={i} className="text-xs text-slate-500 flex items-start gap-2 mb-1.5">
                  <span className="text-slate-700 mt-0.5">·</span> {info}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card border border-white/10 p-7 max-w-sm w-full">

            <h3 className="font-heading font-black text-white text-xl mb-1">Confirmar pago</h3>
            <p className="text-slate-400 text-sm mb-6">Festival de Salsa y Timba · Chancay 2026</p>

            {/* Amount */}
            <div className="bg-white/[0.03] border border-white/6 rounded-xl p-4 mb-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-slate-400">{cfg.name} × {quantity}</p>
                  <p className="text-xs text-slate-600 mt-0.5">Dom. 29 Marzo · 8:00 PM</p>
                </div>
                <span className="font-heading font-black text-2xl text-amber-400">
                  S/ {total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment methods */}
            <div className="text-center mb-5">
              <p className="text-xs text-slate-600 mb-3">Métodos de pago disponibles en producción:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {['Visa', 'Mastercard', 'Yape', 'Plin', 'Culqi', 'Niubiz'].map(m => (
                  <span key={m}
                    className="px-2.5 py-1 rounded border border-white/8 text-xs text-slate-500 bg-white/[0.025]">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={processing}
                className="btn-secondary flex-1 py-3 text-sm disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                onClick={processPayment}
                disabled={processing}
                className="btn-primary flex-1 py-3 text-sm disabled:opacity-60 justify-center"
              >
                {processing
                  ? <><IconSpin /> Procesando...</>
                  : 'Confirmar y pagar'}
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-700 mt-4">
              Demo · No se realiza ningún cobro real
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

/* ── Page export with Suspense (required for useSearchParams) ── */
export default function ComprarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
      </div>
    }>
      <ComprarContent />
    </Suspense>
  );
}
