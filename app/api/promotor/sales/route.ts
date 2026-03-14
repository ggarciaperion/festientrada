import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import {
  getAllSales, getSalesByPromotor, addSale, deleteSale,
  getPromotorBySession,
} from '@/lib/promotors-kv';
import type { Sale } from '@/lib/promotors';

const PROMOTOR_COOKIE = 'promotor_session';
const ADMIN_COOKIE    = 'admin_session';

function isAdmin(req: NextRequest): boolean {
  const cookie   = req.cookies.get(ADMIN_COOKIE)?.value ?? '';
  const password = process.env.ADMIN_PASSWORD;
  if (!cookie || !password) return false;
  const expected = createHmac('sha256', password).update('admin-session').digest('hex');
  return cookie === expected;
}

// GET — promotor sees own sales; admin with ?all=1 sees all
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('all') === '1' && isAdmin(req)) {
    const sales = await getAllSales();
    return NextResponse.json({ ok: true, sales });
  }

  const token    = req.cookies.get(PROMOTOR_COOKIE)?.value ?? '';
  const promotor = await getPromotorBySession(token);
  if (!promotor) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });

  const sales = await getSalesByPromotor(promotor.id);
  return NextResponse.json({ ok: true, sales });
}

// POST — add sale (promotor session required)
export async function POST(req: NextRequest) {
  const token    = req.cookies.get(PROMOTOR_COOKIE)?.value ?? '';
  const promotor = await getPromotorBySession(token);
  if (!promotor) return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 });

  const body = await req.json().catch(() => null) as Omit<Sale, 'id' | 'createdAt'> | null;
  if (!body) return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 });

  const sale = await addSale({ ...body, promotorId: promotor.id });
  return NextResponse.json({ ok: true, sale });
}

// DELETE — delete sale (admin only)
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });

  const body = await req.json().catch(() => null) as { id?: string } | null;
  if (!body?.id) return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });

  await deleteSale(body.id);
  return NextResponse.json({ ok: true });
}
