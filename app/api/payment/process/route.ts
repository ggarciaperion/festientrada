import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateTicketToken } from '@/lib/tickets';
import { sendConfirmationEmail } from '@/lib/email';

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN!;

// POST /api/payment/process
// Creates a MercadoPago payment using the card token from the frontend brick.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    formData: {
      token:           string;
      installments:    number;
      paymentMethodId: string;
      payer?: { email?: string; identification?: { type?: string; number?: string } };
    };
    buyerInfo:       { name: string; email: string; phone: string; dni: string };
    purchaseDetails: { type: 'box' | 'individual'; zone: string; qty: number };
    amount:          number;
  } | null;

  if (!body?.formData?.token || !body?.buyerInfo || !body?.amount) {
    return NextResponse.json({ ok: false, error: 'Datos de pago incompletos' }, { status: 400 });
  }

  const orderId = `FCP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // ── Create payment via MercadoPago REST API ───────────────
  const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
    method:  'POST',
    headers: {
      'Content-Type':      'application/json',
      'Authorization':     `Bearer ${MP_ACCESS_TOKEN}`,
      'X-Idempotency-Key': uuidv4(),
    },
    body: JSON.stringify({
      transaction_amount: body.amount,
      token:              body.formData.token,
      payment_method_id:  body.formData.paymentMethodId,
      installments:       body.formData.installments ?? 1,
      payer: {
        email:          body.buyerInfo.email,
        identification: {
          type:   body.formData.payer?.identification?.type   ?? 'DNI',
          number: body.formData.payer?.identification?.number ?? body.buyerInfo.dni,
        },
      },
      description:        `Festival de Salsa y Timba · ${body.purchaseDetails.zone} · ${body.purchaseDetails.type}`,
      external_reference: orderId,
    }),
  }).catch(e => {
    console.error('MP fetch error:', e);
    return null;
  });

  if (!mpRes) {
    return NextResponse.json({ ok: false, error: 'Error de conexión con MercadoPago' }, { status: 502 });
  }

  const mpData = await mpRes.json() as {
    status:         string;
    status_detail:  string;
    id?:            number;
    error?:         string;
    message?:       string;
  };

  if (mpData.status !== 'approved') {
    console.error('MP payment not approved:', mpData);
    const detail = mpData.status_detail ?? mpData.message ?? mpData.status ?? 'rechazado';
    return NextResponse.json({ ok: false, error: `Pago no aprobado: ${detail}` });
  }

  // ── Generate ticket token & send email ────────────────────
  let ticketToken: string | undefined;
  try {
    if (body.purchaseDetails && body.buyerInfo) {
      ticketToken = generateTicketToken({
        orderId,
        type: body.purchaseDetails.type,
        zone: body.purchaseDetails.zone,
        qty:  body.purchaseDetails.qty,
        name: body.buyerInfo.name,
      });

      sendConfirmationEmail({
        buyerInfo:       body.buyerInfo,
        purchaseDetails: body.purchaseDetails,
        orderId,
        ticketToken,
        amount: body.amount,
      }).catch(e => console.error('Error sending confirmation email:', e));
    }
  } catch (e) {
    console.error('Error generating ticket token:', e);
  }

  return NextResponse.json({ ok: true, orderId, ticketToken });
}
