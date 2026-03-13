import { NextRequest, NextResponse } from 'next/server';
import { verifyTicketToken } from '@/lib/tickets';
import { kvGet, kvAvailable } from '@/lib/kv';
import type { TicketCounter } from '@/app/api/tickets/confirm/route';

function effectiveTotal(type: string, qty: number): number {
  return type === 'box' ? 10 : qty;
}

// GET /api/tickets/info?token={token}
// Returns ticket payload + counter state. READ-ONLY.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Token requerido' }, { status: 400 });
  }

  const payload = verifyTicketToken(token);
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'Entrada inválida o manipulada' }, { status: 400 });
  }

  const total = effectiveTotal(payload.type, payload.qty);
  let remaining = total;
  let scans: TicketCounter['scans'] = [];

  if (kvAvailable()) {
    try {
      const raw = await kvGet(`ticket:counter:${payload.id}`);
      if (raw) {
        const counter = JSON.parse(raw) as TicketCounter;
        remaining = counter.remaining;
        scans     = counter.scans;
      }
    } catch {
      // Redis error — treat as unseen ticket
    }
  }

  return NextResponse.json({
    ok: true,
    payload,
    total,
    remaining,
    used: remaining <= 0,
    scans,
  });
}
