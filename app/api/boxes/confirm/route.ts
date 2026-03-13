import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet, kvDel, kvAvailable } from '@/lib/kv';
import type { BoxBuyer } from '@/lib/boxes';

const SOLD_TTL = 120 * 24 * 60 * 60; // 120 days

// POST /api/boxes/confirm
// Body: { boxId, sessionId, buyer }
// Called after successful payment. Marks box as sold and removes reservation.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    boxId?:     string;
    sessionId?: string;
    buyer?:     Omit<BoxBuyer, 'buyerId'>;
  } | null;

  if (!body?.boxId || !body?.buyer) {
    return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });
  }

  const { boxId, sessionId, buyer } = body;

  if (!kvAvailable()) {
    return NextResponse.json({ ok: true, noRedis: true });
  }

  // Already sold?
  const sold = await kvGet(`box:sold:${boxId}`);
  if (sold) return NextResponse.json({ ok: false, error: 'Box ya vendido' });

  // Verify reservation belongs to this session (lax — allow if expired)
  if (sessionId) {
    const resSession = await kvGet(`box:res:${boxId}`);
    if (resSession && resSession !== sessionId) {
      return NextResponse.json({ ok: false, error: 'Reserva no corresponde a esta sesión' });
    }
  }

  const newBuyer: BoxBuyer = {
    ...buyer,
    buyerId: Math.random().toString(36).slice(2) + Date.now().toString(36),
  };

  await Promise.all([
    kvSet(`box:sold:${boxId}`, JSON.stringify(newBuyer), SOLD_TTL),
    kvDel(`box:res:${boxId}`),
    sessionId ? kvDel(`session:res:${sessionId}`) : Promise.resolve(),
  ]);

  return NextResponse.json({ ok: true });
}
