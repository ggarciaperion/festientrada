import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvSet, kvSetNX, kvDel, kvAvailable } from '@/lib/kv';

const RESERVATION_SECONDS = 10 * 60; // 10 minutes

// POST /api/boxes/reserve
// Body: { boxId: string, sessionId: string }
// Atomically reserves a box for a session. Releases any previous reservation
// held by this session. Returns { ok: false } if the box is already taken.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as
    { boxId?: string; sessionId?: string } | null;

  if (!body?.boxId || !body?.sessionId) {
    return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });
  }

  const { boxId, sessionId } = body;

  // No Redis — allow through (box state falls back to client-side)
  if (!kvAvailable()) {
    return NextResponse.json({ ok: true, noRedis: true });
  }

  // Box already sold?
  const sold = await kvGet(`box:sold:${boxId}`);
  if (sold) return NextResponse.json({ ok: false, error: 'Box ya vendido' });

  // Release previous reservation held by this session (reverse index)
  const prevBoxId = await kvGet(`session:res:${sessionId}`);
  if (prevBoxId && prevBoxId !== boxId) {
    const prevSession = await kvGet(`box:res:${prevBoxId}`);
    if (prevSession === sessionId) await kvDel(`box:res:${prevBoxId}`);
  }

  // Try to reserve atomically — NX fails if another session already holds it
  const reserved = await kvSetNX(`box:res:${boxId}`, sessionId, RESERVATION_SECONDS);
  if (!reserved) {
    // Maybe this session already owns it
    const existing = await kvGet(`box:res:${boxId}`);
    if (existing !== sessionId) {
      return NextResponse.json({ ok: false, error: 'Box ya reservado por otro usuario' });
    }
  }

  // Update reverse index
  await kvSet(`session:res:${sessionId}`, boxId, RESERVATION_SECONDS);

  return NextResponse.json({ ok: true });
}
