import { NextRequest, NextResponse } from 'next/server';

const IZIPAY_USER     = process.env.IZIPAY_USER!;
const IZIPAY_PASSWORD = process.env.IZIPAY_PASSWORD!;
const IZIPAY_API      = 'https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment';

// POST /api/payment/create-token
// Generates an Izipay formToken to initialize the embedded payment form.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    amount:          number;
    buyerInfo:       { name: string; email: string; phone: string; dni: string };
    purchaseDetails: { type: string; zone: string; qty: number };
  } | null;

  if (!body?.amount || !body?.buyerInfo?.email) {
    return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });
  }

  const orderId = `FCP-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const auth    = Buffer.from(`${IZIPAY_USER}:${IZIPAY_PASSWORD}`).toString('base64');

  const nameParts = body.buyerInfo.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? '';
  const lastName  = nameParts.slice(1).join(' ') || undefined;

  const res = await fetch(IZIPAY_API, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Basic ${auth}`,
    },
    body: JSON.stringify({
      amount:   Math.round(body.amount * 100), // soles → céntimos
      currency: 'PEN',
      orderId,
      customer: {
        email:          body.buyerInfo.email,
        billingDetails: {
          firstName,
          lastName,
          phoneNumber:  body.buyerInfo.phone,
          identityCode: body.buyerInfo.dni,
          country:      'PE',
        },
      },
    }),
  });

  const data = await res.json() as { status: string; answer?: { formToken: string } };

  if (data.status !== 'SUCCESS' || !data.answer?.formToken) {
    console.error('Izipay create-token error:', JSON.stringify(data));
    return NextResponse.json({ ok: false, error: 'Error al iniciar el pago' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, formToken: data.answer.formToken, orderId });
}
