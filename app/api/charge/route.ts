import { NextRequest, NextResponse } from 'next/server';
import { createCardCharge, createYapeCharge } from '@/lib/culqi';

// POST /api/charge
// body: { method, amount, email, name, dni, description, tokenId? (card), phone? + fingerprint? (yape) }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ ok: false, error: 'Cuerpo de solicitud inválido' }, { status: 400 });
  }

  const { method, amount, email, name, dni, description } = body as {
    method: string;
    amount: number;
    email: string;
    name: string;
    dni: string;
    description: string;
    tokenId?: string;
    phone?: string;
    fingerprint?: string;
  };

  // Validate common fields
  if (!method || !amount || !email || !description) {
    return NextResponse.json({ ok: false, error: 'Faltan parámetros requeridos' }, { status: 400 });
  }

  const metadata = { name: name ?? '', dni: dni ?? '' };

  // ── Card ──────────────────────────────────────────────────
  if (method === 'card') {
    const { tokenId } = body as { tokenId?: string };
    if (!tokenId) {
      return NextResponse.json({ ok: false, error: 'Token de tarjeta inválido' }, { status: 400 });
    }
    const result = await createCardCharge({ tokenId, amount, email, description, metadata });
    return NextResponse.json(result);
  }

  // ── Yape ──────────────────────────────────────────────────
  if (method === 'yape') {
    const { phone, fingerprint } = body as { phone?: string; fingerprint?: string };
    if (!phone || !fingerprint) {
      return NextResponse.json({ ok: false, error: 'Datos Yape incompletos' }, { status: 400 });
    }
    const result = await createYapeCharge({
      phoneNumber: phone,
      fingerprint,
      amount,
      email,
      description,
      metadata,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ ok: false, error: 'Método de pago no soportado' }, { status: 400 });
}
