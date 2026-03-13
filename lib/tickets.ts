// lib/tickets.ts — SERVER-SIDE ONLY (uses Node.js crypto)
// Token format: {base64url_payload}.{hmac32}
// base64url does not contain '.', so splitting on the last '.' is safe.

import { createHmac } from 'crypto';
import { randomUUID } from 'crypto';

export interface TicketPayload {
  id:      string;   // UUID — unique per ticket
  orderId: string;   // Izipay order ID
  type:    'box' | 'individual';
  zone:    string;   // 'platinum' | 'vip' | 'malecon' | 'general'
  qty:     number;   // number of entries
  name:    string;   // buyer name
  ts:      number;   // unix ms timestamp
}

function secret(): string {
  const s = process.env.TICKET_SECRET_KEY;
  if (!s) throw new Error('TICKET_SECRET_KEY no configurada');
  return s;
}

function hmac32(data: string): string {
  return createHmac('sha256', secret()).update(data).digest('hex').slice(0, 32);
}

export function generateTicketToken(params: Omit<TicketPayload, 'id' | 'ts'>): string {
  const payload: TicketPayload = { ...params, id: randomUUID(), ts: Date.now() };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${hmac32(encoded)}`;
}

export function verifyTicketToken(token: string): TicketPayload | null {
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const encoded = token.slice(0, dot);
  const sig     = token.slice(dot + 1);
  try {
    if (sig !== hmac32(encoded)) return null;
    return JSON.parse(Buffer.from(encoded, 'base64url').toString()) as TicketPayload;
  } catch {
    return null;
  }
}
