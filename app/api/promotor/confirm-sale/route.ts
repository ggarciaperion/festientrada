import { NextRequest, NextResponse } from 'next/server';
import { generateTicketToken } from '@/lib/tickets';
import { sendConfirmationEmail } from '@/lib/email';
import type { SaleType } from '@/lib/promotors';

// POST /api/promotor/confirm-sale
// Called by admin when confirming cash/Yape/Plin payment.
// Generates a signed ticket token + sends confirmation email to the client.

interface ConfirmBody {
  sale: {
    id: string;
    clientName: string;
    clientEmail: string;
    clientDni: string;
    saleType: SaleType;
    zone: string;
    entries: number;
    price: number;
    boxId?: string;
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as ConfirmBody | null;

  if (!body?.sale?.clientName || !body?.sale?.clientEmail) {
    return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });
  }

  const { sale } = body;
  const isBox   = sale.saleType.startsWith('box_');
  const type    = isBox ? 'box' : 'individual';
  const qty     = isBox ? 10 : sale.entries;
  const orderId = `PROM-${sale.id.slice(-8).toUpperCase()}`;

  let ticketToken: string;
  try {
    ticketToken = generateTicketToken({ orderId, type, zone: sale.zone, qty, name: sale.clientName });
  } catch (e) {
    console.error('Error generating ticket token:', e);
    return NextResponse.json({ ok: false, error: 'Error generando ticket' }, { status: 500 });
  }

  try {
    await sendConfirmationEmail({
      buyerInfo:       { name: sale.clientName, email: sale.clientEmail, phone: '', dni: sale.clientDni },
      purchaseDetails: { type, zone: sale.zone, qty },
      orderId,
      ticketToken,
      amount: sale.price,
    });
  } catch (e) {
    console.error('Error sending email:', e);
    // Don't fail the request — token is generated, email can be resent
  }

  return NextResponse.json({ ok: true, ticketToken, orderId });
}
