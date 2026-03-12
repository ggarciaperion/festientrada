import { NextRequest, NextResponse } from 'next/server';
import { createPaymentSession } from '@/lib/izipay';

// POST /api/payment/create-session
// Creates an Izipay formToken that the frontend uses to render the embedded payment form.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  const { amount, email, firstName, lastName, phone, dni, description } = body as {
    amount:      number;
    email:       string;
    firstName:   string;
    lastName:    string;
    phone:       string;
    dni:         string;
    description: string;
  };

  if (!amount || !email || !firstName || !phone || !dni) {
    return NextResponse.json({ ok: false, error: 'Faltan campos requeridos' }, { status: 400 });
  }

  // Generate a unique order ID (timestamp + random suffix)
  const orderId = `FCP-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const result = await createPaymentSession({
    amount,
    orderId,
    email,
    firstName,
    lastName:  lastName || '-',
    phone,
    dni,
  });

  return NextResponse.json(result);
}
