'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { initMercadoPago, CardPayment } from '@mercadopago/sdk-react';

// ── Icons ────────────────────────────────────────────────────
function IconSpin() {
  return (
    <svg className="animate-spin w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4"/>
    </svg>
  );
}
function IconBack() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6"/>
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

// ── MP initialization (module-level, runs once) ───────────────
let mpInitialized = false;
function ensureMP() {
  if (mpInitialized) return;
  const key = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  if (key) {
    initMercadoPago(key, { locale: 'es-PE' });
    mpInitialized = true;
  }
}

// ── Props ────────────────────────────────────────────────────
export interface PurchaseDetails {
  type: 'box' | 'individual';
  zone: string;
  qty:  number;
}

export interface CheckoutPanelProps {
  amount:          number;
  description:     string;
  buyerInfo:       { name: string; email: string; phone: string; dni: string };
  purchaseDetails: PurchaseDetails;
  onSuccess:       (orderId: string, ticketToken: string) => void;
  onCancel:        () => void;
}

// ── Component ────────────────────────────────────────────────
export default function CheckoutPanel({
  amount,
  description,
  buyerInfo,
  purchaseDetails,
  onSuccess,
  onCancel,
}: CheckoutPanelProps) {
  const [ready,   setReady]   = useState(false);
  const [error,   setError]   = useState('');
  const onSuccessRef           = useRef(onSuccess);
  onSuccessRef.current         = onSuccess;

  useEffect(() => {
    ensureMP();
    // Small delay so MP SDK fully loads before rendering the Brick
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, []);

  // Stable reference — prevents Brick from reinitializing on parent re-renders
  const brickInit = useMemo(() => ({
    amount,
    payer: {
      email:          buyerInfo.email,
      identification: { type: 'DNI', number: buyerInfo.dni },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const handleSubmit = async (formData: {
    token?:             string;
    payment_method_id?: string;
    issuer_id?:         string | number;
    installments?:      number;
    transaction_amount?: number;
    payer?:             { email?: string; identification?: { type: string; number: string } };
  }) => {
    setError('');
    try {
      const res = await fetch('/api/payment/process', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token:              formData.token,
          payment_method_id:  formData.payment_method_id,
          issuer_id:          formData.issuer_id,
          installments:       formData.installments ?? 1,
          transaction_amount: formData.transaction_amount ?? amount,
          payer:              formData.payer,
          // Our controlled fields:
          amount,
          email:           buyerInfo.email,
          buyerInfo,
          purchaseDetails,
        }),
      });

      const data = await res.json() as {
        ok:          boolean;
        orderId?:    string;
        ticketToken?: string;
        error?:      string;
        pending?:    boolean;
      };

      if (!data.ok) {
        const msg = data.error ?? 'Error al procesar el pago. Intenta de nuevo.';
        setError(msg);
        throw new Error(msg);
      }

      onSuccessRef.current(data.orderId ?? '', data.ticketToken ?? '');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al procesar el pago';
      setError(msg);
      throw e; // Let the Brick re-enable its submit button
    }
  };

  const handleBrickError = (err: { message?: string; type?: string }) => {
    // Brick-level errors (invalid card format, etc.) — no need to setError,
    // the Brick shows inline validation messages itself
    console.error('MP Brick error:', err);
  };

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs mb-4 transition"
      >
        <IconBack /> Volver
      </button>

      {/* Amount summary */}
      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total a pagar</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{description}</p>
        </div>
        <p className="font-heading font-black text-2xl text-amber-400">S/ {amount}</p>
      </div>

      {/* Loading skeleton */}
      {!ready && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <IconSpin />
          <p className="text-xs text-slate-500">Cargando formulario de pago seguro...</p>
        </div>
      )}

      {/* MercadoPago Card Payment Brick */}
      {ready && (
        <CardPayment
          initialization={brickInit}
          customization={{
            paymentMethods: { maxInstallments: 1 },
          }}
          onSubmit={handleSubmit}
          onError={handleBrickError}
        />
      )}

      {/* Error from payment processing */}
      {error && (
        <p className="mt-3 text-[12px] text-rose-400 bg-rose-500/8 border border-rose-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Security badge */}
      <p className="text-center text-[10px] text-slate-700 mt-4 flex items-center justify-center gap-1">
        <IconLock /> Pago 100% seguro · Tarjeta débito/crédito · Procesado por MercadoPago
      </p>
    </div>
  );
}
