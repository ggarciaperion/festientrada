import { NextRequest, NextResponse } from 'next/server';
import { validatePaymentResponse } from '@/lib/izipay';

// POST /api/payment/validate
// Validates the Izipay payment response received by the frontend after KR.onSubmit.
// Uses HMAC-SHA256 with IZIPAY_HASH_KEY to verify the response is authentic.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Cuerpo inválido' }, { status: 400 });
  }

  const { clientAnswer, rawClientAnswer, hash } = body as {
    clientAnswer:    Record<string, unknown>;
    rawClientAnswer: string;
    hash:            string;
  };

  if (!rawClientAnswer || !hash) {
    return NextResponse.json({ ok: false, error: 'Datos de validación incompletos' }, { status: 400 });
  }

  // Validate signature
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
  return NextResponse.json({ ok: true, orderId });
}
