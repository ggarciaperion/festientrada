'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ZONE_COLORS, STATUS_COLORS, type Box, type BoxStatus } from '@/lib/boxes';
import {
  SALE_TYPE_LABELS,
  IS_BOX_SALE,
  type Promotor,
  type Sale,
} from '@/lib/promotors';
import type { OnlineOrder } from '@/app/api/payment/process/route';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'boxes' | 'promotores' | 'clientes'>('dashboard');
  const [onlineOrders, setOnlineOrders] = useState<OnlineOrder[]>([]);
  const [boxes,   setBoxes]   = useState<Box[]>([]);
  const [boxStats, setBoxStats] = useState({
    totalBoxes: 0, available: 0, reserved: 0, sold: 0, revenue: 0,
  });

  // Promotores state
  const [promotors, setPromotors]           = useState<Promotor[]>([]);
  const [promotorSales, setPromotorSales]   = useState<Sale[]>([]);
  const [selectedPromotorId, setSelectedPromotorId] = useState<string | null>(null);
  const [editingPromotor, setEditingPromotor]     = useState<Promotor | null>(null);
  const [pForm, setPForm] = useState({ name: '', dni: '', password: '', status: 'active' as 'active' | 'inactive' });
  const [pFormError, setPFormError] = useState('');

  // QR Validados (Redis)
  interface QREntry { ticketId: string; orderId: string; name: string; zone: string; type: string; qty: number; at: string; }
  const [qrEntries,   setQrEntries]   = useState<QREntry[]>([]);
  const [qrLoading,   setQrLoading]   = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    loadQREntries();
    try {
      const [promRes, salesRes, ordersRes] = await Promise.all([
        fetch('/api/promotor/manage').then(r => r.json()),
        fetch('/api/promotor/sales?all=1').then(r => r.json()),
        fetch('/api/tickets/orders').then(r => r.json()),
      ]);
      if (promRes.ok  && promRes.promotors)  setPromotors(promRes.promotors);
      if (salesRes.ok && salesRes.sales)     setPromotorSales(salesRes.sales);
      if (ordersRes.ok && ordersRes.orders)  setOnlineOrders(ordersRes.orders);
    } catch { /* Redis might not be available */ }
    try {
      const res  = await fetch('/api/boxes');
      const data = await res.json() as { ok: boolean; boxes?: Box[] };
      if (data.ok && data.boxes) {
        const b = data.boxes;
        setBoxes(b);
        setBoxStats({
          totalBoxes: b.length,
          available:  b.filter(x => x.status === 'available').length,
          reserved:   b.filter(x => x.status === 'temp_reserved').length,
          sold:       b.filter(x => x.status === 'sold').length,
          revenue:    b.reduce((s, x) => s + x.buyers.reduce((a, by) => a + by.paidAmount, 0), 0),
        });
      }
    } catch { /* Redis might not be available */ }
  };

  const loadQREntries = () => {
    setQrLoading(true);
    fetch('/api/tickets/validated')
      .then(r => r.json())
      .then((data: { ok: boolean; entries?: QREntry[] }) => {
        if (data.ok && data.entries) setQrEntries(data.entries);
      })
      .catch(() => {/* Redis might not be configured */})
      .finally(() => setQrLoading(false));
  };

  const handleBoxStatusChange = async (boxId: string, status: BoxStatus) => {
    await fetch('/api/boxes/admin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: status === 'available' ? 'set-available' : 'set-available', boxId }),
    });
    loadData();
  };

  const handleResetBoxes = async () => {
    if (confirm('¿Resetear TODOS los boxes a disponible? Esto borrará todas las ventas de boxes.')) {
      await fetch('/api/boxes/admin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'reset' }),
      });
      loadData();
    }
  };

  // ── Promotor handlers ──────────────────────────────────────
  const handleCreatePromotor = async () => {
    setPFormError('');
    if (!pForm.name || !pForm.dni || !pForm.password) { setPFormError('Completa todos los campos.'); return; }

    const action = editingPromotor ? 'update' : 'create';
    const body   = editingPromotor
      ? { action, id: editingPromotor.id, data: pForm }
      : { action, data: pForm };

    const res  = await fetch('/api/promotor/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json() as { ok: boolean; error?: string };
    if (!data.ok) { setPFormError(data.error ?? 'Error al guardar.'); return; }

    setPForm({ name: '', dni: '', password: '', status: 'active' });
    setEditingPromotor(null);
    loadData();
  };

  const handleEditPromotor = (p: Promotor) => {
    setEditingPromotor(p);
    setPForm({ name: p.name, dni: p.dni, password: p.password, status: p.status });
  };

  const handleDeletePromotor = async (id: string) => {
    if (!confirm('¿Eliminar este promotor y todas sus ventas?')) return;
    await fetch('/api/promotor/manage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    if (selectedPromotorId === id) setSelectedPromotorId(null);
    loadData();
  };

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');

  const handleConfirmSale = async (sale: Sale) => {
    if (!confirm(`¿Confirmar pago de ${sale.clientName} por S/ ${sale.price}?\nSe generará el QR y se enviará por email a ${sale.clientEmail}.`)) return;
    setConfirmingId(sale.id);
    try {
      const res  = await fetch('/api/promotor/confirm-sale', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sale }),
      });
      const data = await res.json() as { ok: boolean; ticketToken?: string; orderId?: string; error?: string };
      if (data.ok) {
        loadData();
        alert(`✅ Pago confirmado. QR enviado a ${sale.clientEmail}`);
      } else {
        alert(`Error: ${data.error ?? 'No se pudo confirmar'}`);
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDeleteSale = async (saleId: string, boxId?: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    await Promise.all([
      boxId ? fetch('/api/boxes/admin', {
        method:  'POST', headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'set-available', boxId }),
      }) : Promise.resolve(),
      fetch('/api/promotor/sales', {
        method:  'DELETE', headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: saleId }),
      }),
    ]);
    loadData();
  };


  return (
    <main className="min-h-screen py-10 sm:py-20 bg-[#09090F]">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-6">
            <div>
              <h1 className="font-heading font-black text-2xl sm:text-3xl text-white mb-1">Panel de Administración</h1>
              <p className="text-slate-400 text-sm">Festival de Salsa y Timba Chancay 2026</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={loadData} className="btn-secondary text-sm px-4 py-2">🔄 Actualizar</button>
              <Link href="/mapa" className="btn-secondary text-sm px-4 py-2">Ver Mapa</Link>
              <Link href="/" className="btn-primary text-sm px-4 py-2">Ver Sitio</Link>
              <button
                onClick={async () => {
                  await fetch('/api/admin/auth', { method: 'DELETE' });
                  window.location.href = '/admin/login';
                }}
                className="btn-secondary text-sm px-4 py-2 text-rose-400 border-rose-500/30 hover:border-rose-500/60"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 sm:gap-2 border-b border-white/8 pb-0 overflow-x-auto">
            {([
              { id: 'dashboard',  label: '📊 Dashboard' },
              { id: 'boxes',      label: '📦 Boxes' },
              { id: 'promotores', label: '👥 Promotores' },
              { id: 'clientes',   label: '👤 Clientes' },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg border-b-2 transition whitespace-nowrap ${
                  activeTab === id
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════ BOXES TAB ════════════════ */}
        {activeTab === 'boxes' && (
          <div>
            {/* Box stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Boxes',  value: boxStats.totalBoxes, color: 'text-white'        },
                { label: 'Disponibles',  value: boxStats.available,  color: 'text-emerald-400'  },
                { label: 'Reservados',   value: boxStats.reserved,   color: 'text-amber-400'    },
                { label: 'Vendidos',     value: boxStats.sold,       color: 'text-slate-400'    },
              ].map(({ label, value, color }) => (
                <div key={label} className="card p-5 text-center">
                  <p className={`font-heading font-black text-3xl ${color} mb-1`}>{value}</p>
                  <p className="text-slate-500 text-xs">{label}</p>
                </div>
              ))}
            </div>

            <div className="card p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-white font-semibold">Ingresos por Boxes</p>
                <p className="text-amber-400 font-heading font-black text-2xl">S/ {boxStats.revenue.toFixed(2)}</p>
              </div>
              <button
                onClick={handleResetBoxes}
                className="px-4 py-2 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg text-sm hover:bg-red-500/25 transition self-start sm:self-auto"
              >
                🔄 Resetear todos los boxes
              </button>
            </div>

            {/* Box table */}
            <div className="card overflow-hidden">
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      {['Box', 'Zona', 'Estado', 'Entradas disponibles', 'Comprador(es)', 'Acciones'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boxes.map(box => {
                      const zoneColor = ZONE_COLORS[box.zone].stroke;
                      const statusColors = STATUS_COLORS[box.status];
                      return (
                        <tr key={box.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 font-mono font-bold text-white">{box.id}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold" style={{ color: zoneColor }}>
                              {ZONE_COLORS[box.zone].label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold px-2 py-1 rounded-full border"
                              style={{ color: statusColors.text, borderColor: statusColors.stroke, background: statusColors.fill }}>
                              {box.status === 'available' ? 'Disponible' : box.status === 'temp_reserved' ? 'Reservado' : 'Vendido'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{box.entriesAvailable}/{box.capacity}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {box.buyers.length > 0
                              ? box.buyers.map(b => b.name).join(', ')
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={box.status}
                              onChange={e => handleBoxStatusChange(box.id, e.target.value as BoxStatus)}
                              className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-slate-300 focus:outline-none"
                            >
                              <option value="available">Disponible</option>
                              <option value="temp_reserved">Reservado</option>
                              <option value="sold">Vendido</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-white/5">
                {boxes.map(box => {
                  const zoneColor = ZONE_COLORS[box.zone].stroke;
                  const statusColors = STATUS_COLORS[box.status];
                  return (
                    <div key={box.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-sm">{box.id}</span>
                          <span className="text-xs font-bold" style={{ color: zoneColor }}>{ZONE_COLORS[box.zone].label}</span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full border"
                          style={{ color: statusColors.text, borderColor: statusColors.stroke, background: statusColors.fill }}>
                          {box.status === 'available' ? 'Disponible' : box.status === 'temp_reserved' ? 'Reservado' : 'Vendido'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="text-slate-500">Entradas: <span className="text-slate-300">{box.entriesAvailable}/{box.capacity}</span></span>
                        <span className="text-slate-500 truncate max-w-[160px]">{box.buyers.length > 0 ? box.buyers.map(b => b.name).join(', ') : '—'}</span>
                      </div>
                      <select
                        value={box.status}
                        onChange={e => handleBoxStatusChange(box.id, e.target.value as BoxStatus)}
                        className="w-full text-xs bg-white/5 border border-white/10 rounded px-2 py-1.5 text-slate-300 focus:outline-none"
                      >
                        <option value="available">Disponible</option>
                        <option value="temp_reserved">Reservado</option>
                        <option value="sold">Vendido</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ PROMOTORES TAB ════════════════ */}
        {activeTab === 'promotores' && (
          <div className="space-y-6">

            {/* Formulario crear / editar */}
            <div className="card p-6">
              <h2 className="font-heading font-bold text-white text-lg mb-4">
                {editingPromotor ? '✏️ Editar promotor' : '➕ Crear promotor'}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Nombre</label>
                  <input type="text" value={pForm.name} onChange={e => setPForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre completo" className="form-input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">DNI</label>
                  <input type="text" value={pForm.dni} onChange={e => setPForm(f => ({ ...f, dni: e.target.value }))}
                    placeholder="12345678" className="form-input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Contraseña</label>
                  <input type="text" value={pForm.password} onChange={e => setPForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Contraseña" className="form-input w-full" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 uppercase tracking-wider mb-1">Estado</label>
                  <select value={pForm.status} onChange={e => setPForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                    className="form-input w-full">
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>
              {pFormError && <p className="text-red-400 text-xs mb-3 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{pFormError}</p>}
              <div className="flex gap-2">
                <button onClick={handleCreatePromotor} className="btn-primary text-sm px-5 py-2">
                  {editingPromotor ? 'Guardar cambios' : 'Crear promotor'}
                </button>
                {editingPromotor && (
                  <button onClick={() => { setEditingPromotor(null); setPForm({ name: '', dni: '', password: '', status: 'active' }); }}
                    className="btn-secondary text-sm px-4 py-2">Cancelar</button>
                )}
              </div>
            </div>

            {/* Ranking / lista de promotores */}
            <div className="card overflow-hidden">
              <div className="p-4 border-b border-white/5">
                <p className="font-semibold text-white">Promotores registrados ({promotors.length})</p>
              </div>
              {promotors.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No hay promotores creados aún</div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          {['Nombre', 'DNI', 'Estado', 'Ventas', 'Boxes', 'Ingresos', 'Acciones'].map(h => (
                            <th key={h} className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...promotors]
                          .sort((a, b) => {
                            const ra = promotorSales.filter(s => s.promotorId === a.id).reduce((x, s) => x + s.price, 0);
                            const rb = promotorSales.filter(s => s.promotorId === b.id).reduce((x, s) => x + s.price, 0);
                            return rb - ra;
                          })
                          .map(p => {
                            const pSales = promotorSales.filter(s => s.promotorId === p.id);
                            const st = {
                              totalSales:   pSales.length,
                              totalBoxes:   pSales.filter(s => IS_BOX_SALE[s.saleType]).length,
                              totalRevenue: pSales.reduce((a, s) => a + s.price, 0),
                            };
                            return (
                              <tr
                                key={p.id}
                                className={`border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer ${selectedPromotorId === p.id ? 'bg-amber-500/5' : ''}`}
                                onClick={() => setSelectedPromotorId(selectedPromotorId === p.id ? null : p.id)}
                              >
                                <td className="px-4 py-3 text-white font-medium">{p.name}</td>
                                <td className="px-4 py-3 text-slate-400 text-xs">{p.dni}</td>
                                <td className="px-4 py-3">
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                    p.status === 'active'
                                      ? 'text-green-400 border-green-500/40 bg-green-500/10'
                                      : 'text-slate-500 border-slate-600/40 bg-slate-700/20'
                                  }`}>
                                    {p.status === 'active' ? 'Activo' : 'Inactivo'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-300">{st.totalSales}</td>
                                <td className="px-4 py-3 text-slate-300">{st.totalBoxes}</td>
                                <td className="px-4 py-3 text-amber-400 font-bold">S/ {st.totalRevenue}</td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => handleEditPromotor(p)}
                                      className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:border-white/20 transition">
                                      Editar
                                    </button>
                                    <button onClick={async () => {
                                      await fetch('/api/promotor/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'update', id: p.id, data: { status: p.status === 'active' ? 'inactive' : 'active' } }) });
                                      loadData();
                                    }}
                                      className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1 rounded border border-amber-500/30 hover:border-amber-500/60 transition">
                                      {p.status === 'active' ? 'Desactivar' : 'Activar'}
                                    </button>
                                    <button onClick={() => handleDeletePromotor(p.id)}
                                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/30 hover:border-red-500/60 transition">
                                      Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile cards */}
                  <div className="sm:hidden divide-y divide-white/[0.03]">
                    {[...promotors]
                      .sort((a, b) => {
                        const ra = promotorSales.filter(s => s.promotorId === a.id).reduce((x, s) => x + s.price, 0);
                        const rb = promotorSales.filter(s => s.promotorId === b.id).reduce((x, s) => x + s.price, 0);
                        return rb - ra;
                      })
                      .map(p => {
                        const pSales = promotorSales.filter(s => s.promotorId === p.id);
                        const st = {
                          totalSales:   pSales.length,
                          totalBoxes:   pSales.filter(s => IS_BOX_SALE[s.saleType]).length,
                          totalRevenue: pSales.reduce((a, s) => a + s.price, 0),
                        };
                        return (
                          <div key={p.id}
                            className={`p-4 cursor-pointer hover:bg-white/[0.02] ${selectedPromotorId === p.id ? 'bg-amber-500/5' : ''}`}
                            onClick={() => setSelectedPromotorId(selectedPromotorId === p.id ? null : p.id)}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="text-white font-medium">{p.name}</p>
                                <p className="text-slate-500 text-xs mt-0.5">DNI: {p.dni}</p>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                p.status === 'active'
                                  ? 'text-green-400 border-green-500/40 bg-green-500/10'
                                  : 'text-slate-500 border-slate-600/40 bg-slate-700/20'
                              }`}>
                                {p.status === 'active' ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">
                              {st.totalSales} ventas · {st.totalBoxes} boxes · <span className="text-amber-400 font-bold">S/ {st.totalRevenue}</span>
                            </p>
                            <div className="flex gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleEditPromotor(p)}
                                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded border border-white/10 hover:border-white/20 transition">
                                Editar
                              </button>
                              <button onClick={async () => {
                                await fetch('/api/promotor/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ action: 'update', id: p.id, data: { status: p.status === 'active' ? 'inactive' : 'active' } }) });
                                loadData();
                              }}
                                className="text-xs text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded border border-amber-500/30 hover:border-amber-500/60 transition">
                                {p.status === 'active' ? 'Desactivar' : 'Activar'}
                              </button>
                              <button onClick={() => handleDeletePromotor(p.id)}
                                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded border border-red-500/30 hover:border-red-500/60 transition">
                                Eliminar
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>

            {/* Ventas del promotor seleccionado */}
            {selectedPromotorId && (() => {
              const p = promotors.find(x => x.id === selectedPromotorId);
              const sales = promotorSales.filter(s => s.promotorId === selectedPromotorId)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              if (!p) return null;
              const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <div className="card overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <p className="font-semibold text-white">Ventas de <span className="text-amber-400">{p.name}</span> ({sales.length})</p>
                    <button onClick={() => setSelectedPromotorId(null)} className="text-slate-500 hover:text-slate-300 text-sm">✕ Cerrar</button>
                  </div>
                  {sales.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">Este promotor no tiene ventas registradas</div>
                  ) : (
                    <>
                      {/* Desktop table */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/5">
                              {['Fecha', 'Cliente', 'Email', 'Tipo', 'Box', 'Monto', 'Estado', 'Acciones'].map(h => (
                                <th key={h} className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sales.map(sale => {
                              const isPending = (sale.status ?? 'pending') === 'pending';
                              return (
                              <tr key={sale.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${isPending ? 'bg-amber-500/[0.02]' : ''}`}>
                                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(sale.createdAt)}</td>
                                <td className="px-4 py-3 text-white font-medium">
                                  <p>{sale.clientName}</p>
                                  <p className="text-slate-500 text-xs">{sale.clientDni}</p>
                                </td>
                                <td className="px-4 py-3 text-slate-400 text-xs">{sale.clientEmail || '—'}</td>
                                <td className="px-4 py-3">
                                  <span className="text-xs bg-white/[0.04] border border-white/8 rounded-full px-2 py-0.5 text-slate-300">
                                    {SALE_TYPE_LABELS[sale.saleType]}
                                  </span>
                                  {sale.boxId && <p className="text-slate-600 text-xs mt-0.5 font-mono">{sale.boxId}</p>}
                                </td>
                                <td className="px-4 py-3 text-amber-400 font-bold">S/ {sale.price}</td>
                                <td className="px-4 py-3">
                                  {isPending ? (
                                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
                                      🕐 Pendiente
                                    </span>
                                  ) : (
                                    <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5">
                                      ✓ Confirmado
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-2 flex-wrap">
                                    {isPending && (
                                      <button
                                        onClick={() => handleConfirmSale(sale)}
                                        disabled={confirmingId === sale.id}
                                        className="text-xs text-green-400 hover:text-green-300 px-2 py-1 rounded border border-green-500/40 hover:border-green-500/70 transition disabled:opacity-50 whitespace-nowrap"
                                      >
                                        {confirmingId === sale.id ? '...' : '✓ Confirmar pago'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteSale(sale.id, sale.boxId)}
                                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/30 hover:border-red-500/60 transition"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile cards */}
                      <div className="sm:hidden divide-y divide-white/[0.03]">
                        {sales.map(sale => {
                          const isPending = (sale.status ?? 'pending') === 'pending';
                          return (
                            <div key={sale.id} className={`p-4 space-y-2 ${isPending ? 'bg-amber-500/[0.02]' : ''}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-white font-medium truncate">{sale.clientName}</p>
                                  <p className="text-slate-500 text-xs">{sale.clientDni}</p>
                                </div>
                                <p className="text-amber-400 font-bold shrink-0">S/ {sale.price}</p>
                              </div>
                              <p className="text-slate-500 text-xs truncate">{sale.clientEmail || '—'}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5 text-slate-300">
                                  {SALE_TYPE_LABELS[sale.saleType]}
                                  {sale.boxId && <span className="text-slate-600 ml-1 font-mono">{sale.boxId}</span>}
                                </span>
                                {isPending ? (
                                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">🕐 Pendiente</span>
                                ) : (
                                  <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5">✓ Confirmado</span>
                                )}
                              </div>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="text-slate-600 text-xs">{fmtDate(sale.createdAt)}</p>
                                <div className="flex gap-2">
                                  {isPending && (
                                    <button
                                      onClick={() => handleConfirmSale(sale)}
                                      disabled={confirmingId === sale.id}
                                      className="text-xs text-green-400 hover:text-green-300 px-3 py-1.5 rounded border border-green-500/40 hover:border-green-500/70 transition disabled:opacity-50"
                                    >
                                      {confirmingId === sale.id ? '...' : '✓ Confirmar'}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteSale(sale.id, sale.boxId)}
                                    className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded border border-red-500/30 hover:border-red-500/60 transition"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ════════════════ CLIENTES TAB ════════════════ */}
        {activeTab === 'clientes' && (() => {
          const TICKET_TYPE_LABEL: Record<string, string> = {
            general: 'Entrada General', vip: 'Entrada VIP',
            supervip: 'Super VIP', platinum: 'Platinum',
          };
          type ClientRow = {
            dni: string; name: string; phone: string; email: string;
            type: string; price: number; date: string; source: 'online' | 'promotor';
          };
          const rows: ClientRow[] = [
            ...onlineOrders.map(o => ({
              dni:    o.buyerDni,
              name:   o.buyerName,
              phone:  o.buyerPhone,
              email:  o.buyerEmail,
              type:   o.type === 'box' ? `Box ${o.zone}` : `Individual ${o.zone} ×${o.qty}`,
              price:  o.amount,
              date:   o.createdAt,
              source: 'online' as const,
            })),
            ...promotorSales
              .filter(s => s.status === 'confirmed')
              .map(s => ({
                dni:    s.clientDni,
                name:   s.clientName,
                phone:  '',
                email:  s.clientEmail,
                type:   SALE_TYPE_LABELS[s.saleType],
                price:  s.price,
                date:   s.confirmedAt ?? s.createdAt,
                source: 'promotor' as const,
              })),
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

          const q = clientSearch.toLowerCase();
          const filtered = q
            ? rows.filter(r =>
                r.name.toLowerCase().includes(q) ||
                r.email.toLowerCase().includes(q) ||
                r.dni.includes(q))
            : rows;

          const fmtDate = (iso: string) =>
            new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

          return (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <p className="text-white font-semibold">
                  {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} confirmados
                </p>
                <input
                  type="text" placeholder="Buscar por nombre, email o DNI…"
                  value={clientSearch} onChange={e => setClientSearch(e.target.value)}
                  className="form-input text-sm w-full sm:w-72"
                />
              </div>
              <div className="card overflow-hidden">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No hay clientes confirmados aún</div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            {['Fecha', 'DNI', 'Nombre', 'Teléfono', 'Email', 'Tipo de entrada', 'Precio', 'Origen'].map(h => (
                              <th key={h} className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((r, i) => (
                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(r.date)}</td>
                              <td className="px-4 py-3 text-slate-300 font-mono text-xs">{r.dni}</td>
                              <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{r.phone || '—'}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{r.email || '—'}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5 text-slate-300">{r.type}</span>
                              </td>
                              <td className="px-4 py-3 text-amber-400 font-bold">S/ {r.price}</td>
                              <td className="px-4 py-3">
                                {r.source === 'online'
                                  ? <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">Online</span>
                                  : <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">Promotor</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-white/[0.03]">
                      {filtered.map((r, i) => (
                        <div key={i} className="p-4 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-white font-medium truncate">{r.name}</p>
                              <p className="text-slate-500 text-xs font-mono">{r.dni}</p>
                            </div>
                            <p className="text-amber-400 font-bold shrink-0">S/ {r.price}</p>
                          </div>
                          {r.phone && <p className="text-slate-400 text-xs">{r.phone}</p>}
                          <p className="text-slate-400 text-xs truncate">{r.email || '—'}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5 text-slate-300">{r.type}</span>
                            {r.source === 'online'
                              ? <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2 py-0.5">Online</span>
                              : <span className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">Promotor</span>}
                          </div>
                          <p className="text-slate-600 text-xs">{fmtDate(r.date)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* ════════════════ DASHBOARD TAB ════════════════ */}
        {activeTab === 'dashboard' && (() => {
          const confirmedSales = promotorSales.filter(s => s.status === 'confirmed');

          // ── Revenue totals ─────────────────────────────────────
          const onlineRevenue   = onlineOrders.reduce((s, o) => s + o.amount, 0);
          const boxRevenue      = boxStats.revenue;
          const promotorRevenue = confirmedSales.reduce((s, s2) => s + s2.price, 0);
          const totalRevenue    = onlineRevenue + promotorRevenue; // boxes already counted via paidAmount in boxRevenue

          // ── Box counts per zone ────────────────────────────────
          const boxByZone = (zone: string) => boxes.filter(b => b.zone === zone);
          const boxSold   = (zone: string) => boxByZone(zone).filter(b => b.status === 'sold' || b.status === 'temp_reserved').length;
          const boxTotal  = (zone: string) => boxByZone(zone).length;

          // ── Individual counts (online + confirmed promotor) ───
          const indiv = (zone: string, type: string) => {
            const fromOnline   = onlineOrders.filter(o => o.zone === zone && o.type === type).reduce((s, o) => s + o.qty, 0);
            const fromPromotor = confirmedSales.filter(s => s.zone === zone && !IS_BOX_SALE[s.saleType]).reduce((s, s2) => s + s2.entries, 0);
            return fromOnline + fromPromotor;
          };
          const generalCount = onlineOrders.filter(o => o.zone === 'general').reduce((s, o) => s + o.qty, 0)
            + confirmedSales.filter(s => s.saleType === 'entrada_general').reduce((s, s2) => s + s2.entries, 0);

          const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

          return (
            <div className="space-y-8">
              {/* ── KPI principal ───────────────────────────────── */}
              <div className="card p-6 sm:p-8 border border-amber-500/20 bg-amber-500/[0.03]">
                <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold mb-1">Total recaudado</p>
                <p className="font-heading font-black text-4xl sm:text-5xl text-amber-400">
                  S/ {(onlineRevenue + boxRevenue + promotorRevenue).toFixed(2)}
                </p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                  <span>Online: <strong className="text-slate-300">S/ {onlineRevenue.toFixed(2)}</strong></span>
                  <span>Boxes: <strong className="text-slate-300">S/ {boxRevenue.toFixed(2)}</strong></span>
                  <span>Promotores confirmados: <strong className="text-slate-300">S/ {promotorRevenue.toFixed(2)}</strong></span>
                </div>
              </div>

              {/* ── Cards por zona — Boxes ───────────────────────── */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Boxes</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {([
                    { zone: 'platinum', label: 'Box Platinum',  total: 20, color: '#D4A017', bg: 'amber' },
                    { zone: 'vip',      label: 'Box VIP',       total: 20, color: '#a855f7', bg: 'violet' },
                    { zone: 'malecon',  label: 'Box Malecón',   total: 21, color: '#0ea5e9', bg: 'sky'    },
                  ] as const).map(({ zone, label, total, color, bg }) => {
                    const sold = boxSold(zone);
                    const pct  = Math.round((sold / total) * 100);
                    const rev  = boxes.filter(b => b.zone === zone).reduce((s, b) => s + b.buyers.reduce((a, by) => a + by.paidAmount, 0), 0);
                    return (
                      <div key={zone} className="card p-5 border" style={{ borderColor: `${color}33` }}>
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-bold text-white text-sm">{label}</p>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color, background: `${color}22` }}>
                            {sold}/{total}
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                          <span>{pct}% vendido</span>
                          <span className="text-amber-400 font-bold">S/ {rev.toFixed(0)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Cards por zona — Entradas Individuales ──────── */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Entradas Individuales</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {([
                    { zone: 'platinum', label: 'Platinum',  color: '#D4A017' },
                    { zone: 'vip',      label: 'VIP',       color: '#a855f7' },
                    { zone: 'malecon',  label: 'Malecón',   color: '#0ea5e9' },
                    { zone: 'general',  label: 'General',   color: '#22c55e' },
                  ] as const).map(({ zone, label, color }) => {
                    const count = zone === 'general' ? generalCount : indiv(zone, 'individual');
                    const rev = zone === 'general'
                      ? onlineOrders.filter(o => o.zone === 'general').reduce((s, o) => s + o.amount, 0) + confirmedSales.filter(s => s.saleType === 'entrada_general').reduce((s, s2) => s + s2.price, 0)
                      : onlineOrders.filter(o => o.zone === zone).reduce((s, o) => s + o.amount, 0) + confirmedSales.filter(s => s.zone === zone && !IS_BOX_SALE[s.saleType]).reduce((s, s2) => s + s2.price, 0);
                    return (
                      <div key={zone} className="card p-4 border" style={{ borderColor: `${color}33` }}>
                        <p className="text-xs text-slate-500 mb-1">{label}</p>
                        <p className="font-heading font-black text-2xl" style={{ color }}>{count}</p>
                        <p className="text-xs text-slate-500 mt-1">vendidas</p>
                        <p className="text-xs text-amber-400 font-bold mt-0.5">S/ {rev.toFixed(0)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Compras online recientes ─────────────────────── */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white text-sm">Compras online (MercadoPago)</p>
                    <p className="text-slate-500 text-xs mt-0.5">{onlineOrders.length} orden{onlineOrders.length !== 1 ? 'es' : ''}</p>
                  </div>
                  <button onClick={loadData} className="text-xs text-slate-500 hover:text-slate-300 transition px-2 py-1 rounded border border-white/10">🔄</button>
                </div>
                {onlineOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm">No hay compras online aún</div>
                ) : (
                  <>
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            {['Fecha', 'Cliente', 'DNI', 'Email', 'Tipo', 'Cant.', 'Monto'].map(h => (
                              <th key={h} className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {onlineOrders.map(o => (
                            <tr key={o.orderId} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                              <td className="px-4 py-3 text-white font-medium">{o.buyerName}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs font-mono">{o.buyerDni}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{o.buyerEmail}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5 text-slate-300">
                                  {o.type === 'box' ? `Box ${o.zone}` : `Individual ${o.zone}`} ×{o.qty}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-300 text-center">{o.qty}</td>
                              <td className="px-4 py-3 text-amber-400 font-bold">S/ {o.amount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="sm:hidden divide-y divide-white/[0.03]">
                      {onlineOrders.map(o => (
                        <div key={o.orderId} className="p-4 space-y-1.5">
                          <div className="flex items-start justify-between">
                            <div><p className="text-white font-medium">{o.buyerName}</p><p className="text-slate-500 text-xs font-mono">{o.buyerDni}</p></div>
                            <p className="text-amber-400 font-bold">S/ {o.amount}</p>
                          </div>
                          <p className="text-slate-400 text-xs">{o.buyerEmail}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{o.type === 'box' ? `Box ${o.zone}` : `Individual ${o.zone}`} ×{o.qty}</span>
                            <span>{fmtDate(o.createdAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ── QR Validados en Puerta ── */}
              <div className="mt-2">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-white">🔍 QR Validados en Puerta</p>
                    <p className="text-slate-500 text-xs mt-0.5">Registros en tiempo real desde Redis</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-4 py-2 text-center">
                      <p className="text-emerald-400 font-black text-2xl leading-none">{qrEntries.length}</p>
                      <p className="text-emerald-600 text-[10px] uppercase tracking-wider mt-0.5">validados</p>
                    </div>
                    <button
                      onClick={loadQREntries}
                      disabled={qrLoading}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 text-xs hover:bg-white/10 transition disabled:opacity-50"
                    >
                      {qrLoading ? '...' : '🔄'}
                    </button>
                  </div>
                </div>
                {qrEntries.length === 0 ? (
                  <div className="card p-8 text-center">
                    <p className="text-slate-600 text-sm">
                      {qrLoading ? 'Cargando...' : 'Ningún QR validado aún'}
                    </p>
                  </div>
                ) : (
                  <div className="card overflow-hidden">
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/8">
                            {['Hora', 'Nombre', 'Zona', 'Tipo', 'Pulseras', 'Orden'].map(h => (
                              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {qrEntries.map((e, i) => {
                            const zoneColors: Record<string, string> = { platinum: '#FACC15', vip: '#a855f7', malecon: '#0ea5e9', general: '#3b82f6' };
                            const zoneLabels: Record<string, string> = { platinum: 'PLATINUM', vip: 'VIP', malecon: 'MALECÓN', general: 'GENERAL' };
                            const pulseras = e.type === 'box' ? 10 : e.qty;
                            return (
                              <tr key={i} className="border-b border-white/5 hover:bg-emerald-500/[0.03]">
                                <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                                  {new Date(e.at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                  <span className="block text-slate-600">{new Date(e.at).toLocaleDateString('es-PE')}</span>
                                </td>
                                <td className="px-4 py-3 text-white font-semibold">{e.name}</td>
                                <td className="px-4 py-3">
                                  <span className="text-xs font-bold" style={{ color: zoneColors[e.zone] ?? '#94a3b8' }}>
                                    {zoneLabels[e.zone] ?? e.zone.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-400 text-xs">
                                  {e.type === 'box' ? 'Box completo' : 'Individual'}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="text-emerald-400 font-bold">{pulseras}</span>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                                  {e.orderId.slice(-10).toUpperCase()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-white/5">
                      {qrEntries.map((e, i) => {
                        const zoneColors: Record<string, string> = { platinum: '#FACC15', vip: '#a855f7', malecon: '#0ea5e9', general: '#3b82f6' };
                        const zoneLabels: Record<string, string> = { platinum: 'PLATINUM', vip: 'VIP', malecon: 'MALECÓN', general: 'GENERAL' };
                        const pulseras = e.type === 'box' ? 10 : e.qty;
                        return (
                          <div key={i} className="p-4 hover:bg-emerald-500/[0.03]">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-white font-semibold">{e.name}</p>
                              <span className="text-xs font-bold shrink-0" style={{ color: zoneColors[e.zone] ?? '#94a3b8' }}>
                                {zoneLabels[e.zone] ?? e.zone.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">
                                {new Date(e.at).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                                {' · '}{e.type === 'box' ? 'Box completo' : 'Individual'}
                                {' · '}<span className="text-emerald-400 font-bold">{pulseras} pulseras</span>
                              </span>
                              <span className="text-slate-600 font-mono">{e.orderId.slice(-8).toUpperCase()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-slate-600 text-xs pb-2">
                <p>Boxes · Promotores · Ventas → Redis (Upstash) · Validaciones QR → Redis</p>
              </div>
            </div>
          );
        })()}

      </div>
    </main>
  );
}
