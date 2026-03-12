// ── Izipay server-side API client ────────────────────────────
// Docs: https://developers.izipay.pe/
//
// Env vars required:
//   IZIPAY_SHOP_ID          — Código de comercio (Izipay Panel → Claves API)
//   IZIPAY_API_KEY          — Clave API / Password (privada, solo servidor)
//   IZIPAY_HASH_KEY         — Clave HMAC-SHA256 (para validar respuestas)
//   NEXT_PUBLIC_IZIPAY_PUBLIC_KEY  — Clave pública (seguro exponerla en el frontend)
//   NEXT_PUBLIC_IZIPAY_BASE_URL    — Base URL del checkout JS
//                                    sandbox: https://sandbox-checkout.izipay.pe
//                                    producción: https://checkout.izipay.pe

const API_ENDPOINT = 'https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment';

function basicAuth(): string {
  const shopId = process.env.IZIPAY_SHOP_ID;
  const apiKey = process.env.IZIPAY_API_KEY;
  if (!shopId || !apiKey) throw new Error('IZIPAY_SHOP_ID o IZIPAY_API_KEY no configuradas');
  return 'Basic ' + Buffer.from(`${shopId}:${apiKey}`).toString('base64');
}

// ── Types ────────────────────────────────────────────────────
export interface IzipaySession {
  formToken: string;
  publicKey: string;
  baseUrl:   string;   // base URL for KRGlue.loadLibrary
}

export type SessionResult =
  | { ok: true;  session: IzipaySession }
  | { ok: false; error: string };

// ── Create payment session ───────────────────────────────────
// Returns a formToken that the frontend uses to render the payment form.
// The form auto-includes: tarjeta de crédito, débito, Yape, Plin.
export async function createPaymentSession(params: {
  amount:       number;   // soles (converted to centimos internally)
  orderId:      string;   // unique order ID
  email:        string;
  firstName:    string;
  lastName:     string;
  phone:        string;
  dni:          string;
}): Promise<SessionResult> {
  try {
    const res = await fetch(API_ENDPOINT, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': basicAuth(),
      },
      body: JSON.stringify({
        amount:   Math.round(params.amount * 100),   // soles → centimos
        currency: 'PEN',
        orderId:  params.orderId,
        customer: {
          email:        params.email,
          firstName:    params.firstName,
          lastName:     params.lastName,
          phoneNumber:  params.phone.replace(/\s/g, ''),
          identityType: 'DNI',
          identityCode: params.dni,
          country:      'PE',
        },
      }),
    });

    const data = await res.json() as {
      status: string;
      answer: { formToken?: string; errorMessage?: string };
    };

    if (data.status !== 'SUCCESS' || !data.answer?.formToken) {
      return {
        ok:    false,
        error: data.answer?.errorMessage ?? 'Error al crear sesión de pago con Izipay',
      };
    }

    return {
      ok: true,
      session: {
        formToken: data.answer.formToken,
        publicKey: process.env.NEXT_PUBLIC_IZIPAY_PUBLIC_KEY ?? '',
        baseUrl:   process.env.NEXT_PUBLIC_IZIPAY_BASE_URL
                     ?? 'https://sandbox-checkout.izipay.pe',
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado' };
  }
}

// ── Validate payment response ────────────────────────────────
// Called after the frontend receives the KR.onSubmit response.
// Validates the HMAC-SHA256 signature to confirm the response is authentic.
import { createHmac } from 'crypto';

export function validatePaymentResponse(
  rawClientAnswer: string,
  hash: string,
): boolean {
  const hashKey = process.env.IZIPAY_HASH_KEY;
  if (!hashKey) throw new Error('IZIPAY_HASH_KEY no configurada');
  const computed = createHmac('sha256', hashKey)
    .update(rawClientAnswer)
    .digest('hex');
  return computed === hash;
}
