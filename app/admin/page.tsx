'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { db, Ticket } from '@/lib/database';
import { boxService, ZONE_COLORS, STATUS_COLORS, type Box, type BoxStatus } from '@/lib/boxes';
import {
  promotorService,
  SALE_TYPE_LABELS,
  IS_BOX_SALE,
  type Promotor,
  type Sale,
} from '@/lib/promotors';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'tickets' | 'boxes' | 'promotores'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [boxes,   setBoxes]   = useState<Box[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0, totalTickets: 0, totalRevenue: 0, validatedOrders: 0,
  });
  const [boxStats, setBoxStats] = useState({
    totalBoxes: 0, available: 0, reserved: 0, sold: 0, revenue: 0,
  });
  const [filter, setFilter] = useState<'all' | 'general' | 'vip' | 'platino'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Promotores state
  const [promotors, setPromotors]           = useState<Promotor[]>([]);
  const [promotorSales, setPromotorSales]   = useState<Sale[]>([]);
  const [selectedPromotorId, setSelectedPromotorId] = useState<string | null>(null);
  const [editingPromotor, setEditingPromotor]     = useState<Promotor | null>(null);
  const [pForm, setPForm] = useState({ name: '', dni: '', password: '', status: 'active' as 'active' | 'inactive' });
  const [pFormError, setPFormError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setTickets(db.getTickets());
    setStats(db.getStats());
    setBoxes(boxService.getBoxes());
    setBoxStats(boxService.getStats());
    setPromotors(promotorService.getPromotors());
    setPromotorSales(promotorService.getSales());
  };

  const handleBoxStatusChange = (boxId: string, status: BoxStatus) => {
    boxService.adminSetStatus(boxId, status);
    loadData();
  };

  const handleResetBoxes = () => {
    if (confirm('¿Resetear TODOS los boxes a disponible? Esto borrará todas las ventas de boxes.')) {
      boxService.adminReset();
      loadData();
    }
  };

  // ── Promotor handlers ──────────────────────────────────────
  const handleCreatePromotor = () => {
    setPFormError('');
    if (!pForm.name || !pForm.dni || !pForm.password) { setPFormError('Completa todos los campos.'); return; }
    const exists = promotorService.getPromotors().find(p => p.dni === pForm.dni);
    if (exists && !editingPromotor) { setPFormError('Ya existe un promotor con ese DNI.'); return; }

    if (editingPromotor) {
      promotorService.updatePromotor(editingPromotor.id, pForm);
    } else {
      promotorService.createPromotor(pForm);
    }
    setPForm({ name: '', dni: '', password: '', status: 'active' });
    setEditingPromotor(null);
    loadData();
  };

  const handleEditPromotor = (p: Promotor) => {
    setEditingPromotor(p);
    setPForm({ name: p.name, dni: p.dni, password: p.password, status: p.status });
  };

  const handleDeletePromotor = (id: string) => {
    if (!confirm('¿Eliminar este promotor y todas sus ventas?')) return;
    promotorService.deletePromotor(id);
    if (selectedPromotorId === id) setSelectedPromotorId(null);
    loadData();
  };

  const handleDeleteSale = (saleId: string, boxId?: string) => {
    if (!confirm('¿Eliminar esta venta?')) return;
    if (boxId) boxService.adminSetStatus(boxId, 'available');
    promotorService.deleteSale(saleId);
    loadData();
  };

  const handleClearDatabase = () => {
    if (confirm('¿Estás seguro de que quieres borrar TODOS los tickets? Esta acción no se puede deshacer.')) {
      db.clearAll();
      loadData();
      alert('Base de datos limpiada');
    }
  };

  // Filtrar tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.ticketType === filter;
    const matchesSearch =
      ticket.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.buyerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.buyerDNI.includes(searchTerm) ||
      ticket.id.includes(searchTerm);

    return matchesFilter && matchesSearch;
  });

  // Calcular estadísticas por tipo
  const statsByType = {
    general: {
      count: tickets.filter(t => t.ticketType === 'general').reduce((sum, t) => sum + t.quantity, 0),
      revenue: tickets.filter(t => t.ticketType === 'general').reduce((sum, t) => sum + t.totalPrice, 0),
    },
    vip: {
      count: tickets.filter(t => t.ticketType === 'vip').reduce((sum, t) => sum + t.quantity, 0),
      revenue: tickets.filter(t => t.ticketType === 'vip').reduce((sum, t) => sum + t.totalPrice, 0),
    },
    platino: {
      count: tickets.filter(t => (t.ticketType as string) === 'platino').reduce((sum, t) => sum + t.quantity, 0),
      revenue: tickets.filter(t => (t.ticketType as string) === 'platino').reduce((sum, t) => sum + t.totalPrice, 0),
    },
  };

  return (
    <main className="min-h-screen py-20 bg-[#09090F]">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="font-heading font-black text-3xl text-white mb-1">Panel de Administración</h1>
              <p className="text-slate-400 text-sm">Festival Cubanada Chancay 2026</p>
            </div>
            <div className="flex gap-3">
              <button onClick={loadData} className="btn-secondary text-sm px-4 py-2">🔄 Actualizar</button>
              <Link href="/mapa" className="btn-secondary text-sm px-4 py-2">Ver Mapa</Link>
              <Link href="/" className="btn-primary text-sm px-4 py-2">Ver Sitio</Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-white/8 pb-0">
            {([
              { id: 'tickets',    label: '🎫 Entradas Generales' },
              { id: 'boxes',      label: '📦 Gestión de Boxes' },
              { id: 'promotores', label: '👥 Promotores' },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition ${
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

            <div className="card p-5 mb-6 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Ingresos por Boxes</p>
                <p className="text-amber-400 font-heading font-black text-2xl">S/ {boxStats.revenue.toFixed(2)}</p>
              </div>
              <button
                onClick={handleResetBoxes}
                className="px-4 py-2 bg-red-500/15 border border-red-500/40 text-red-400 rounded-lg text-sm hover:bg-red-500/25 transition"
              >
                🔄 Resetear todos los boxes
              </button>
            </div>

            {/* Box table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
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
                <div className="overflow-x-auto">
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
                          const ra = promotorService.getStats(a.id).totalRevenue;
                          const rb = promotorService.getStats(b.id).totalRevenue;
                          return rb - ra;
                        })
                        .map(p => {
                          const st = promotorService.getStats(p.id);
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
                                  <button onClick={() => { promotorService.updatePromotor(p.id, { status: p.status === 'active' ? 'inactive' : 'active' }); loadData(); }}
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/5">
                            {['Fecha', 'Cliente', 'DNI', 'Tipo', 'Box', 'Monto', 'Notas', 'Acción'].map(h => (
                              <th key={h} className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sales.map(sale => (
                            <tr key={sale.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                              <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDate(sale.createdAt)}</td>
                              <td className="px-4 py-3 text-white font-medium">{sale.clientName}</td>
                              <td className="px-4 py-3 text-slate-400 text-xs">{sale.clientDni}</td>
                              <td className="px-4 py-3">
                                <span className="text-xs bg-white/[0.04] border border-white/8 rounded-full px-2 py-0.5 text-slate-300">
                                  {SALE_TYPE_LABELS[sale.saleType]}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-400 text-xs font-mono">{sale.boxId || '—'}</td>
                              <td className="px-4 py-3 text-amber-400 font-bold">S/ {sale.price}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs max-w-[120px] truncate">{sale.notes || '—'}</td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleDeleteSale(sale.id, sale.boxId)}
                                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-500/30 hover:border-red-500/60 transition"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ════════════════ TICKETS TAB ════════════════ */}
        {activeTab === 'tickets' && <>

        {/* Estadísticas principales */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="glass-card p-6 text-center neon-border">
            <div className="text-4xl mb-2">📦</div>
            <div className="text-3xl font-bold text-tropical-coral mb-1">{stats.totalOrders}</div>
            <div className="text-gray-400 text-sm">Órdenes Totales</div>
          </div>

          <div className="glass-card p-6 text-center neon-border">
            <div className="text-4xl mb-2">🎫</div>
            <div className="text-3xl font-bold text-tropical-teal mb-1">{stats.totalTickets}</div>
            <div className="text-gray-400 text-sm">Entradas Vendidas</div>
          </div>

          <div className="glass-card p-6 text-center neon-border">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-3xl font-bold text-tropical-sunset mb-1">S/ {stats.totalRevenue.toFixed(2)}</div>
            <div className="text-gray-400 text-sm">Ingresos Totales</div>
          </div>

          <div className="glass-card p-6 text-center neon-border">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-3xl font-bold text-tropical-palm mb-1">{stats.validatedOrders}</div>
            <div className="text-gray-400 text-sm">Órdenes Validadas</div>
          </div>
        </div>

        {/* Estadísticas por tipo */}
        <div className="glass-card p-8 mb-12">
          <h2 className="text-2xl font-bold text-tropical-sunset mb-6">📊 Ventas por Tipo de Entrada</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-tropical-night/50 p-6 rounded-lg border border-tropical-palm">
              <h3 className="text-xl font-bold text-tropical-palm mb-4">GENERAL</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Entradas:</span>
                  <span className="font-bold">{statsByType.general.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ingresos:</span>
                  <span className="font-bold text-tropical-sunset">S/ {statsByType.general.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Porcentaje:</span>
                  <span className="font-bold">
                    {stats.totalTickets > 0 ? ((statsByType.general.count / stats.totalTickets) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-tropical-night/50 p-6 rounded-lg border border-tropical-coral">
              <h3 className="text-xl font-bold text-tropical-coral mb-4">VIP</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Entradas:</span>
                  <span className="font-bold">{statsByType.vip.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ingresos:</span>
                  <span className="font-bold text-tropical-sunset">S/ {statsByType.vip.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Porcentaje:</span>
                  <span className="font-bold">
                    {stats.totalTickets > 0 ? ((statsByType.vip.count / stats.totalTickets) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-tropical-night/50 p-6 rounded-lg border border-tropical-sunset">
              <h3 className="text-xl font-bold text-tropical-sunset mb-4">PLATINO</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Entradas:</span>
                  <span className="font-bold">{statsByType.platino.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Ingresos:</span>
                  <span className="font-bold text-tropical-sunset">S/ {statsByType.platino.revenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Porcentaje:</span>
                  <span className="font-bold">
                    {stats.totalTickets > 0 ? ((statsByType.platino.count / stats.totalTickets) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="glass-card p-6 mb-8">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-tropical-teal">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, email, DNI, ID de orden..."
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-gray-600 focus:border-tropical-teal focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-tropical-teal">
                Filtrar por tipo
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-gray-600 focus:border-tropical-teal focus:outline-none"
              >
                <option value="all">Todos</option>
                <option value="general">General</option>
                <option value="vip">VIP</option>
                <option value="platino">Platino</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de tickets */}
        <div className="glass-card p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-tropical-coral">
              🎫 Todas las Órdenes ({filteredTickets.length})
            </h2>
            <button
              onClick={handleClearDatabase}
              className="px-4 py-2 bg-red-500/20 border border-red-500 rounded-lg hover:bg-red-500/30 transition text-sm"
            >
              🗑️ Limpiar DB
            </button>
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">📭</div>
              <p>No hay órdenes {searchTerm && 'que coincidan con la búsqueda'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left p-3 text-tropical-sunset">Orden</th>
                    <th className="text-left p-3 text-tropical-sunset">Comprador</th>
                    <th className="text-left p-3 text-tropical-sunset">DNI</th>
                    <th className="text-left p-3 text-tropical-sunset">Tipo</th>
                    <th className="text-center p-3 text-tropical-sunset">Cant.</th>
                    <th className="text-right p-3 text-tropical-sunset">Total</th>
                    <th className="text-center p-3 text-tropical-sunset">Estado</th>
                    <th className="text-center p-3 text-tropical-sunset">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-gray-700/50 hover:bg-white/5">
                      <td className="p-3">
                        <div className="font-mono text-xs text-tropical-teal">
                          #{ticket.id.substring(0, 8)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(ticket.purchaseDate).toLocaleDateString('es-PE')}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{ticket.buyerName}</div>
                        <div className="text-xs text-gray-400">{ticket.buyerEmail}</div>
                      </td>
                      <td className="p-3 text-sm">{ticket.buyerDNI}</td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          ticket.ticketType === 'general' ? 'bg-tropical-palm/20 text-tropical-palm' :
                          ticket.ticketType === 'vip' ? 'bg-tropical-coral/20 text-tropical-coral' :
                          'bg-tropical-sunset/20 text-tropical-sunset'
                        }`}>
                          {ticket.ticketType}
                        </span>
                      </td>
                      <td className="p-3 text-center font-bold">{ticket.quantity}</td>
                      <td className="p-3 text-right font-bold text-tropical-sunset">
                        S/ {ticket.totalPrice.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-xs font-semibold ${
                          ticket.validated ? 'text-tropical-palm' : 'text-gray-500'
                        }`}>
                          {ticket.validated ? '✓ Validada' : '○ Pendiente'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Link
                          href={`/ticket/${ticket.id}`}
                          className="text-tropical-teal hover:underline text-sm"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-slate-600 text-xs">
          <p>💾 Los datos se almacenan localmente en localStorage del navegador</p>
          <p className="mt-1">🔧 En producción, usar base de datos real (PostgreSQL, MySQL, MongoDB, etc.)</p>
        </div>

        </> }
      </div>
    </main>
  );
}
