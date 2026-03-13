'use client';

import { useState, useEffect, useRef } from 'react';

// ── Izipay KRGlue/KR global types ────────────────────────────
// KRGlue is injected by the Izipay JS script loaded dynamically.
declare global {
  interface Window {
    KRGlue?: {
      loadLibrary: (
        baseUrl:   string,
        publicKey: string,
      ) => Promise<{ KR: IzipayKR }>;
    };
  }
}

interface IzipayKR {
  setFormConfig: (cfg: Record<string, unknown>) => Promise<{ KR: IzipayKR }>;
  attachForm:    (selector: string)             => Promise<{ KR: IzipayKR }>;
  onSubmit:      (cb: (res: IzipaySubmitResponse) => Promise<boolean>) => Promise<{ KR: IzipayKR }>;
  onError:       (cb: (err: IzipayKRError)       => void)             => Promise<{ KR: IzipayKR }>;
}

interface IzipaySubmitResponse {
  clientAnswer:    Record<string, unknown>;
  rawClientAnswer: string;
  hash:            string;
  hashAlgorithm:   string;
}

interface IzipayKRError {
  errorCode:    string;
  errorMessage: string;
}

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

// ── Helpers ───────────────────────────────────────────────────
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? fullName,
    lastName:  parts.slice(1).join(' ') || '-',
  };
}

// Dynamically loads a script tag (idempotent — won't add duplicates)
function loadIzipayScript(baseUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const src = `${baseUrl}/payments/v1/js/index.js`;
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src   = src;
    script.async = true;
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar el formulario de pago de Izipay'));
    document.head.appendChild(script);
  });
}

// ── Props ────────────────────────────────────────────────────
export interface PurchaseDetails {
  type: 'box' | 'individual';
  zone: string;  // 'platinum' | 'vip' | 'malecon' | 'general'
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
  type State = 'loading' | 'ready' | 'processing' | 'error';
  const [state,      setState]      = useState<State>('loading');
  const [error,      setError]      = useState('');
  const formId = useRef(`izipay-${Math.random().toString(36).slice(2, 7)}`);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // ── Step 1: Create Izipay payment session (server) ──
        const { firstName, lastName } = splitName(buyerInfo.name);

        const sessionRes = await fetch('/api/payment/create-session', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            email:     buyerInfo.email,
            firstName,
            lastName,
            phone:     buyerInfo.phone,
            dni:       buyerInfo.dni,
            description,
          }),
        });

        const sessionData = await sessionRes.json() as
          | { ok: true;  session: { formToken: string; publicKey: string; baseUrl: string } }
          | { ok: false; error: string };

        if (!sessionData.ok) {
          setError(sessionData.error);
          setState('error');
          return;
        }
        if (cancelled) return;

        const { formToken, publicKey, baseUrl } = sessionData.session;

        // ── Step 2: Load Izipay JS SDK ───────────────────────
        await loadIzipayScript(baseUrl);
        if (cancelled) return;

        if (!window.KRGlue) {
          throw new Error('El SDK de Izipay no se cargó correctamente');
        }

        // ── Step 3: Initialize KR and attach form ────────────
        const { KR: kr1 } = await window.KRGlue.loadLibrary(baseUrl, publicKey);
        const { KR: kr2 } = await kr1.setFormConfig({ formToken, language: 'es-PE' });
        const { KR: kr3 } = await kr2.attachForm(`#${formId.current}`);
        if (cancelled) return;

        setState('ready');

        // ── Step 4: Listen for errors ────────────────────────
        await kr3.onError((err) => {
          setError(err.errorMessage || 'Error en el formulario de pago');
          setState('ready');
        });

        // ── Step 5: Handle payment submission ────────────────
        await kr3.onSubmit(async (response) => {
          setState('processing');
          setError('');

          const validateRes = await fetch('/api/payment/validate', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientAnswer:    response.clientAnswer,
              rawClientAnswer: response.rawClientAnswer,
              hash:            response.hash,
              purchaseDetails,
              buyerInfo,
            }),
          });

          const validation = await validateRes.json() as
            { ok: boolean; orderId?: string; ticketToken?: string; error?: string };

          if (validation.ok && validation.orderId) {
            onSuccess(validation.orderId, validation.ticketToken ?? '');
          } else {
            setError(validation.error ?? 'El pago no se pudo confirmar. Intenta de nuevo.');
            setState('ready');
          }

          return false; // Prevent Izipay's default page redirect
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error al inicializar el formulario de pago');
          setState('error');
        }
      }
    }

    init();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Back button */}
      <button
        onClick={onCancel}
        disabled={state === 'processing'}
        className="flex items-center gap-1 text-slate-500 hover:text-slate-300 text-xs mb-4 transition disabled:opacity-40"
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
      {state === 'loading' && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <IconSpin />
          <p className="text-xs text-slate-500">Cargando formulario de pago seguro...</p>
        </div>
      )}

      {/* Error state (fatal — can't load form) */}
      {state === 'error' && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 p-4 text-center">
          <p className="text-sm text-rose-400 mb-3">{error || 'No se pudo cargar el formulario de pago'}</p>
          <button onClick={onCancel} className="btn-secondary text-sm py-2 px-4">
            Volver e intentar de nuevo
          </button>
        </div>
      )}

      {/* Izipay embedded form — Izipay renders cards, Yape, Plin here */}
      <div
        id={formId.current}
        className={state === 'loading' || state === 'error' ? 'hidden' : ''}
      />

      {/* Processing overlay */}
      {state === 'processing' && (
        <div className="flex flex-col items-center gap-3 py-4">
          <IconSpin />
          <p className="text-sm text-slate-400">Confirmando tu pago...</p>
        </div>
      )}

      {/* Inline error (payment declined, etc.) */}
      {error && state === 'ready' && (
        <p className="mt-3 text-[12px] text-rose-400 bg-rose-500/8 border border-rose-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Security badge */}
      {(state === 'ready' || state === 'loading') && (
        <p className="text-center text-[10px] text-slate-700 mt-4 flex items-center justify-center gap-1">
          <IconLock /> Pago 100% seguro · Tarjeta · Yape · Plin · Procesado por Izipay
        </p>
      )}
    </div>
  );
}
