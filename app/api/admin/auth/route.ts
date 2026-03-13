import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function computeSessionToken(password: string): string {
  return createHmac('sha256', password).update('admin-session').digest('hex');
}

// POST /api/admin/auth — login
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { password?: string } | null;
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    return NextResponse.json({ ok: false, error: 'Servidor no configurado' }, { status: 503 });
  }

  if (!body?.password || body.password !== password) {
    return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const token = computeSessionToken(password);

  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === 'production',
    sameSite:  'strict',
    maxAge:    60 * 60 * 8, // 8 horas
    path:      '/',
  });
  return response;
}

// DELETE /api/admin/auth — logout
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('admin_session', '', { maxAge: 0, path: '/' });
  return response;
}
