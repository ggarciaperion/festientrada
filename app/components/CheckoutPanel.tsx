'use client';

import { useState, useEffect, useRef } from 'react';

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
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const orderIdRef    = useRef('');
  const onSuccessRef  = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const mountRef      = useRef(true);

  useEffect(() => {
    mountRef.current = true;
    let KR: any = null;

    (async () => {
      try {
        // ── Step 1: get formToken from our backend ──────────
        const tkRes  = await fetch('/api/payment/create-token', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ amount, buyerInfo, purchaseDetails }),
        });
        const tkData = await tkRes.json() as { ok: boolean; formToken?: string; orderId?: string; error?: string };
        if (!tkData.ok || !tkData.formToken) throw new Error(tkData.error ?? 'Error al iniciar el pago');

        orderIdRef.current = tkData.orderId ?? '';
        if (!mountRef.current) return;

        // ── Step 2: load Izipay JS library ──────────────────
        const KRGlue   = (await import('@lyracom/embedded-form-glue')).default;
        const endpoint = process.env.NEXT_PUBLIC_IZIPAY_ENDPOINT!;
        const pubKey   = process.env.NEXT_PUBLIC_IZIPAY_PUBLIC_KEY!;

        ({ KR } = await KRGlue.loadLibrary(endpoint, pubKey));
        if (!mountRef.current) { KR?.removeForms?.(); return; }

        // ── Step 3: configure form ───────────────────────────
        await KR.setFormConfig({ formToken: tkData.formToken, 'kr-language': 'es-ES' });
        if (!mountRef.current) { KR?.removeForms?.(); return; }

        setLoading(false);

        // ── Step 4: handle payment submission ────────────────
        KR.onSubmit(async (r: { rawClientAnswer: string; hash: string }) => {
          if (!mountRef.current) return false;
          setError('');

          try {
            const vRes  = await fetch('/api/payment/process', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                rawClientAnswer: r.rawClientAnswer,
                hash:            r.hash,
                buyerInfo,
                purchaseDetails,
                amount,
                orderId: orderIdRef.current,
              }),
            });
            const vData = await vRes.json() as { ok: boolean; orderId?: string; ticketToken?: string; error?: string };

            if (vData.ok) {
              onSuccessRef.current(vData.orderId ?? '', vData.ticketToken ?? '');
            } else {
              setError(vData.error ?? 'Pago no aprobado. Intenta de nuevo.');
            }
          } catch {
            setError('Error de conexión. Intenta de nuevo.');
          }

          return false; // prevent Izipay redirect
        });

      } catch (e) {
        if (!mountRef.current) return;
        setError(e instanceof Error ? e.message : 'Error al cargar el formulario de pago');
        setLoading(false);
      }
    })();

    return () => {
      mountRef.current = false;
      try { KR?.removeForms?.(); } catch { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Loading overlay — spinner mientras Izipay inicializa */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <IconSpin />
          <p className="text-xs text-slate-500">Cargando formulario de pago seguro...</p>
        </div>
      )}

      {/* Izipay embedded form — SIEMPRE en el DOM para que KR pueda encontrarlo e inyectar los campos */}
      <div style={{ visibility: loading ? 'hidden' : 'visible', height: loading ? 0 : 'auto', overflow: loading ? 'hidden' : 'visible' }}>
        <div className="kr-embedded">
          <div className="kr-pan" />
          <div className="kr-expiry" />
          <div className="kr-security-code" />
          <button className="kr-payment-button" />
          <div className="kr-form-error" />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-3 text-[12px] text-rose-400 bg-rose-500/8 border border-rose-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Security badge */}
      <p className="text-center text-[10px] text-slate-700 mt-4 flex items-center justify-center gap-1">
        <IconLock /> Pago 100% seguro · Tarjeta débito/crédito · Procesado por Izipay
      </p>
    </div>
  );
}
