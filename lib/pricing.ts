/**
 * Descuento de pre-venta — Festival de Salsa y Timba Chancay 2026
 * 30 % de descuento hasta el 25 de marzo de 2026 a las 12:00 pm hora Lima (UTC-5).
 */

/** 25 mar 2026 12:00 pm Lima (UTC-5) = 17:00 UTC */
export const DISCOUNT_DEADLINE = new Date('2026-03-25T17:00:00Z');
export const DISCOUNT_RATE     = 0.30;
export const DISCOUNT_LABEL    = 'Pre-venta hasta 25 de marzo';

export function isDiscountActive(): boolean {
  return Date.now() < DISCOUNT_DEADLINE.getTime();
}

/** Precio con descuento, redondeado al entero más cercano */
export function discountedPrice(price: number): number {
  return Math.round(price * (1 - DISCOUNT_RATE));
}

/** Precio efectivo: descontado si la promo está activa, original si no */
export function getPrice(price: number): number {
  return isDiscountActive() ? discountedPrice(price) : price;
}
