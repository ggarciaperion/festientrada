import { NextRequest, NextResponse } from 'next/server';
import { kvDel, kvSet, kvAvailable } from '@/lib/kv';
import { initBoxes } from '@/lib/boxes';
import type { BoxBuyer, PurchaseType } from '@/lib/boxes';

// POST /api/boxes/admin
// Protected by middleware (requires admin_session cookie).
// Actions: set-available | mark-sold-promotor | reset
const SOLD_TTL = 120 * 24 * 60 * 60; // 120 days

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    action:       'set-available' | 'mark-sold-promotor' | 'reset';
    boxId?:       string;
    buyer?: {
      name:         string;
      email?:       string;
      phone?:       string;
      dni:          string;
      entries:      number;
      purchaseType: PurchaseType;
      paidAmount:   number;
      promotorId?:  string;
    };
  } | null;

  if (!body?.action) {
    return NextResponse.json({ ok: false, error: 'Acción requerida' }, { status: 400 });
  }

  if (!kvAvailable()) {
    return NextResponse.json({ ok: false, error: 'Redis no disponible' }, { status: 503 });
  }

  // ── Reset all boxes ──────────────────────────────────────────
  if (body.action === 'reset') {
    const boxes = initBoxes();
    await Promise.all([
      ...boxes.map(b => kvDel(`box:sold:${b.id}`)),
      ...boxes.map(b => kvDel(`box:res:${b.id}`)),
    ]);
    return NextResponse.json({ ok: true });
  }

  if (!body.boxId) {
    return NextResponse.json({ ok: false, error: 'boxId requerido' }, { status: 400 });
  }
  const { boxId } = body;

  // ── Set box available (admin override) ──────────────────────
  if (body.action === 'set-available') {
    await Promise.all([
      kvDel(`box:sold:${boxId}`),
      kvDel(`box:res:${boxId}`),
    ]);
    return NextResponse.json({ ok: true });
  }

  // ── Mark sold by promotor ────────────────────────────────────
  if (body.action === 'mark-sold-promotor' && body.buyer) {
    const buyer: BoxBuyer = {
      buyerId:      Math.random().toString(36).slice(2),
      name:         body.buyer.name,
      email:        body.buyer.email ?? '',
      phone:        body.buyer.phone ?? '',
      dni:          body.buyer.dni,
      entries:      body.buyer.entries,
      purchaseType: body.buyer.purchaseType,
      paidAmount:   body.buyer.paidAmount,
      purchasedAt:  new Date().toISOString(),
      promotorId:   body.buyer.promotorId,
    };
    await Promise.all([
      kvSet(`box:sold:${boxId}`, JSON.stringify(buyer), SOLD_TTL),
      kvDel(`box:res:${boxId}`),
    ]);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'Acción no reconocida' }, { status: 400 });
}
