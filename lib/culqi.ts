// ── Culqi server-side API client ─────────────────────────────
// Docs: https://apidocs.culqi.com/
// Env vars: CULQI_SECRET_KEY

const BASE_URL = 'https://api.culqi.com/v2';

function headers(): Record<string, string> {
  const key = process.env.CULQI_SECRET_KEY;
  if (!key) throw new Error('CULQI_SECRET_KEY no configurada');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${key}`,
  };
}

// ── Types ────────────────────────────────────────────────────
interface CulqiOutcome {
  type: string;         // 'venta_exitosa' | 'tarjeta_invalida' | etc.
  code: string;
  merchant_message: string;
  user_message: string;
}

interface CulqiChargeResponse {
  id: string;
  object: string;
  outcome: CulqiOutcome;
  amount: number;
  currency_code: string;
}

interface CulqiErrorResponse {
  object: string;
  type: string;
  merchant_message: string;
  user_message: string;
}

interface CulqiTokenResponse {
  id: string;
  object: string;
}

export type ChargeResult =
  | { ok: true;  chargeId: string }
  | { ok: false; error: string };

// ── Card charge ──────────────────────────────────────────────
// tokenId comes from Culqi.js running in the browser
export async function createCardCharge(params: {
  tokenId: string;
  amount: number;     // soles (will be converted to centavos)
  email: string;
  description: string;
  metadata?: Record<string, string>;
}): Promise<ChargeResult> {
  try {
    const res = await fetch(`${BASE_URL}/charges`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        amount:        Math.round(params.amount * 100),  // soles → centavos
        currency_code: 'PEN',
        email:         params.email,
        source_id:     params.tokenId,
        description:   params.description,
        metadata:      params.metadata ?? {},
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const err = data as CulqiErrorResponse;
      return { ok: false, error: err.user_message ?? err.merchant_message ?? 'Error de pago' };
    }

    const charge = data as CulqiChargeResponse;
    if (charge.outcome?.type !== 'venta_exitosa') {
      return { ok: false, error: charge.outcome?.user_message ?? 'Pago no aprobado' };
    }

    return { ok: true, chargeId: charge.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado' };
  }
}

// ── Yape charge ──────────────────────────────────────────────
// Culqi creates a Yape token from phone + browser fingerprint, then charges it.
// The user receives a push notification in their Yape app to confirm.
export async function createYapeCharge(params: {
  phoneNumber: string;
  fingerprint: string;
  amount: number;     // soles
  email: string;
  description: string;
  metadata?: Record<string, string>;
}): Promise<ChargeResult> {
  try {
    // Step 1: Create Yape token
    const tokenRes = await fetch(`${BASE_URL}/tokens/yape`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        phone_number:      params.phoneNumber,
        device_fingerprint: params.fingerprint,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      const err = tokenData as CulqiErrorResponse;
      return { ok: false, error: err.user_message ?? 'Número Yape no reconocido' };
    }

    const yapeToken = tokenData as CulqiTokenResponse;

    // Step 2: Charge with Yape token
    const chargeRes = await fetch(`${BASE_URL}/charges`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        amount:        Math.round(params.amount * 100),
        currency_code: 'PEN',
        email:         params.email,
        source_id:     yapeToken.id,
        description:   params.description,
        metadata:      params.metadata ?? {},
      }),
    });

    const chargeData = await chargeRes.json();

    if (!chargeRes.ok) {
      const err = chargeData as CulqiErrorResponse;
      return { ok: false, error: err.user_message ?? 'Error al procesar pago Yape' };
    }

    const charge = chargeData as CulqiChargeResponse;
    return { ok: true, chargeId: charge.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado' };
  }
}
