import { NextRequest, NextResponse } from 'next/server';
import { loginPromotor, getPromotorBySession, logoutPromotor } from '@/lib/promotors-kv';

const COOKIE = 'promotor_session';

// POST — login
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { dni?: string; password?: string } | null;
  if (!body?.dni || !body?.password) {
    return NextResponse.json({ ok: false, error: 'DNI y contraseña requeridos' }, { status: 400 });
  }

  const result = await loginPromotor(body.dni.trim(), body.password.trim());
  if (!result) {
    return NextResponse.json({ ok: false, error: 'DNI o contraseña incorrectos, o cuenta inactiva.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, promotor: result.promotor });
  res.cookies.set(COOKIE, result.sessionToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   8 * 60 * 60,
    path:     '/',
  });
  return res;
}

// GET — get current promotor from session cookie
export async function GET(req: NextRequest) {
  const token   = req.cookies.get(COOKIE)?.value ?? '';
  const promotor = await getPromotorBySession(token);
  if (!promotor) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, promotor });
}

// DELETE — logout
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value ?? '';
  if (token) await logoutPromotor(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
