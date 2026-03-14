'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SALE_TYPE_LABELS,
  IS_BOX_SALE,
  type Promotor,
  type Sale,
  type SaleType,
} from '@/lib/promotors';
import {
  getBoxSVGPos,
  ZONE_COLORS,
  STATUS_COLORS,
  BOX_PRICES,
  type Box,
  type BoxStatus,
  type BoxZone,
} from '@/lib/boxes';

// ── Icons ─────────────────────────────────────────────────────
function IconLock()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function IconUser()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>; }
function IconLogout()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function IconCheck()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>; }
function IconList()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function IconBoxes()   { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>; }
function IconBack()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>; }

// ── Venue Map SVG ─────────────────────────────────────────────
function PromotorVenueMap({
  boxes, currentPromotorId, onBoxClick, selectedBoxId, selectingMode = false,
}: {
  boxes: Box[]; currentPromotorId: string;
  onBoxClick: (box: Box) => void; selectedBoxId?: string | null; selectingMode?: boolean;
}) {
  return (
    <svg viewBox="0 0 620 620" className="w-full h-auto" style={{ maxHeight: 560 }}>
      <rect x="30" y="20" width="560" height="570" rx="8" fill="#0d0d1a" stroke="#1e293b" strokeWidth="1.5" />
      <rect x="30"  y="20" width="90"  height="50" rx="3" fill="#111827" stroke="#1e293b" strokeWidth="1" />
      <text x="75"  y="50" textAnchor="middle" fontSize="9" fill="#475569" fontWeight="600" letterSpacing="1">BARRA</text>
      <rect x="115" y="20" width="105" height="50" rx="3" fill="#111827" stroke="#1e293b" strokeWidth="1" />
      <text x="168" y="50" textAnchor="middle" fontSize="9" fill="#475569" fontWeight="600" letterSpacing="1">BAÑOS</text>
      <rect x="220" y="20" width="370" height="50" rx="4" fill="#1a1209" stroke="#D4A017" strokeWidth="1.5" />
      <text x="405" y="50" textAnchor="middle" fontSize="13" fill="#D4A017" fontWeight="700" letterSpacing="2">ESCENARIO</text>
      <line x1="220" y1="70"  x2="220" y2="395" stroke="#334155" strokeDasharray="4 3" strokeWidth="1" />
      <line x1="220" y1="226" x2="590" y2="226" stroke="#334155" strokeDasharray="4 3" strokeWidth="1" />
      <rect x="220" y="70" width="370" height="18" rx="2" fill="#1a1209" />
      <text x="405" y="83" textAnchor="middle" fontSize="9" fill="#D4A017" fontWeight="700" letterSpacing="2">PLATINUM</text>
      <rect x="220" y="233" width="370" height="14" rx="2" fill="#0f0520" />
      <text x="405" y="244" textAnchor="middle" fontSize="8" fill="#a855f7" fontWeight="700" letterSpacing="2">VIP</text>
      <rect x="30" y="395" width="560" height="160" rx="4" fill="#0a0f1e" stroke="#1e3a5f" strokeWidth="1" />
      <text x="310" y="480" textAnchor="middle" fontSize="18" fill="#1e3a5f" fontWeight="800" letterSpacing="4">GENERAL</text>
      <rect x="250" y="565" width="120" height="20" rx="3" fill="#111827" stroke="#1e293b" strokeWidth="1" />
      <text x="310" y="579" textAnchor="middle" fontSize="8" fill="#475569" fontWeight="600" letterSpacing="1">ENTRADA</text>
      <text transform="rotate(-90, 203, 232)" textAnchor="middle" fontSize="8" fill="#0ea5e9" fontWeight="700" letterSpacing="1.5">BOX MALECÓN</text>
      {boxes.map(box => {
        const pos        = getBoxSVGPos(box);
        const isSelected = selectedBoxId === box.id;
        const isMyBox    = box.buyers.some(b => b.promotorId === currentPromotorId);
        const isClickable = selectingMode ? box.status === 'available' : true;
        const sc = STATUS_COLORS[box.status];
        const fill   = isSelected ? '#D4A017' : sc.fill;
        const stroke = isSelected ? '#facc15' : isMyBox && box.status === 'sold' ? '#22d3ee' : sc.stroke;
        const opacity = selectingMode && box.status !== 'available' ? 0.35 : 1;
        return (
          <g key={box.id} onClick={() => isClickable && onBoxClick(box)} style={{ cursor: isClickable ? 'pointer' : 'default' }}>
            <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx="3"
              fill={fill} stroke={stroke} strokeWidth={isSelected ? 2 : 1.5} opacity={opacity} />
            <text x={pos.x + pos.w / 2} y={pos.y + pos.h / 2 + 3.5}
              textAnchor="middle" fontSize="7" fill={isSelected ? '#000' : sc.text} fontWeight="700">
              {box.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Panel mode types ──────────────────────────────────────────
type PanelMode = 'idle' | 'selecting_box' | 'box_form' | 'individual_form' | 'general_form' | 'success';

// ── Right panel — sale registration ──────────────────────────
function SalePanel({
  promotor, boxes, mode, selectedBox, onModeChange, onBoxSelected, onSaleComplete,
}: {
  promotor: Promotor; boxes: Box[]; mode: PanelMode; selectedBox: Box | null;
  onModeChange: (m: PanelMode) => void; onBoxSelected: (box: Box | null) => void; onSaleComplete: () => void;
}) {
  const [clientDni,   setClientDni]   = useState('');
  const [clientName,  setClientName]  = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [entries,     setEntries]     = useState(1);
  const [zone,        setZone]        = useState<BoxZone | 'general'>('platinum');
  const [notes,       setNotes]       = useState('');
  const [error,       setError]       = useState('');

  // Computed price — never editable
  const unitPrice = mode === 'box_form' && selectedBox
    ? BOX_PRICES[selectedBox.zone].full
    : mode === 'individual_form'
      ? (BOX_PRICES[zone as BoxZone]?.individual ?? 0)
      : 0;
  const price = mode === 'individual_form' ? unitPrice * entries : unitPrice;

  const resetForm = () => {
    setClientDni(''); setClientName(''); setClientEmail('');
    setEntries(1); setZone('platinum'); setNotes(''); setError('');
  };

  const handleReset = () => { resetForm(); onBoxSelected(null); onModeChange('idle'); };

  const handleConfirm = async () => {
    setError('');
    if (!clientDni || !clientName) { setError('Ingresa DNI y nombre del cliente.'); return; }
    if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      setError('Ingresa un email válido del cliente.'); return;
    }

    const baseSale = {
      promotorId: promotor.id,
      clientDni, clientName, clientEmail,
      entries, price, notes: notes || undefined,
      status: 'pending' as const,
    };

    if (mode === 'box_form') {
      if (!selectedBox) { setError('No hay box seleccionado.'); return; }
      const boxRes = await fetch('/api/boxes/promotor-sell', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxId: selectedBox.id,
          buyer: { name: clientName, dni: clientDni, entries: 10, paidAmount: price },
        }),
      });
      if (!(await boxRes.json()).ok) { setError('Este box ya no está disponible.'); return; }

      const saleRes = await fetch('/api/promotor/sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...baseSale,
          saleType: `box_${selectedBox.zone}` as SaleType,
          zone: selectedBox.zone, boxId: selectedBox.id, entries: 10,
        }),
      });
      if (!(await saleRes.json()).ok) { setError('Error al registrar la venta.'); return; }

    } else if (mode === 'individual_form') {
      const saleRes = await fetch('/api/promotor/sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...baseSale,
          saleType: `individual_${zone}` as SaleType,
          zone: zone as BoxZone,
        }),
      });
      if (!(await saleRes.json()).ok) { setError('Error al registrar la venta.'); return; }

    } else if (mode === 'general_form') {
      const saleRes = await fetch('/api/promotor/sales', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...baseSale, saleType: 'entrada_general' as SaleType, zone: 'general' }),
      });
      if (!(await saleRes.json()).ok) { setError('Error al registrar la venta.'); return; }
    }

    resetForm(); onBoxSelected(null); onModeChange('success'); onSaleComplete();
    setTimeout(() => onModeChange('idle'), 2500);
  };

  // ── IDLE
  if (mode === 'idle') {
    return (
      <div className="flex flex-col gap-3 py-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Registrar venta</p>
        <button onClick={() => onModeChange('selecting_box')}
          className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-amber-500/10 hover:border-amber-500/30 transition group">
          <p className="font-bold text-white group-hover:text-amber-400 transition text-sm">📦 Venta de Box</p>
          <p className="text-xs text-slate-500 mt-0.5">Selecciona un box en el mapa</p>
        </button>
        <button onClick={() => { resetForm(); setZone('platinum'); onModeChange('individual_form'); }}
          className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-violet-500/10 hover:border-violet-500/30 transition group">
          <p className="font-bold text-white group-hover:text-violet-400 transition text-sm">🎟 Entrada Individual</p>
          <p className="text-xs text-slate-500 mt-0.5">Platinum · VIP · Malecón</p>
        </button>
        <button onClick={() => { resetForm(); setZone('general'); onModeChange('general_form'); }}
          className="w-full text-left p-4 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-blue-500/10 hover:border-blue-500/30 transition group">
          <p className="font-bold text-white group-hover:text-blue-400 transition text-sm">🎫 Entrada General</p>
          <p className="text-xs text-slate-500 mt-0.5">Acceso zona general · precio libre</p>
        </button>
      </div>
    );
  }

  // ── SELECTING BOX
  if (mode === 'selecting_box') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl">👆</div>
        <div>
          <p className="font-bold text-white text-sm">Haz click en un box disponible</p>
          <p className="text-xs text-slate-500 mt-1">Solo los boxes verdes son seleccionables</p>
        </div>
        <button onClick={handleReset} className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 transition mt-2">
          <IconBack /> Cancelar
        </button>
      </div>
    );
  }

  // ── SUCCESS
  if (mode === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <IconCheck />
        </div>
        <p className="font-bold text-amber-400 text-sm">¡Venta registrada!</p>
        <p className="text-xs text-slate-400">Estado: <span className="text-amber-400 font-semibold">Pendiente de pago</span></p>
        <p className="text-xs text-slate-500 max-w-[200px]">El admin confirmará el pago y enviará el ticket por email al cliente</p>
      </div>
    );
  }

  // ── BOX / INDIVIDUAL / GENERAL FORM
  const isBoxMode    = mode === 'box_form';
  const isIndividual = mode === 'individual_form';

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={handleReset} className="text-slate-500 hover:text-slate-300 transition"><IconBack /></button>
        <p className="font-bold text-white text-sm">
          {isBoxMode ? `Box ${selectedBox?.label} · ${ZONE_COLORS[selectedBox?.zone ?? 'platinum'].label}`
            : isIndividual ? 'Entrada Individual' : 'Entrada General'}
        </p>
      </div>

      <div className="space-y-3">
        {isBoxMode && selectedBox && (
          <div className="rounded-xl p-3 border" style={{
            background: `${ZONE_COLORS[selectedBox.zone].stroke}11`,
            borderColor: `${ZONE_COLORS[selectedBox.zone].stroke}44`,
          }}>
            <div className="flex justify-between"><span className="text-xs text-slate-400">Box</span><span className="font-bold text-white text-xs">{selectedBox.label}</span></div>
            <div className="flex justify-between mt-1"><span className="text-xs text-slate-400">Zona</span>
              <span className="text-xs font-bold" style={{ color: ZONE_COLORS[selectedBox.zone].stroke }}>{ZONE_COLORS[selectedBox.zone].label}</span></div>
            <div className="flex justify-between mt-1"><span className="text-xs text-slate-400">Capacidad</span><span className="text-xs text-slate-300">10 personas</span></div>
          </div>
        )}

        {!isBoxMode && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Zona</label>
            <select value={zone} onChange={e => setZone(e.target.value as BoxZone | 'general')} className="form-input w-full text-sm">
              {isIndividual ? (
                <>
                  <option value="platinum">Platinum — S/ {BOX_PRICES.platinum.individual}</option>
                  <option value="vip">VIP — S/ {BOX_PRICES.vip.individual}</option>
                  <option value="malecon">Malecón — S/ {BOX_PRICES.malecon.individual}</option>
                </>
              ) : <option value="general">General</option>}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">DNI cliente</label>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={clientDni}
            onChange={e => setClientDni(e.target.value.replace(/\D/g, ''))} placeholder="12345678" className="form-input w-full text-sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nombre cliente</label>
          <input type="text" value={clientName} onChange={e => setClientName(e.target.value)}
            placeholder="Nombre completo" className="form-input w-full text-sm" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Email cliente <span className="text-amber-500 normal-case font-normal">(para enviarle el ticket)</span>
          </label>
          <input type="email" inputMode="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)}
            placeholder="correo@ejemplo.com" className="form-input w-full text-sm" />
        </div>

        {!isBoxMode && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cantidad</label>
            <input type="number" min={1} inputMode="numeric" value={entries}
              onChange={e => setEntries(Math.max(1, parseInt(e.target.value) || 1))} className="form-input w-full text-sm" />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Precio total (S/)
          </label>
          <div className="form-input w-full text-sm bg-white/[0.02] cursor-default select-none flex items-center justify-between">
            <span className="text-amber-400 font-bold">S/ {price.toFixed(2)}</span>
            {isIndividual && entries > 1 && (
              <span className="text-slate-500 text-xs">S/ {unitPrice} × {entries}</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Observaciones</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder="Opcional..." className="form-input w-full text-sm resize-none" />
        </div>

        {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
      </div>

      <button onClick={handleConfirm} className="btn-primary w-full py-3 mt-4 text-sm">
        Confirmar venta
      </button>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="font-heading font-black text-white text-xl">{value}</p>
    </div>
  );
}

// ── Promotor Panel ────────────────────────────────────────────
function PromotorPanel({ promotor, onLogout }: { promotor: Promotor; onLogout: () => void }) {
  const [tab, setTab] = useState<'boxes' | 'ventas'>('boxes');
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [panelMode,   setPanelMode]   = useState<PanelMode>('idle');
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [infoBox,     setInfoBox]     = useState<Box | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [salesRes, boxesRes] = await Promise.all([
        fetch('/api/promotor/sales').then(r => r.json()),
        fetch('/api/boxes').then(r => r.json()),
      ]);
      if (salesRes.ok && salesRes.sales) setSales(salesRes.sales);
      if (boxesRes.ok && boxesRes.boxes) setBoxes(boxesRes.boxes);
    } catch { /* keep current state */ }
  }, []);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 5000);
    return () => clearInterval(id);
  }, [loadData]);

  const stats = {
    totalSales:   sales.length,
    totalBoxes:   sales.filter(s => IS_BOX_SALE[s.saleType]).length,
    totalEntries: sales.filter(s => !IS_BOX_SALE[s.saleType]).reduce((a, s) => a + s.entries, 0),
    totalRevenue: sales.reduce((a, s) => a + s.price, 0),
  };

  const handleBoxClick = (box: Box) => {
    if (panelMode === 'selecting_box') {
      if (box.status !== 'available') return;
      setSelectedBox(box); setInfoBox(null); setPanelMode('box_form'); return;
    }
    setInfoBox(prev => prev?.id === box.id ? null : box);
  };

  const selectingMode = panelMode === 'selecting_box' || panelMode === 'box_form';
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

  const tabs = [
    { id: 'boxes',  label: 'Boxes y Ventas', icon: <IconBoxes /> },
    { id: 'ventas', label: 'Mis Ventas',      icon: <IconList /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[#09090F] flex flex-col">
      <header className="bg-[#09090F]/90 border-b border-white/5 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          {/* Main row */}
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
                <IconUser />
              </div>
              <div className="min-w-0">
                <p className="font-heading font-bold text-white text-sm leading-none truncate">{promotor.name}</p>
                <p className="text-slate-600 text-xs mt-0.5 hidden sm:block">Promotor · DNI {promotor.dni}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Desktop tabs */}
              <div className="hidden md:flex items-center gap-4">
                {tabs.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 text-sm font-semibold transition pb-0.5
                      ${tab === t.id ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-500 hover:text-slate-300 border-b-2 border-transparent'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
                <div className="h-4 w-px bg-white/10" />
              </div>
              <button onClick={onLogout} className="flex items-center gap-1.5 text-slate-500 hover:text-white transition text-sm">
                <IconLogout /> <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
          {/* Mobile tabs row */}
          <div className="md:hidden flex border-t border-white/5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 border-b-2 transition
                  ${tab === t.id ? 'text-amber-400 border-amber-400' : 'text-slate-500 border-transparent'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {tab === 'boxes' && (
        <div className="flex flex-col md:flex-row md:flex-1 md:overflow-hidden md:h-[calc(100vh-56px)]">
          <div className="flex-1 min-w-0 md:overflow-y-auto p-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-4 justify-center">
              {(Object.entries(STATUS_COLORS) as [BoxStatus, typeof STATUS_COLORS[BoxStatus]][]).map(([s, c]) => (
                <div key={s} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm border" style={{ background: c.fill, borderColor: c.stroke }} />
                  <span className="text-xs text-slate-400">
                    {s === 'available' ? 'Disponible' : s === 'temp_reserved' ? 'Reservado' : 'Vendido'}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm border" style={{ background: '#164e63', borderColor: '#22d3ee' }} />
                <span className="text-xs text-cyan-400">Vendido por mí</span>
              </div>
            </div>
            <div className="card p-3 sm:p-4">
              <PromotorVenueMap boxes={boxes} currentPromotorId={promotor.id}
                onBoxClick={handleBoxClick} selectedBoxId={selectedBox?.id} selectingMode={selectingMode} />
            </div>
            {infoBox && panelMode === 'idle' && (
              <div className="card p-4 flex items-start justify-between gap-4">
                <div className="flex gap-4 flex-wrap">
                  <div><p className="text-xs text-slate-500 mb-0.5">Box</p><p className="font-bold text-white text-sm">{infoBox.label}</p></div>
                  <div><p className="text-xs text-slate-500 mb-0.5">Zona</p>
                    <p className="text-sm font-bold" style={{ color: ZONE_COLORS[infoBox.zone].stroke }}>{ZONE_COLORS[infoBox.zone].label}</p></div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Estado</p>
                    {infoBox.status === 'available' && <p className="text-green-400 text-sm font-bold">Disponible</p>}
                    {infoBox.status === 'temp_reserved' && <p className="text-amber-400 text-sm font-bold">Reservado</p>}
                    {infoBox.status === 'sold' && (() => {
                      const isMyBox = infoBox.buyers.some(b => b.promotorId === promotor.id);
                      if (isMyBox) {
                        const buyer = infoBox.buyers.find(b => b.promotorId === promotor.id);
                        return <div><p className="text-cyan-400 text-sm font-bold">Vendido por mí</p>
                          <p className="text-white text-xs">{buyer?.name} · S/ {buyer?.paidAmount}</p></div>;
                      }
                      return <p className="text-slate-400 text-sm font-bold">Ocupado</p>;
                    })()}
                  </div>
                </div>
                <button onClick={() => setInfoBox(null)} className="text-slate-600 hover:text-slate-400 text-lg leading-none shrink-0">×</button>
              </div>
            )}
          </div>
          <div className="md:shrink-0 border-t md:border-t-0 md:border-l border-white/5 bg-white/[0.015] flex flex-col md:overflow-y-auto md:w-80 p-5">
            <SalePanel promotor={promotor} boxes={boxes} mode={panelMode} selectedBox={selectedBox}
              onModeChange={setPanelMode}
              onBoxSelected={(box) => { setSelectedBox(box); if (!box) setInfoBox(null); }}
              onSaleComplete={loadData} />
          </div>
        </div>
      )}

      {tab === 'ventas' && (
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total ventas"      value={stats.totalSales} />
            <StatCard label="Boxes vendidos"    value={stats.totalBoxes} />
            <StatCard label="Entradas vendidas" value={stats.totalEntries} />
            <StatCard label="Monto total"       value={`S/ ${stats.totalRevenue}`} />
          </div>
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <p className="font-semibold text-white text-sm">Historial de ventas</p>
            </div>
            {sales.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">No tienes ventas registradas aún</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/5">
                        {['Fecha', 'Cliente', 'Email', 'Tipo', 'Monto', 'Estado'].map(h => (
                          <th key={h} className="text-left text-xs text-slate-500 font-semibold uppercase tracking-wider px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map(sale => (
                        <tr key={sale.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
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
                            {(sale.status ?? 'pending') === 'confirmed' ? (
                              <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5">✓ Confirmado</span>
                            ) : (
                              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">Pendiente</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="sm:hidden divide-y divide-white/5">
                  {sales.map(sale => (
                    <div key={sale.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-white font-medium text-sm truncate">{sale.clientName}</p>
                          <p className="text-slate-500 text-xs">{sale.clientDni}</p>
                        </div>
                        <p className="text-amber-400 font-bold shrink-0">S/ {sale.price}</p>
                      </div>
                      <p className="text-slate-500 text-xs truncate">{sale.clientEmail || '—'}</p>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5 text-slate-300">
                          {SALE_TYPE_LABELS[sale.saleType]}{sale.boxId && <span className="text-slate-600 ml-1 font-mono">{sale.boxId}</span>}
                        </span>
                        {(sale.status ?? 'pending') === 'confirmed' ? (
                          <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 rounded-full px-2 py-0.5">✓ Confirmado</span>
                        ) : (
                          <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">Pendiente</span>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs">{fmtDate(sale.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Login Form ────────────────────────────────────────────────
function LoginForm({ onLogin }: { onLogin: (p: Promotor) => void }) {
  const [dni,      setDni]      = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/promotor/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dni: dni.trim(), password: password.trim() }),
      });
      const data = await res.json() as { ok: boolean; promotor?: Promotor; error?: string };
      if (data.ok && data.promotor) {
        onLogin(data.promotor);
      } else {
        setError(data.error ?? 'DNI o contraseña incorrectos, o cuenta inactiva.');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#09090F]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <IconLock />
          </div>
          <h1 className="font-heading font-bold text-white text-2xl">Portal Promotores</h1>
          <p className="text-slate-400 text-sm mt-1">Festival de Salsa y Timba · Chancay 2026</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">DNI</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={dni}
                onChange={e => setDni(e.target.value)}
                placeholder="Tu número de DNI"
                required
                className="form-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
              <input
                type="password"
                inputMode="numeric"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••"
                required
                className="form-input w-full"
              />
            </div>
            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 disabled:opacity-50">
              {loading ? 'Verificando...' : 'Ingresar'}
            </button>
          </form>
        </div>
        <p className="text-center text-slate-600 text-xs mt-6">Acceso exclusivo para promotores autorizados</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PromotorPage() {
  const [promotor, setPromotor] = useState<Promotor | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/promotor/auth')
      .then(r => r.json())
      .then((data: { ok: boolean; promotor?: Promotor }) => {
        if (data.ok && data.promotor) setPromotor(data.promotor);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#09090F] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!promotor) return <LoginForm onLogin={setPromotor} />;

  return (
    <PromotorPanel
      promotor={promotor}
      onLogout={async () => {
        await fetch('/api/promotor/auth', { method: 'DELETE' });
        setPromotor(null);
      }}
    />
  );
}
