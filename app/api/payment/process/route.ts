import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateTicketToken } from '@/lib/tickets';
import { sendConfirmationEmail } from '@/lib/email';

const IZIPAY_HMAC = process.env.IZIPAY_HMAC!;

// POST /api/payment/process
// Validates the Izipay payment signature and generates a signed ticket token.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    rawClientAnswer: string;
    hash:            string;
    buyerInfo:       { name: string; email: string; phone: string; dni: string };
    purchaseDetails: { type: 'box' | 'individual'; zone: string; qty: number };
    amount:          number;
    orderId?:        string;
  } | null;

  if (!body?.rawClientAnswer || !body?.hash) {
    return NextResponse.json({ ok: false, error: 'Datos de pago incompletos' }, { status: 400 });
  }

  // ── 1. Verify HMAC-SHA256 signature ─────────────────────────
  const computed = crypto
    .createHmac('sha256', IZIPAY_HMAC)
    .update(body.rawClientAnswer)
    .digest('hex');

  if (computed !== body.hash) {
    console.error('Izipay HMAC mismatch', { computed, received: body.hash });
    return NextResponse.json({ ok: false, error: 'Firma de pago inválida' }, { status: 400 });
  }

  // ── 2. Parse client answer ───────────────────────────────────
  let clientAnswer: {
    orderStatus?: string;
    orderId?:     string;
    transactions?: Array<{ uuid?: string; status?: string }>;
  };
  try {
    clientAnswer = JSON.parse(Buffer.from(body.rawClientAnswer, 'base64').toString('utf-8'));
  } catch {
    return NextResponse.json({ ok: false, error: 'Respuesta de pago inválida' }, { status: 400 });
  }

  if (clientAnswer.orderStatus !== 'PAID') {
    const status = clientAnswer.orderStatus ?? 'desconocido';
    return NextResponse.json({ ok: false, error: `Pago no aprobado (${status}). Intenta de nuevo.` });
  }

  // ── 3. Generate ticket token & send email ────────────────────
  const orderId = body.orderId
    ?? clientAnswer.orderId
    ?? `FCP-${clientAnswer.transactions?.[0]?.uuid ?? Date.now()}`;

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
