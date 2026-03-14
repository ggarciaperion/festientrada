import { NextRequest, NextResponse } from 'next/server';
import { getAllPromotors, createPromotor, updatePromotor, deletePromotor } from '@/lib/promotors-kv';
import type { Promotor } from '@/lib/promotors';

// Protected by middleware (admin session required)

// GET — list all promotors
export async function GET() {
  const promotors = await getAllPromotors();
  return NextResponse.json({ ok: true, promotors });
}

// POST — create / update / delete
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    action: 'create' | 'update' | 'delete';
    id?: string;
    data?: Partial<Omit<Promotor, 'id' | 'createdAt'>>;
  } | null;

  if (!body?.action) {
    return NextResponse.json({ ok: false, error: 'action requerida' }, { status: 400 });
  }

  if (body.action === 'create') {
    if (!body.data?.name || !body.data.dni || !body.data.password) {
      return NextResponse.json({ ok: false, error: 'Nombre, DNI y contraseña son requeridos' }, { status: 400 });
    }
    const existing = (await getAllPromotors()).find(p => p.dni === body.data!.dni);
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Ya existe un promotor con ese DNI' }, { status: 409 });
    }
    const p = await createPromotor({
      name:     body.data.name,
      dni:      body.data.dni,
      password: body.data.password,
      status:   body.data.status ?? 'active',
    });
    return NextResponse.json({ ok: true, promotor: p });
  }

  if (body.action === 'update') {
    if (!body.id || !body.data) {
      return NextResponse.json({ ok: false, error: 'id y data requeridos' }, { status: 400 });
    }
    await updatePromotor(body.id, body.data);
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'delete') {
    if (!body.id) {
      return NextResponse.json({ ok: false, error: 'id requerido' }, { status: 400 });
    }
    await deletePromotor(body.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'action inválida' }, { status: 400 });
}
