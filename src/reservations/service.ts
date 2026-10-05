import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';

export type InvoiceGateway = (input: { reservationId: string; quantity: number }) => Promise<string>;

export class SoldOutError extends Error {
  constructor() {
    super('Insufficient stock');
    this.name = 'SoldOutError';
  }
}

export type DemoCheckoutOutcome = 'paid' | 'failed';
export type ReservationStatus = 'pending' | 'paid' | 'failed' | 'expired';

export async function reserveStock(
  productId: string,
  quantity: number,
  issueInvoice: InvoiceGateway,
) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new RangeError('quantity must be a positive integer');

  return db.transaction(async (tx) => {
    // One conditional UPDATE is the serialization point for competing buyers.
    // It cannot decrement below zero, even when all requests arrive together.
    const updated = await tx.execute<{ id: string }>(sql`
      UPDATE products SET stock = stock - ${quantity}
      WHERE id = ${productId} AND stock >= ${quantity}
      RETURNING id
    `);
    const product = updated.rows[0];
    if (!product) throw new SoldOutError();

    const expiry = new Date(Date.now() + 15 * 60 * 1000);
    const inserted = await tx.execute<{ id: string }>(sql`
      INSERT INTO reservations (product_id, quantity, expires_at, invoice_id)
      VALUES (${productId}, ${quantity}, ${expiry}, 'pending')
      RETURNING id
    `);
    const reservation = inserted.rows[0];
    if (!reservation) throw new Error('Reservation insert returned no row');

    // Invoice failure rejects the callback, making Drizzle roll back both the
    // decrement and the reservation insert as a single DB transaction.
    const invoiceId = await issueInvoice({ reservationId: reservation.id, quantity });
    await tx.execute(sql`UPDATE reservations SET invoice_id = ${invoiceId} WHERE id = ${reservation.id}`);
    return { holdingId: reservation.id, expiresAt: expiry.toISOString(), invoiceId };
  });
}

async function restoreStock(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], productId: string, quantity: number) {
  await tx.execute(sql`UPDATE products SET stock = stock + ${quantity} WHERE id = ${productId}`);
}

/** Marks a demo payment result once; failed/expired holds return their stock exactly once. */
export async function settleDemoCheckout(holdingId: string, outcome: DemoCheckoutOutcome) {
  return db.transaction(async (tx) => {
    const selected = await tx.execute<{
      id: string;
      product_id: string;
      quantity: number;
      status: ReservationStatus;
      active: boolean;
    }>(sql`
      SELECT id, product_id, quantity, status, expires_at > now() AS active
      FROM reservations WHERE id = ${holdingId} FOR UPDATE
    `);
    const reservation = selected.rows[0];
    if (!reservation) return { found: false as const };
    if (reservation.status !== 'pending') {
      return { found: true as const, status: reservation.status, changed: false };
    }

    const status: ReservationStatus = outcome === 'failed'
      ? 'failed'
      : reservation.active ? 'paid' : 'expired';
    await tx.execute(sql`UPDATE reservations SET status = ${status} WHERE id = ${holdingId}`);
    if (status === 'failed' || status === 'expired') {
      await restoreStock(tx, reservation.product_id, reservation.quantity);
    }
    return { found: true as const, status, changed: true };
  });
}

/** Expires pending holds and restores inventory atomically, safe to run repeatedly. */
export async function releaseExpiredReservations() {
  return db.transaction(async (tx) => {
    const expired = await tx.execute<{ product_id: string; quantity: number }>(sql`
      UPDATE reservations SET status = 'expired'
      WHERE status = 'pending' AND expires_at <= now()
      RETURNING product_id, quantity
    `);
    for (const reservation of expired.rows) {
      await restoreStock(tx, reservation.product_id, reservation.quantity);
    }
    return expired.rowCount;
  });
}
