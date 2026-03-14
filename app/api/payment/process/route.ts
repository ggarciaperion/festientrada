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

  // Split full name into first/last for MP fraud scoring
  const nameParts = body.buyerInfo.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? body.buyerInfo.name;
  const lastName  = nameParts.slice(1).join(' ') || firstName;

  const phoneDigits = body.buyerInfo.phone.replace(/\D/g, '');

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
      currency_id:        'PEN',
      token:              body.formData.token,
      payment_method_id:  body.formData.paymentMethodId,
      installments:       body.formData.installments ?? 1,
      description:        `Festival de Salsa y Timba · ${body.purchaseDetails.zone} · ${body.purchaseDetails.type}`,
      external_reference: orderId,
      three_d_secure_mode: 'optional',
      payer: {
        email:      body.buyerInfo.email,
        first_name: firstName,
        last_name:  lastName,
        phone: {
          area_code: '51',
          number:    phoneDigits,
        },
        identification: {
          type:   body.formData.payer?.identification?.type   ?? 'DNI',
          number: body.formData.payer?.identification?.number ?? body.buyerInfo.dni,
        },
      },
      additional_info: {
        items: [{
          id:          orderId,
          title:       `Entrada ${body.purchaseDetails.type} · Zona ${body.purchaseDetails.zone}`,
          description: `Festival de Salsa y Timba Chancay 2026`,
          category_id: 'tickets',
          quantity:    body.purchaseDetails.qty,
          unit_price:  body.amount / Math.max(body.purchaseDetails.qty, 1),
        }],
        payer: {
          first_name:         firstName,
          last_name:          lastName,
          registration_date:  new Date().toISOString(),
          phone: {
            area_code: '51',
            number:    phoneDigits,
          },
        },
      },
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
