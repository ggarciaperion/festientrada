import { NextRequest, NextResponse } from 'next/server';
import { kvGet, kvDel, kvAvailable } from '@/lib/kv';

// POST /api/boxes/release
// Body: { boxId, sessionId }
// Releases a temporary reservation. Only works if the session matches.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as
    { boxId?: string; sessionId?: string } | null;

  if (!body?.boxId) {
    return NextResponse.json({ ok: false, error: 'boxId requerido' }, { status: 400 });
  }

  const { boxId, sessionId } = body;

  if (!kvAvailable()) {
    return NextResponse.json({ ok: true, noRedis: true });
  }

  if (sessionId) {
    const existing = await kvGet(`box:res:${boxId}`);
    if (existing && existing !== sessionId) {
      // Not this session's reservation — ignore silently
      return NextResponse.json({ ok: true });
    }
    await kvDel(`session:res:${sessionId}`);
  }

  await kvDel(`box:res:${boxId}`);
  return NextResponse.json({ ok: true });
}
