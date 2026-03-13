// ── MercadoPago server-side client ───────────────────────────
// Docs: https://www.mercadopago.com.pe/developers/en/reference/
//
// Env vars required:
//   MERCADOPAGO_ACCESS_TOKEN           — private, server-side only
//   NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY — exposed to client for Bricks init

const MP_BASE = 'https://api.mercadopago.com';

export interface MPPayment {
  id:             number;
  status:         'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled' | string;
  status_detail:  string;
  message?:       string;  // present on API errors
}

export type CreatePaymentResult =
  | { ok: true;  payment: MPPayment }
  | { ok: false; error: string };

// ── Create payment ───────────────────────────────────────────
// Called server-side with the tokenized card data from the Brick.
export async function createPayment(params: {
  token:           string;
  paymentMethodId: string;
  issuerId?:       string | number;
  installments:    number;
  amount:          number;
  email:           string;
  firstName?:      string;
  lastName?:       string;
  dniNumber?:      string;
}): Promise<CreatePaymentResult> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return { ok: false, error: 'MERCADOPAGO_ACCESS_TOKEN no configurado' };
  }

  const idempotencyKey = `fcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const res = await fetch(`${MP_BASE}/v1/payments`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'Authorization':   `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: params.amount,
        token:              params.token,
        description:        'Festival Cubanada Perion 2026',
        installments:       params.installments,
        payment_method_id:  params.paymentMethodId,
        issuer_id:          params.issuerId,
        payer: {
          email:      params.email,
          first_name: params.firstName,
          last_name:  params.lastName,
          identification: params.dniNumber
            ? { type: 'DNI', number: params.dniNumber }
            : undefined,
        },
      }),
    });

    const data = await res.json() as MPPayment;

    if (!res.ok) {
      return { ok: false, error: data.message ?? `MP error ${res.status}` };
    }
    return { ok: true, payment: data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error inesperado' };
  }
}
