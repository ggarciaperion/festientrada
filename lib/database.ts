// Sistema de base de datos en memoria (localStorage para persistencia)
// En producción, reemplazar con una base de datos real

export type TicketType = 'general' | 'vip' | 'supervip' | 'platinum';

export interface Ticket {
  id: string;
  eventId: string;
  ticketType: TicketType;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerDNI: string;
  quantity: number;
  totalPrice: number;
  purchaseDate: string;
  qrCode: string;
  validated: boolean;
  validatedAt?: string;
  tickets: TicketEntry[];
}

export interface TicketEntry {
  entryId: string;
  ticketType: TicketType;
  qrData: string;
  validated: boolean;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  city: string;
  prices: Record<TicketType, number>;
}

// Configuración del evento
export const FESTIVAL_EVENT: Event = {
  id: 'festival-salsa-timba-chancay-2026',
  name: 'Festival de Salsa y Timba Chancay 2026',
  date: '2026-03-29',
  time: '20:00',
  location: 'Malecón del Puerto de Chancay',
  city: 'Chancay, Lima',
  prices: {
    general:  50,
    vip:     100,
    supervip: 150,
    platinum: 200,
  },
};

class DatabaseService {
  private storageKey = 'festival-tickets-v2';

  getTickets(): Ticket[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  saveTicket(ticket: Ticket): void {
    const tickets = this.getTickets();
    tickets.push(ticket);
    localStorage.setItem(this.storageKey, JSON.stringify(tickets));
  }

  getTicketById(id: string): Ticket | null {
    return this.getTickets().find(t => t.id === id) || null;
  }

  validateEntry(entryId: string): boolean {
    const tickets = this.getTickets();
    let found = false;

    const updated = tickets.map(ticket => {
      const updatedEntries = ticket.tickets.map(entry => {
        if (entry.entryId === entryId && !entry.validated) {
          found = true;
          return { ...entry, validated: true };
        }
        return entry;
      });
      const allValidated = updatedEntries.every(e => e.validated);
      return {
        ...ticket,
        tickets: updatedEntries,
        validated: allValidated,
        validatedAt: allValidated && !ticket.validated ? new Date().toISOString() : ticket.validatedAt,
      };
    });

    if (found) localStorage.setItem(this.storageKey, JSON.stringify(updated));
    return found;
  }

  isEntryValidated(entryId: string): boolean {
    for (const ticket of this.getTickets()) {
      const entry = ticket.tickets.find(e => e.entryId === entryId);
      if (entry) return entry.validated;
    }
    return false;
  }

  getEntryById(entryId: string): { ticket: Ticket; entry: TicketEntry } | null {
    for (const ticket of this.getTickets()) {
      const entry = ticket.tickets.find(e => e.entryId === entryId);
      if (entry) return { ticket, entry };
    }
    return null;
  }

  getStats() {
    const tickets = this.getTickets();
    return {
      totalOrders:     tickets.length,
      totalTickets:    tickets.reduce((s, t) => s + t.quantity, 0),
      totalRevenue:    tickets.reduce((s, t) => s + t.totalPrice, 0),
      validatedOrders: tickets.filter(t => t.validated).length,
    };
  }

  clearAll(): void {
    localStorage.removeItem(this.storageKey);
  }
}

export const db = new DatabaseService();
