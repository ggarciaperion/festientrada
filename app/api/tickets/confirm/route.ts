import { NextRequest, NextResponse } from 'next/server';
import { verifyTicketToken } from '@/lib/tickets';
import { kvGet, kvSet, kvLPush, kvAvailable } from '@/lib/kv';

// ── Counter model stored in Redis ─────────────────────────────
export interface TicketCounter {
  total:     number;
  remaining: number;
  scans:     Array<{ at: string; count: number }>;
}

const TTL = 72 * 60 * 60; // 72 hours

function effectiveTotal(type: string, qty: number): number {
  return type === 'box' ? 10 : qty;
}

// GET /api/tickets/confirm?token=  — read-only counter (for info page)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ ok: false, error: 'Token requerido' }, { status: 400 });

  const payload = verifyTicketToken(token);
  if (!payload) return NextResponse.json({ ok: false, error: 'Token inválido' }, { status: 400 });

  const total = effectiveTotal(payload.type, payload.qty);

  if (!kvAvailable()) {
    return NextResponse.json({ ok: true, total, remaining: total, scans: [] });
  }

  const raw = await kvGet(`ticket:counter:${payload.id}`);
  if (!raw) {
    return NextResponse.json({ ok: true, total, remaining: total, scans: [] });
  }
  const counter = JSON.parse(raw) as TicketCounter;
  return NextResponse.json({ ok: true, ...counter });
}

// POST /api/tickets/confirm — decrement counter
// Body: { token: string, count: number }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { token?: string; count?: number } | null;
  if (!body?.token) {
    return NextResponse.json({ ok: false, error: 'Token requerido' }, { status: 400 });
  }

  const payload = verifyTicketToken(body.token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Entrada inválida' }, { status: 400 });
  }

  const total = effectiveTotal(payload.type, payload.qty);

  // No Redis — allow through (HMAC is the only protection)
  if (!kvAvailable()) {
    return NextResponse.json({ ok: true, entered: body.count ?? total, remaining: 0, total, noRedis: true });
  }

  const key = `ticket:counter:${payload.id}`;
  const raw = await kvGet(key).catch(() => null);

  // Initialize on first scan
  const counter: TicketCounter = raw
    ? (JSON.parse(raw) as TicketCounter)
    : { total, remaining: total, scans: [] };

  if (counter.remaining <= 0) {
    return NextResponse.json({ ok: false, alreadyUsed: true, total: counter.total, remaining: 0 });
  }

  // Clamp requested count to what's actually available
  const entering = Math.min(Math.max(1, body.count ?? counter.remaining), counter.remaining);
  const now      = new Date().toISOString();

  counter.remaining -= entering;
  counter.scans.push({ at: now, count: entering });

  await kvSet(key, JSON.stringify(counter), TTL);

  // Write audit log entry when ticket is partially or fully consumed
  const logEntry = JSON.stringify({
    ticketId: payload.id,
    orderId:  payload.orderId,
    name:     payload.name,
    zone:     payload.zone,
    type:     payload.type,
    qty:      entering,
    total,
    remaining: counter.remaining,
    at:       now,
  });
  kvLPush('ticket:log', logEntry).catch(() => {/* non-blocking */});

  return NextResponse.json({
    ok:        true,
    entered:   entering,
    remaining: counter.remaining,
    total:     counter.total,
  });
}
