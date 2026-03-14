// lib/promotors-kv.ts — Server-side promotor/sale storage in Redis (Upstash)
// Replaces localStorage-based PromotorService for multi-device support.

import { kvGet, kvSet, kvDel } from './kv';
import { randomBytes } from 'crypto';
import type { Promotor, Sale } from './promotors';

const PROMOTORS_KEY  = 'promo:promotors';
const SALES_KEY      = 'promo:sales';
const SESSION_PREFIX = 'promo:session:';
const TTL_DATA       = 365 * 24 * 60 * 60; // 1 year
const TTL_SESSION    = 8  * 60 * 60;        // 8 hours

// ── Internal helpers ──────────────────────────────────────────
async function getPromotorList(): Promise<Promotor[]> {
  const raw = await kvGet(PROMOTORS_KEY);
  return raw ? (JSON.parse(raw) as Promotor[]) : [];
}
async function savePromotorList(list: Promotor[]): Promise<void> {
  await kvSet(PROMOTORS_KEY, JSON.stringify(list), TTL_DATA);
}
async function getSaleList(): Promise<Sale[]> {
  const raw = await kvGet(SALES_KEY);
  return raw ? (JSON.parse(raw) as Sale[]) : [];
}
async function saveSaleList(list: Sale[]): Promise<void> {
  await kvSet(SALES_KEY, JSON.stringify(list), TTL_DATA);
}

// ── Promotor CRUD ─────────────────────────────────────────────
export async function getAllPromotors(): Promise<Promotor[]> {
  return getPromotorList();
}

export async function createPromotor(data: Omit<Promotor, 'id' | 'createdAt'>): Promise<Promotor> {
  const list = await getPromotorList();
  const p: Promotor = { ...data, id: randomBytes(8).toString('hex'), createdAt: new Date().toISOString() };
  list.push(p);
  await savePromotorList(list);
  return p;
}

export async function updatePromotor(id: string, changes: Partial<Omit<Promotor, 'id' | 'createdAt'>>): Promise<void> {
  const list = (await getPromotorList()).map(p => p.id === id ? { ...p, ...changes } : p);
  await savePromotorList(list);
}

export async function deletePromotor(id: string): Promise<void> {
  await savePromotorList((await getPromotorList()).filter(p => p.id !== id));
  await saveSaleList((await getSaleList()).filter(s => s.promotorId !== id));
}

// ── Auth ──────────────────────────────────────────────────────
export async function loginPromotor(dni: string, password: string): Promise<{ promotor: Promotor; sessionToken: string } | null> {
  const list = await getPromotorList();
  const p = list.find(p => p.dni === dni && p.password === password && p.status === 'active');
  if (!p) return null;
  const token = randomBytes(32).toString('hex');
  await kvSet(`${SESSION_PREFIX}${token}`, p.id, TTL_SESSION);
  return { promotor: p, sessionToken: token };
}

export async function getPromotorBySession(token: string): Promise<Promotor | null> {
  if (!token) return null;
  const promotorId = await kvGet(`${SESSION_PREFIX}${token}`);
  if (!promotorId) return null;
  return (await getPromotorList()).find(p => p.id === promotorId) ?? null;
}

export async function logoutPromotor(token: string): Promise<void> {
  await kvDel(`${SESSION_PREFIX}${token}`);
}

// ── Sales ─────────────────────────────────────────────────────
export async function getAllSales(): Promise<Sale[]> {
  return getSaleList();
}

export async function getSalesByPromotor(promotorId: string): Promise<Sale[]> {
  return (await getSaleList())
    .filter(s => s.promotorId === promotorId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addSale(data: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
  const list = await getSaleList();
  const sale: Sale = { ...data, id: randomBytes(8).toString('hex'), createdAt: new Date().toISOString() };
  list.push(sale);
  await saveSaleList(list);
  return sale;
}

export async function updateSale(id: string, changes: Partial<Omit<Sale, 'id' | 'createdAt'>>): Promise<void> {
  const list = (await getSaleList()).map(s => s.id === id ? { ...s, ...changes } : s);
  await saveSaleList(list);
}

export async function deleteSale(id: string): Promise<void> {
  await saveSaleList((await getSaleList()).filter(s => s.id !== id));
}
