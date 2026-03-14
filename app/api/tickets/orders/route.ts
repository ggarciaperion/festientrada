import { NextResponse } from 'next/server';
import { kvLRange, kvMGet } from '@/lib/kv';
import type { OnlineOrder } from '@/app/api/payment/process/route';

// GET /api/tickets/orders
// Admin endpoint — returns all online MercadoPago orders stored in Redis.
// Protected by middleware (requires admin_session cookie).

export async function GET() {
  try {
    // Get up to 1000 order IDs (newest first via LPUSH)
    const orderIds = await kvLRange('online:orders', 0, 999);
    if (orderIds.length === 0) return NextResponse.json({ ok: true, orders: [] });

    const keys = orderIds.map(id => `online:order:${id}`);
    const values = await kvMGet(keys);

    const orders: OnlineOrder[] = values
      .filter((v): v is string => v !== null)
      .map(v => JSON.parse(v) as OnlineOrder);

    return NextResponse.json({ ok: true, orders });
  } catch (e) {
    console.error('Error fetching orders:', e);
    return NextResponse.json({ ok: true, orders: [] });
  }
}
