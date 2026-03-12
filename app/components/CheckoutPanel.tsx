'use client';

import { useState, useEffect } from 'react';

// ── Culqi.js global types ────────────────────────────────────
declare global {
  interface Window {
    Culqi: {
      publicKey: string;
      createToken: (data: CulqiCardData) => void;
      token?:       { id: string; object: string; email: string };
      error?:       { user_message: string; merchant_message?: string };
      fingerprint?: string;
    };
    culqiAction?: () => void;
  }
}

interface CulqiCardData {
  card_number:       string;
  cvv:               string;
  expiration_month:  string;
  expiration_year:   string;
  email:             string;
}

// ── Icons ────────────────────────────────────────────────────
function IconSpin()  { return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4"/></svg>; }
function IconBack()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>; }
function IconLock()  { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function IconCheck() { return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>; }

// ── Helpers ───────────────────────────────────────────────────
const fmtCard   = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExpiry = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};
const fmtPhone  = (v: string) => v.replace(/\D/g, '').slice(0, 9);

function tokenizeCard(cardData: CulqiCardData): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.Culqi) {
      reject(new Error('Culqi no disponible — recarga la página'));
      return;
    }
    // Set one-shot global callback
    window.culqiAction = () => {
      if (window.Culqi?.token?.id) {
        resolve(window.Culqi.token.id);
      } else {
        reject(new Error(window.Culqi?.error?.user_message ?? 'Error de tokenización'));
      }
    };
    window.Culqi.publicKey = process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY ?? '';
    window.Culqi.createToken(cardData);
  });
}

// ── Props ────────────────────────────────────────────────────
export interface CheckoutPanelProps {
  amount:      number;
  description: string;
  buyerInfo:   { name: string; email: string; phone: string; dni: string };
  onSuccess:   (chargeId: string) => void;
  onCancel:    () => void;
}

// ── Component ────────────────────────────────────────────────
export default function CheckoutPanel({
  amount,
  description,
  buyerInfo,
  onSuccess,
  onCancel,
}: CheckoutPanelProps) {
  type Method = 'card' | 'yape';
  const [method,      setMethod]      = useState<Method>('card');
  const [processing,  setProcessing]  = useState(false);
  const [error,       setError]       = useState('');

  // Card form
  const [cardNumber,  setCardNumber]  = useState('');
  const [expiry,      setExpiry]      = useState('');
  const [cvv,         setCvv]         = useState('');

  // Yape form
  const [yapePhone,   setYapePhone]   = useState('');

  useEffect(() => { setError(''); }, [method]);

  // ── Card submit ────────────────────────────────────────────
  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const [expM, expY] = expiry.split('/');
    const digits = cardNumber.replace(/\s/g, '');

    if (digits.length < 13) { setError('Número de tarjeta inválido'); return; }
    if (!expM || !expY || expM.length < 2 || expY.length < 2) { setError('Fecha de vencimiento inválida'); return; }
    if (cvv.length < 3) { setError('CVV inválido'); return; }

    setProcessing(true);
    try {
      const tokenId = await tokenizeCard({
        card_number:      digits,
        cvv:              cvv,
        expiration_month: expM,
        expiration_year:  `20${expY}`,
        email:            buyerInfo.email,
      });

      const res = await fetch('/api/charge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method:      'card',
          tokenId,
          amount,
          email:       buyerInfo.email,
          name:        buyerInfo.name,
          dni:         buyerInfo.dni,
          description,
        }),
      });

      const data = await res.json() as { ok: boolean; chargeId?: string; error?: string };
      if (data.ok && data.chargeId) {
        onSuccess(data.chargeId);
      } else {
        setError(data.error ?? 'Pago rechazado. Verifica los datos de tu tarjeta.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  // ── Yape submit ────────────────────────────────────────────
  const handleYapeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (yapePhone.length !== 9) { setError('Ingresa tu número de 9 dígitos registrado en Yape'); return; }

    const fingerprint =
      typeof window !== 'undefined' && window.Culqi?.fingerprint
        ? window.Culqi.fingerprint
        : crypto.randomUUID();

    setProcessing(true);
    try {
      const res = await fetch('/api/charge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method:      'yape',
          phone:       yapePhone,
          fingerprint,
          amount,
          email:       buyerInfo.email,
          name:        buyerInfo.name,
          dni:         buyerInfo.dni,
          description,
        }),
      });

      const data = await res.json() as { ok: boolean; chargeId?: string; error?: string };
      if (data.ok && data.chargeId) {
        onSuccess(data.chargeId);
      } else {
        setError(data.error ?? 'Pago Yape no procesado. Verifica que el número esté registrado en Yape.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar el pago');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <button onClick={onCancel} disabled={processing}
        className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs mb-4 transition disabled:opacity-40">
        <IconBack /> Volver
      </button>

      {/* Amount */}
      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total a pagar</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{description}</p>
        </div>
        <p className="font-heading font-black text-2xl text-amber-400">S/ {amount}</p>
      </div>

      {/* Method tabs */}
      <div className="flex gap-2 mb-5">
        {(['card', 'yape'] as Method[]).map(m => (
          <button key={m} onClick={() => { setMethod(m); setError(''); }}
            disabled={processing}
            className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition
              ${method === m
                ? 'bg-white/8 border-white/20 text-white'
                : 'bg-transparent border-white/6 text-slate-500 hover:border-white/12 hover:text-slate-400'
              }`}>
            {m === 'card' ? '💳 Tarjeta' : '📱 Yape'}
          </button>
        ))}
      </div>

      {/* ── Card form ── */}
      {method === 'card' && (
        <form onSubmit={handleCardSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Número de tarjeta
            </label>
            <input
              type="text" inputMode="numeric" placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={e => setCardNumber(fmtCard(e.target.value))}
              className="form-input text-sm py-3 font-mono tracking-widest"
              maxLength={19}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Vencimiento
              </label>
              <input
                type="text" inputMode="numeric" placeholder="MM/AA"
                value={expiry}
                onChange={e => setExpiry(fmtExpiry(e.target.value))}
                className="form-input text-sm py-3 font-mono"
                maxLength={5}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                CVV
              </label>
              <input
                type="text" inputMode="numeric" placeholder="123"
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="form-input text-sm py-3 font-mono"
                maxLength={4}
              />
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-rose-400 bg-rose-500/8 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={processing}
            className="btn-primary w-full justify-center py-3.5 mt-2 text-sm disabled:opacity-60">
            {processing
              ? <><IconSpin /> Procesando pago...</>
              : `Pagar S/ ${amount}`}
          </button>
        </form>
      )}

      {/* ── Yape form ── */}
      {method === 'yape' && (
        <form onSubmit={handleYapeSubmit} className="space-y-3">
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-slate-400 leading-relaxed mb-1">
            Ingresa el número de celular <strong className="text-white">registrado en tu Yape</strong>.
            Recibirás una notificación para confirmar el pago.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Número Yape
            </label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-slate-500 bg-white/[0.03] border border-white/8 rounded-lg px-3 py-3 shrink-0">
                +51
              </span>
              <input
                type="tel" inputMode="numeric" placeholder="999 999 999"
                value={yapePhone}
                onChange={e => setYapePhone(fmtPhone(e.target.value))}
                className="form-input text-sm py-3 font-mono flex-1"
                maxLength={9}
              />
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-rose-400 bg-rose-500/8 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" disabled={processing}
            className="btn-primary w-full justify-center py-3.5 mt-2 text-sm disabled:opacity-60">
            {processing
              ? <><IconSpin /> Enviando a Yape...</>
              : `Pagar S/ ${amount} con Yape`}
          </button>
        </form>
      )}

      {/* Security note */}
      <p className="text-center text-[10px] text-slate-700 mt-3 flex items-center justify-center gap-1">
        <IconLock /> Pago seguro cifrado · Procesado por Culqi
      </p>
    </div>
  );
}
