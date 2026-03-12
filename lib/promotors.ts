// ── Promotor system ──────────────────────────────────────────
// localStorage-based persistence

export type SaleType =
  | 'box_platinum'
  | 'box_vip'
  | 'box_malecon'
  | 'individual_platinum'
  | 'individual_vip'
  | 'individual_malecon'
  | 'entrada_general';

export interface Promotor {
  id: string;
  dni: string;
  name: string;
  password: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Sale {
  id: string;
  promotorId: string;
  clientDni: string;
  clientName: string;
  saleType: SaleType;
  zone: 'platinum' | 'vip' | 'malecon' | 'general';
  boxId?: string;
  entries: number;
  price: number;
  notes?: string;
  createdAt: string;
}

export const SALE_TYPE_LABELS: Record<SaleType, string> = {
  box_platinum:       'Box Platinum',
  box_vip:            'Box VIP',
  box_malecon:        'Box Malecón',
  individual_platinum:'Entrada individual Platinum',
  individual_vip:     'Entrada individual VIP',
  individual_malecon: 'Entrada individual Malecón',
  entrada_general:    'Entrada General',
};

export const SALE_TYPE_PRICES: Record<SaleType, number | null> = {
  box_platinum:       350,
  box_vip:            250,
  box_malecon:        250,
  individual_platinum: 45,
  individual_vip:      35,
  individual_malecon:  35,
  entrada_general:     null, // precio libre
};

export const SALE_TYPE_ZONE: Record<SaleType, Sale['zone']> = {
  box_platinum:       'platinum',
  box_vip:            'vip',
  box_malecon:        'malecon',
  individual_platinum:'platinum',
  individual_vip:     'vip',
  individual_malecon: 'malecon',
  entrada_general:    'general',
};

export const IS_BOX_SALE: Record<SaleType, boolean> = {
  box_platinum:       true,
  box_vip:            true,
  box_malecon:        true,
  individual_platinum:false,
  individual_vip:     false,
  individual_malecon: false,
  entrada_general:    false,
};

// ── Storage keys ─────────────────────────────────────────────
const PROMOTORS_KEY = 'festival-promotors-v1';
const SALES_KEY     = 'festival-sales-v1';
const SESSION_KEY   = 'promotor-session';

// ── Service ──────────────────────────────────────────────────
class PromotorService {

  // ── Promotors ───────────────────────────────────────────
  getPromotors(): Promotor[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(PROMOTORS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private savePromotors(list: Promotor[]): void {
    localStorage.setItem(PROMOTORS_KEY, JSON.stringify(list));
  }

  createPromotor(data: Omit<Promotor, 'id' | 'createdAt'>): Promotor {
    const list = this.getPromotors();
    const p: Promotor = {
      ...data,
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
    };
    list.push(p);
    this.savePromotors(list);
    return p;
  }

  updatePromotor(id: string, changes: Partial<Omit<Promotor, 'id' | 'createdAt'>>): void {
    const list = this.getPromotors().map(p =>
      p.id === id ? { ...p, ...changes } : p
    );
    this.savePromotors(list);
  }

  deletePromotor(id: string): void {
    this.savePromotors(this.getPromotors().filter(p => p.id !== id));
    // Also delete their sales
    this.saveSales(this.getSales().filter(s => s.promotorId !== id));
  }

  getPromotor(id: string): Promotor | null {
    return this.getPromotors().find(p => p.id === id) || null;
  }

  // ── Auth ─────────────────────────────────────────────────
  login(dni: string, password: string): Promotor | null {
    if (typeof window === 'undefined') return null;
    const p = this.getPromotors().find(
      p => p.dni === dni && p.password === password && p.status === 'active'
    );
    if (p) sessionStorage.setItem(SESSION_KEY, p.id);
    return p || null;
  }

  logout(): void {
    if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
  }

  getCurrentPromotor(): Promotor | null {
    if (typeof window === 'undefined') return null;
    const id = sessionStorage.getItem(SESSION_KEY);
    if (!id) return null;
    return this.getPromotor(id);
  }

  // ── Sales ────────────────────────────────────────────────
  getSales(): Sale[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(SALES_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  private saveSales(list: Sale[]): void {
    localStorage.setItem(SALES_KEY, JSON.stringify(list));
  }

  getSalesByPromotor(promotorId: string): Sale[] {
    return this.getSales()
      .filter(s => s.promotorId === promotorId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addSale(data: Omit<Sale, 'id' | 'createdAt'>): Sale {
    const list = this.getSales();
    const sale: Sale = {
      ...data,
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
    };
    list.push(sale);
    this.saveSales(list);
    return sale;
  }

  deleteSale(id: string): void {
    this.saveSales(this.getSales().filter(s => s.id !== id));
  }

  // ── Stats ────────────────────────────────────────────────
  getStats(promotorId?: string) {
    const sales = promotorId
      ? this.getSalesByPromotor(promotorId)
      : this.getSales();
    return {
      totalSales:   sales.length,
      totalBoxes:   sales.filter(s => IS_BOX_SALE[s.saleType]).length,
      totalEntries: sales.filter(s => !IS_BOX_SALE[s.saleType]).reduce((a, s) => a + s.entries, 0),
      totalRevenue: sales.reduce((a, s) => a + s.price, 0),
    };
  }
}

export const promotorService = new PromotorService();
