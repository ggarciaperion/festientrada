import { NextRequest, NextResponse } from 'next/server';

// Computes HMAC-SHA256(password, "admin-session") using the Web Crypto API
// (available in Edge runtime). Used to verify admin session cookies.
async function computeSessionToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('admin-session'));
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const ADMIN_ROUTES = ['/admin', '/api/tickets/validated'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    (pathname.startsWith('/admin') && pathname !== '/admin/login') ||
    pathname === '/api/tickets/validated';

  if (!isProtected) return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    // No password configured — block access entirely
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ ok: false, error: 'ADMIN_PASSWORD no configurado' }, { status: 503 });
    }
    return new NextResponse('Servidor no configurado', { status: 503 });
  }

  const cookieValue    = request.cookies.get('admin_session')?.value ?? '';
  const expectedToken  = await computeSessionToken(password);
  const isAuthenticated = cookieValue === expectedToken;

  if (!isAuthenticated) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
    }
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/tickets/validated'],
};
