import { NextResponse } from 'next/server';
import { kvLRange, kvAvailable } from '@/lib/kv';

export interface ValidatedEntry {
  ticketId: string;
  orderId:  string;
  name:     string;
  zone:     string;
  type:     'box' | 'individual';
  qty:      number;
  at:       string;
}

// GET /api/tickets/validated
// Returns the last 200 validated tickets (newest first) from Redis audit log.
export async function GET() {
  if (!kvAvailable()) {
    return NextResponse.json({ ok: true, entries: [], noRedis: true });
  }
  try {
    const raw     = await kvLRange('ticket:log', 0, 199);
    const entries = raw.map(s => JSON.parse(s) as ValidatedEntry);
    return NextResponse.json({ ok: true, entries });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error al leer Redis' }, { status: 500 });
  }
}
