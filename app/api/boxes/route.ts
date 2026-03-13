import { NextResponse } from 'next/server';
import { kvMGet, kvAvailable } from '@/lib/kv';
import { initBoxes } from '@/lib/boxes';
import type { BoxBuyer } from '@/lib/boxes';

// GET /api/boxes
// Returns all boxes with current state from Redis.
// Uses MGET to fetch all sold + reservation keys in 2 round-trips.
export async function GET() {
  const boxes = initBoxes();

  if (!kvAvailable()) {
    return NextResponse.json({ ok: true, boxes, noRedis: true });
  }

  try {
    const ids      = boxes.map(b => b.id);
    const soldKeys = ids.map(id => `box:sold:${id}`);
    const resKeys  = ids.map(id => `box:res:${id}`);

    const [soldVals, resVals] = await Promise.all([
      kvMGet(soldKeys),
      kvMGet(resKeys),
    ]);

    for (let i = 0; i < boxes.length; i++) {
      if (soldVals[i]) {
        boxes[i].status           = 'sold';
        boxes[i].buyers           = [JSON.parse(soldVals[i]!) as BoxBuyer];
        boxes[i].entriesAvailable = 0;
      } else if (resVals[i]) {
        boxes[i].status              = 'temp_reserved';
        boxes[i].reservedSessionId   = resVals[i]!;
      }
    }
  } catch {
    // Redis error — return initial state
    return NextResponse.json({ ok: true, boxes, redisError: true });
  }

  return NextResponse.json({ ok: true, boxes });
}
