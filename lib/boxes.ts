// ── Box data model and storage ──────────────────────────────
// localStorage-based persistence

export type BoxZone = 'platinum' | 'vip' | 'malecon';
export type BoxStatus = 'available' | 'temp_reserved' | 'sold';
export type PurchaseType = 'full' | 'individual';

export interface BoxBuyer {
  buyerId: string;
  name: string;
  email: string;
  phone: string;
  dni: string;
  entries: number;         // was "seats" — renamed for clarity
  purchaseType: PurchaseType;
  paidAmount: number;
  purchasedAt: string;
  promotorId?: string;     // set when sold by a promotor
}

export interface Box {
  id: string;
  zone: BoxZone;
  label: string;
  row: number;
  col: number;
  capacity: number;
  entriesAvailable: number; // was "seatsAvailable"
  status: BoxStatus;
  reservedAt?: string;
  reservedSessionId?: string;
  buyers: BoxBuyer[];
}

export interface BoxSVGPos {
  type: 'rect';
  x: number; y: number; w: number; h: number;
}

// ── Prices ───────────────────────────────────────────────────
export const BOX_PRICES: Record<BoxZone, { full: number; individual: number }> = {
  platinum: { full: 350, individual: 40 },
  vip:      { full: 250, individual: 35 },
  malecon:  { full: 250, individual: 35 },
};

export const ZONE_COLORS: Record<BoxZone, { fill: string; stroke: string; label: string }> = {
  platinum: { fill: '#78350f', stroke: '#D4A017', label: 'PLATINUM'     },
  vip:      { fill: '#3b0764', stroke: '#a855f7', label: 'VIP'           },
  malecon:  { fill: '#0c4a6e', stroke: '#0ea5e9', label: 'BOX MALECÓN'  },
};

export const STATUS_COLORS: Record<BoxStatus, { fill: string; stroke: string; text: string }> = {
  available:     { fill: '#14532d', stroke: '#22c55e', text: '#22c55e' },
  temp_reserved: { fill: '#713f12', stroke: '#f59e0b', text: '#f59e0b' },
  sold:          { fill: '#1c1c2e', stroke: '#475569', text: '#64748b' },
};

export const RESERVATION_MS = 10 * 60 * 1000; // 10 minutes

// ── SVG Layout ───────────────────────────────────────────────
// ViewBox: "0 0 620 620"
// Venue rect: x=30, y=20, w=560, h=570
//
// MALECÓN columns — visually aligned with BAÑOS / BARRA top labels:
//   Column 0 (M1–M10)  "junto a baños": x=38  (under BAÑOS rect x=30–115)
//   Column 1 (M11–M21) "junto a barra": x=120 (under BARRA rect x=115–205)
//
// PLATINUM: 5 cols × 4 rows — col x positions: [290,337,384,431,478]  (right section now x=220–590)
// VIP:      5 cols × 4 rows — same cols, offset y

const P_COL_XS = [290, 337, 384, 431, 478];
const P_BOX = { w: 42, h: 28, gap: 5 };
const M_BOX = { w: 32, h: 26, step: 29 };
const M_COL_X = [38, 120]; // column 0 = baños, column 1 = barra
const M_Y_START = 75;

export function getBoxSVGPos(box: Box): BoxSVGPos {
  if (box.zone === 'platinum') {
    return {
      type: 'rect',
      x: P_COL_XS[box.col],
      y: 92 + box.row * 33,   // header ends at y=88, boxes start at y=92
      w: P_BOX.w,
      h: P_BOX.h,
    };
  }
  if (box.zone === 'vip') {
    return {
      type: 'rect',
      x: P_COL_XS[box.col],
      y: 253 + box.row * 33,  // header ends at y=247, boxes start at y=253
      w: P_BOX.w,
      h: P_BOX.h,
    };
  }
  // malecon: col=0 → junto a baños, col=1 → junto a barra
  return {
    type: 'rect',
    x: M_COL_X[box.col],
    y: M_Y_START + box.row * M_BOX.step,
    w: M_BOX.w,
    h: M_BOX.h,
  };
}

// ── Initialize all boxes ─────────────────────────────────────
export function initBoxes(): Box[] {
  const boxes: Box[] = [];

  // PLATINUM: 5 cols × 4 rows = P01–P20
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const num = row * 5 + col + 1;
      boxes.push({
        id: `P${String(num).padStart(2, '0')}`,
        zone: 'platinum', label: `P${String(num).padStart(2, '0')}`,
        row, col, capacity: 10, entriesAvailable: 10,
        status: 'available', buyers: [],
      });
    }
  }

  // VIP: 5 cols × 4 rows = V01–V20
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const num = row * 5 + col + 1;
      boxes.push({
        id: `V${String(num).padStart(2, '0')}`,
        zone: 'vip', label: `V${String(num).padStart(2, '0')}`,
        row, col, capacity: 10, entriesAvailable: 10,
        status: 'available', buyers: [],
      });
    }
  }

  // MALECÓN Línea 1 — junto a los baños (M1–M10): col=0, rows 0–9
  for (let row = 0; row < 10; row++) {
    boxes.push({
      id: `M${row + 1}`,
      zone: 'malecon', label: `M${row + 1}`,
      row, col: 0, capacity: 10, entriesAvailable: 10,
      status: 'available', buyers: [],
    });
  }

  // MALECÓN Línea 2 — junto a la barra (M11–M21): col=1, rows 0–10
  for (let row = 0; row < 11; row++) {
    boxes.push({
      id: `M${row + 11}`,
      zone: 'malecon', label: `M${row + 11}`,
      row, col: 1, capacity: 10, entriesAvailable: 10,
      status: 'available', buyers: [],
    });
  }

  return boxes;
}

// ── Storage service ──────────────────────────────────────────
const STORAGE_KEY = 'festival-boxes-v2'; // bumped: clears old v1 data

class BoxService {
  private getSession(): string {
    if (typeof window === 'undefined') return '';
    let sid = sessionStorage.getItem('box-session');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('box-session', sid);
    }
    return sid;
  }

  getBoxes(): Box[] {
    if (typeof window === 'undefined') return initBoxes();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const boxes = initBoxes();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
      return boxes;
    }
    const boxes: Box[] = JSON.parse(raw);
    // Auto-release expired reservations
    let dirty = false;
    const now = Date.now();
    for (const box of boxes) {
      if (box.status === 'temp_reserved' && box.reservedAt) {
        if (now - new Date(box.reservedAt).getTime() > RESERVATION_MS) {
          box.status = 'available';
          box.reservedAt = undefined;
          box.reservedSessionId = undefined;
          dirty = true;
        }
      }
    }
    if (dirty) localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
    return boxes;
  }

  private save(boxes: Box[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
  }

  getBox(id: string): Box | null {
    return this.getBoxes().find(b => b.id === id) || null;
  }

  getMyReservationMs(): number {
    const sid = this.getSession();
    const reserved = this.getBoxes().find(
      b => b.status === 'temp_reserved' && b.reservedSessionId === sid
    );
    if (!reserved?.reservedAt) return 0;
    return Math.max(0, RESERVATION_MS - (Date.now() - new Date(reserved.reservedAt).getTime()));
  }

  getMyReservedBox(): Box | null {
    const sid = this.getSession();
    return this.getBoxes().find(
      b => b.status === 'temp_reserved' && b.reservedSessionId === sid
    ) || null;
  }

  reserveBox(boxId: string): boolean {
    const boxes = this.getBoxes();
    const box = boxes.find(b => b.id === boxId);
    if (!box || box.status !== 'available') return false;

    const sid = this.getSession();
    // Release any previous reservation from this session
    for (const b of boxes) {
      if (b.status === 'temp_reserved' && b.reservedSessionId === sid) {
        b.status = 'available';
        b.reservedAt = undefined;
        b.reservedSessionId = undefined;
      }
    }
    box.status = 'temp_reserved';
    box.reservedAt = new Date().toISOString();
    box.reservedSessionId = sid;
    this.save(boxes);
    return true;
  }

  releaseReservation(boxId: string): void {
    const boxes = this.getBoxes();
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    const sid = this.getSession();
    if (box.status === 'temp_reserved' && box.reservedSessionId === sid) {
      box.status = 'available';
      box.reservedAt = undefined;
      box.reservedSessionId = undefined;
      this.save(boxes);
    }
  }

  confirmPurchase(boxId: string, buyer: Omit<BoxBuyer, 'buyerId'>): boolean {
    const boxes = this.getBoxes();
    const box = boxes.find(b => b.id === boxId);
    if (!box) return false;
    const sid = this.getSession();
    if (box.status !== 'temp_reserved' || box.reservedSessionId !== sid) return false;

    const newBuyer: BoxBuyer = { ...buyer, buyerId: Math.random().toString(36).slice(2) };
    box.buyers.push(newBuyer);
    box.entriesAvailable -= buyer.entries;

    if (box.entriesAvailable <= 0 || buyer.purchaseType === 'full') {
      box.status = 'sold';
      box.entriesAvailable = 0;
    } else {
      box.status = 'available';
    }
    box.reservedAt = undefined;
    box.reservedSessionId = undefined;
    this.save(boxes);
    return true;
  }

  adminSetStatus(boxId: string, status: BoxStatus): void {
    const boxes = this.getBoxes();
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    box.status = status;
    if (status === 'available') {
      box.reservedAt = undefined;
      box.reservedSessionId = undefined;
      box.entriesAvailable = box.capacity;
      box.buyers = [];
    }
    this.save(boxes);
  }

  markBoxSoldByPromotor(
    boxId: string,
    clientName: string,
    clientDni: string,
    entries: number,
    purchaseType: PurchaseType,
    paidAmount: number,
    promotorId: string,
  ): boolean {
    const boxes = this.getBoxes();
    const box = boxes.find(b => b.id === boxId);
    if (!box || box.status === 'sold') return false;

    const buyer: BoxBuyer = {
      buyerId: Math.random().toString(36).slice(2),
      name: clientName,
      email: '',
      phone: '',
      dni: clientDni,
      entries,
      purchaseType,
      paidAmount,
      purchasedAt: new Date().toISOString(),
      promotorId,
    };
    box.buyers.push(buyer);
    box.entriesAvailable = Math.max(0, box.entriesAvailable - entries);
    box.status = 'sold';
    box.entriesAvailable = 0;
    box.reservedAt = undefined;
    box.reservedSessionId = undefined;
    this.save(boxes);
    return true;
  }

  adminReset(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initBoxes()));
  }

  getStats() {
    const boxes = this.getBoxes();
    return {
      totalBoxes: boxes.length,
      available:  boxes.filter(b => b.status === 'available').length,
      reserved:   boxes.filter(b => b.status === 'temp_reserved').length,
      sold:       boxes.filter(b => b.status === 'sold').length,
      revenue:    boxes.reduce((s, b) => s + b.buyers.reduce((a, by) => a + by.paidAmount, 0), 0),
    };
  }
}

export const boxService = new BoxService();
