import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSetNX, kvDel, kvAvailable } from '@/lib/kv';
import { getPromotorBySession } from '@/lib/promotors-kv';
import type { BoxBuyer } from '@/lib/boxes';

const SOLD_TTL = 120 * 24 * 60 * 60; // 120 days

// POST /api/boxes/promotor-sell
// Accessible with a valid promotor_session cookie (not admin-only).
// Atomically marks a box as sold by the promotor — returns 409 if already taken.
export async function POST(req: NextRequest) {
  // 1. Verify promotor session
  const token    = req.cookies.get('promotor_session')?.value ?? '';
  const promotor = await getPromotorBySession(token);
  if (!promotor) {
    return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });
  }

  // 2. Parse body
  const body = await req.json().catch(() => null) as {
    boxId: string;
    buyer: {
      name:      string;
      dni:       string;
      entries:   number;
      paidAmount: number;
    };
  } | null;

  if (!body?.boxId || !body?.buyer) {
    return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });
  }

  if (!kvAvailable()) {
    return NextResponse.json({ ok: false, error: 'Redis no disponible' }, { status: 503 });
  }

  const { boxId, buyer } = body;

  // 3. Check box is not already sold
  const existingSold = await kvGet(`box:sold:${boxId}`);
  if (existingSold) {
    return NextResponse.json({ ok: false, error: 'Este box ya no está disponible' }, { status: 409 });
  }

  // 4. Atomically claim: SET NX so two concurrent calls can't both succeed
  const boxBuyer: BoxBuyer = {
    buyerId:      Math.random().toString(36).slice(2),
    name:         buyer.name,
    email:        '',
    phone:        '',
    dni:          buyer.dni,
    entries:      buyer.entries,
    purchaseType: 'full',
    paidAmount:   buyer.paidAmount,
    purchasedAt:  new Date().toISOString(),
    promotorId:   promotor.id,
  };

  const claimed = await kvSetNX(`box:sold:${boxId}`, JSON.stringify(boxBuyer), SOLD_TTL);
  if (!claimed) {
    return NextResponse.json({ ok: false, error: 'Este box ya no está disponible' }, { status: 409 });
  }

  // 5. Clear any temp reservation on this box
  await kvDel(`box:res:${boxId}`);

  return NextResponse.json({ ok: true });
}
