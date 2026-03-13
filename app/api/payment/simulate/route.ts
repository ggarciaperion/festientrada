import { NextRequest, NextResponse } from 'next/server';
import { generateTicketToken } from '@/lib/tickets';
import { sendConfirmationEmail } from '@/lib/email';

// POST /api/payment/simulate
// TEST MODE ONLY — bypasses Izipay, generates ticket token directly.
// Disabled in production unless SIMULATE_PAYMENT=true env var is set.

export async function POST(req: NextRequest) {
  const allowed =
    process.env.SIMULATE_PAYMENT === 'true' ||
    process.env.NODE_ENV !== 'production';

  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'No disponible en producción' }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as {
    buyerInfo?:      { name: string; email: string; phone: string; dni: string };
    purchaseDetails?: { type: 'box' | 'individual'; zone: string; qty: number };
    amount?:         number;
  } | null;

  if (!body?.buyerInfo || !body?.purchaseDetails) {
    return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });
  }

  const orderId = `SIM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  let ticketToken: string | undefined;
  try {
    ticketToken = generateTicketToken({
      orderId,
      type: body.purchaseDetails.type,
      zone: body.purchaseDetails.zone,
      qty:  body.purchaseDetails.qty,
      name: body.buyerInfo.name,
    });
  } catch (e) {
    console.error('Error generating ticket token:', e);
    return NextResponse.json({ ok: false, error: 'Error generando ticket' }, { status: 500 });
  }

  // Send confirmation email (best-effort)
  try {
    await sendConfirmationEmail({
      buyerInfo:       body.buyerInfo,
      purchaseDetails: body.purchaseDetails,
      orderId,
      ticketToken,
      amount:          body.amount ?? 0,
    });
  } catch (e) {
    console.error('Error sending confirmation email:', e);
  }

  return NextResponse.json({ ok: true, orderId, ticketToken });
}
