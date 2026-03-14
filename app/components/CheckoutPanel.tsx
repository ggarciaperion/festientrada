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
function IconXCircle() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  );
}

// ── Rejection reason → human message ─────────────────────────
function rejectionMessage(detail: string): string {
  if (detail.includes('insufficient_amount'))   return 'Fondos insuficientes en la tarjeta.';
  if (detail.includes('high_risk'))             return 'Tu banco rechazó el pago por razones de seguridad. Intenta con otra tarjeta o contacta tu banco.';
  if (detail.includes('blacklist'))             return 'Tu banco rechazó el pago. Contacta a tu banco para autorizar la operación.';
  if (detail.includes('invalid_installments'))  return 'Número de cuotas no válido para esta tarjeta.';
  if (detail.includes('expired'))               return 'La tarjeta está vencida. Verifica la fecha de vencimiento.';
  if (detail.includes('bad_filled_card_number')) return 'Número de tarjeta incorrecto. Revísalo e intenta de nuevo.';
  if (detail.includes('bad_filled_date'))       return 'Fecha de vencimiento incorrecta. Revísala e intenta de nuevo.';
  if (detail.includes('bad_filled_security_code')) return 'Código de seguridad (CVV) incorrecto. Revísalo e intenta de nuevo.';
  if (detail.includes('bad_filled_other'))      return 'Algún dato de la tarjeta es incorrecto. Revisa los datos e intenta de nuevo.';
  if (detail.includes('rejected'))              return 'El pago fue rechazado. Verifica los datos de tu tarjeta e intenta de nuevo.';
  if (detail.includes('pending'))               return 'El pago está en revisión. Recibirás un email cuando sea confirmado.';
  return 'El pago no pudo procesarse. Verifica los datos de tu tarjeta e intenta de nuevo.';
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
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [errorModal, setErrorModal] = useState('');
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
        const raw = data.error ?? '';
        // Extract status_detail from "Pago no aprobado: xxx"
        const detail = raw.replace('Pago no aprobado: ', '');
        setErrorModal(rejectionMessage(detail));
      }
    } catch {
      setErrorModal('Error de conexión. Verifica tu internet e intenta de nuevo.');
    }
  };

  return (
    <div>
      {/* ── Payment error modal ───────────────────────────── */}
      {errorModal && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 pb-20 sm:pb-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setErrorModal('')} />
          <div className="relative bg-[#0d0d1a] border border-rose-500/25 rounded-2xl p-6 w-full max-w-[340px] shadow-2xl animate-fade-in-up">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
                <IconXCircle />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">Pago no procesado</p>
                <p className="text-slate-400 text-sm mt-2 leading-relaxed">{errorModal}</p>
              </div>
              <button
                onClick={() => setErrorModal('')}
                className="mt-1 w-full py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-sm font-semibold transition active:scale-95"
              >
                Intentar de nuevo
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Security badge */}
      <p className="text-center text-[10px] text-slate-700 mt-4 flex items-center justify-center gap-1">
        <IconLock /> Pago 100% seguro · Tarjeta débito/crédito · Procesado por MercadoPago
      </p>
    </div>
  );
}
