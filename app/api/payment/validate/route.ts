import { NextRequest, NextResponse } from 'next/server';
import { validatePaymentResponse } from '@/lib/izipay';
import { generateTicketToken } from '@/lib/tickets';
import { sendConfirmationEmail } from '@/lib/email';

// POST /api/payment/validate
// Validates the Izipay payment response received by the frontend after KR.onSubmit.
// Uses HMAC-SHA256 with IZIPAY_HASH_KEY to verify the response is authentic.
// On success, generates a HMAC-signed ticket token and sends confirmation email.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Cuerpo inválido' }, { status: 400 });
  }

  const { clientAnswer, rawClientAnswer, hash, purchaseDetails, buyerInfo } = body as {
    clientAnswer:    Record<string, unknown>;
    rawClientAnswer: string;
    hash:            string;
    purchaseDetails?: { type: 'box' | 'individual'; zone: string; qty: number };
    buyerInfo?:       { name: string; email: string; phone: string; dni: string };
  };

  if (!rawClientAnswer || !hash) {
    return NextResponse.json({ ok: false, error: 'Datos de validación incompletos' }, { status: 400 });
  }

  // Validate Izipay HMAC signature
  let isValid: boolean;
  try {
    isValid = validatePaymentResponse(rawClientAnswer, hash);
  } catch (e) {
    console.error('Izipay validate error:', e);
    return NextResponse.json({ ok: false, error: 'Error de configuración del servidor' }, { status: 500 });
  }

  if (!isValid) {
    console.error('Izipay: firma HMAC inválida');
    return NextResponse.json({ ok: false, error: 'Respuesta de pago no auténtica' }, { status: 400 });
  }

  // Check payment status
  const answer = (typeof clientAnswer === 'string'
    ? JSON.parse(clientAnswer)
    : clientAnswer) as { orderStatus?: string; orderDetails?: { orderId?: string }; orderId?: string };

  if (answer.orderStatus !== 'PAID') {
    return NextResponse.json({
      ok:    false,
      error: answer.orderStatus === 'UNPAID' ? 'Pago no completado' : `Estado: ${answer.orderStatus}`,
    });
  }

  const orderId = answer.orderDetails?.orderId ?? answer.orderId ?? 'unknown';

  // Generate HMAC-signed ticket token (best-effort — doesn't fail the payment)
  let ticketToken: string | undefined;
  try {
    if (purchaseDetails && buyerInfo) {
      ticketToken = generateTicketToken({
        orderId,
        type: purchaseDetails.type,
        zone: purchaseDetails.zone,
        qty:  purchaseDetails.qty,
        name: buyerInfo.name,
      });

      // Send confirmation email (best-effort)
      sendConfirmationEmail({
        buyerInfo,
        purchaseDetails,
        orderId,
        ticketToken,
        amount: 0, // amount not needed here; already processed by Izipay
      }).catch(e => console.error('Error sending confirmation email:', e));
    }
  } catch (e) {
    console.error('Error generating ticket token:', e);
  }

  return NextResponse.json({ ok: true, orderId, ticketToken });
}
