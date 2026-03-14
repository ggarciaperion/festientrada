'use client';

import { useMemo, useRef, useState } from 'react';
import { CardPayment, initMercadoPago } from '@mercadopago/sdk-react';
import type { ICardPaymentFormData, ICardPaymentBrickPayer } from '@mercadopago/sdk-react/esm/bricks/cardPayment/type';

initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ?? '', { locale: 'es-PE' });

// ── Icons ────────────────────────────────────────────────────
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
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // Stable initialization — prevents brick recreation on re-renders
  const initialization = useMemo(() => ({
    amount,
    payer: { email: buyerInfo.email },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const customization = useMemo(() => ({
    paymentMethods: { minInstallments: 1, maxInstallments: 1 },
  }), []);

  const handleSubmit = async (formData: ICardPaymentFormData<ICardPaymentBrickPayer>) => {
    setError('');
    try {
      const res  = await fetch('/api/payment/process', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          formData,
          buyerInfo,
          purchaseDetails,
          amount,
        }),
      });
      const data = await res.json() as {
        ok: boolean; orderId?: string; ticketToken?: string; error?: string;
      };
      if (data.ok) {
        onSuccessRef.current(data.orderId ?? '', data.ticketToken ?? '');
      } else {
        setError(data.error ?? 'Pago no aprobado. Intenta de nuevo.');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    }
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
      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total a pagar</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">{description}</p>
        </div>
        <p className="font-heading font-black text-2xl text-amber-400">S/ {amount}</p>
      </div>

      {/* MP Card Payment Brick */}
      <CardPayment
        initialization={initialization}
        customization={customization}
        onSubmit={handleSubmit}
        onReady={() => setLoading(false)}
        onError={(err) => {
          console.error('MP Brick error:', err);
          setLoading(false);
          setError('Error al cargar el formulario de pago. Intenta recargar la página.');
        }}
      />

      {/* Loading overlay — shown until onReady fires */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <svg className="animate-spin w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4"/>
          </svg>
          <p className="text-xs text-slate-500">Cargando formulario de pago seguro...</p>
        </div>
      )}

      {/* Error */}
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
