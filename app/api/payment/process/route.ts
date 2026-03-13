import { NextRequest, NextResponse } from 'next/server';
import { createPayment } from '@/lib/mercadopago';
import { generateTicketToken } from '@/lib/tickets';
import { sendConfirmationEmail } from '@/lib/email';

// POST /api/payment/process
// Receives tokenized card data from the MercadoPago Card Payment Brick.
// Creates the actual charge via MP Payments API, then generates a signed ticket token.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    token:             string;
    payment_method_id: string;
    issuer_id?:        string | number;
    installments:      number;
    transaction_amount: number;
    payer?:            { email?: string; identification?: { type: string; number: string } };
    // Extra fields sent by our CheckoutPanel
    amount?:           number;
    email?:            string;
    buyerInfo?:        { name: string; email: string; phone: string; dni: string };
    purchaseDetails?:  { type: 'box' | 'individual'; zone: string; qty: number };
  } | null;

  if (!body?.token || !body?.payment_method_id) {
    return NextResponse.json({ ok: false, error: 'Datos de pago incompletos' }, { status: 400 });
  }

  // Use amount from buyerInfo flow (our controlled value), fallback to Brick's value
  const amount = body.amount ?? body.transaction_amount;
  const email  = body.email  ?? body.payer?.email ?? '';

  if (!amount || !email) {
    return NextResponse.json({ ok: false, error: 'Monto o correo faltante' }, { status: 400 });
  }

  // Split full name for MP
  const nameParts = (body.buyerInfo?.name ?? '').trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName  = nameParts.slice(1).join(' ') || undefined;

  const result = await createPayment({
    token:           body.token,
    paymentMethodId: body.payment_method_id,
    issuerId:        body.issuer_id,
    installments:    body.installments ?? 1,
    amount,
    email,
    firstName,
    lastName,
    dniNumber:       body.buyerInfo?.dni ?? body.payer?.identification?.number,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }

  const { payment } = result;

  if (payment.status !== 'approved') {
    const isPending = payment.status === 'pending' || payment.status === 'in_process';
    const msg = isPending
      ? 'Tu pago está siendo procesado. Recibirás un correo de confirmación en breve.'
      : `Pago rechazado: ${payment.status_detail ?? payment.status}`;
    return NextResponse.json({ ok: false, pending: isPending, error: msg });
  }

  const orderId = `FCP-${payment.id}`;

  // Generate HMAC-signed ticket token
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
        amount,
      }).catch(e => console.error('Error sending confirmation email:', e));
    }
  } catch (e) {
    console.error('Error generating ticket token:', e);
  }

  return NextResponse.json({ ok: true, orderId, ticketToken });
}
