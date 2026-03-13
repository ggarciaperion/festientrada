import { NextRequest, NextResponse } from 'next/server';
import { verifyTicketToken } from '@/lib/tickets';
import QRCode from 'qrcode';

// GET /api/tickets/qr?token={token}
// Returns a QR PNG image for use in email <img> tags.
// Publicly accessible so email clients can fetch it.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return new NextResponse('Token requerido', { status: 400 });
  }

  const payload = verifyTicketToken(token);
  if (!payload) {
    return new NextResponse('Token inválido', { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://festientrada.com';
  const validationUrl = `${appUrl}/validar/${token}`;

  const pngBuffer = await QRCode.toBuffer(validationUrl, {
    width:                 300,
    margin:                2,
    errorCorrectionLevel:  'M',
    color: { dark: '#000000', light: '#ffffff' },
  });

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      'Content-Type':  'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
