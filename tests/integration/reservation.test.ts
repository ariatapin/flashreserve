import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../../src/app.js';
import { getDatabaseUrl } from '../../src/db/config.js';
import { releaseExpiredReservations } from '../../src/reservations/service.js';

const pool = new Pool({ connectionString: getDatabaseUrl() });
const productIds: string[] = [];

async function createProduct(stock: number): Promise<string> {
  const sku = `integration-${randomUUID()}`;
  const result = await pool.query<{ id: string }>(
    'INSERT INTO products (sku, stock) VALUES ($1, $2) RETURNING id',
    [sku, stock],
  );
  const id = result.rows[0].id;
  productIds.push(id);
  return id;
}

async function readStock(productId: string): Promise<number> {
  const result = await pool.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [productId]);
  return result.rows[0].stock;
}

async function readReservationCount(productId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT count(*)::text AS count FROM reservations WHERE product_id = $1',
    [productId],
  );
  return Number(result.rows[0].count);
}

describe('reservation critical transaction path', () => {
  const app = createApp(async ({ reservationId }) => `invoice-for-${reservationId}`);

  beforeAll(async () => {
    await pool.query('SELECT 1');
  });

  afterAll(async () => {
    try {
      if (productIds.length) {
        // Fixture-scoped cleanup is safe with HTTP requests on separate DB
        // connections; a test-owned BEGIN/ROLLBACK cannot contain those writes.
        await pool.query('DELETE FROM products WHERE id = ANY($1::uuid[])', [productIds]);
      }
    } finally {
      await pool.end();
    }
  });

  it('reserves stock and returns a holding ID that expires in 15 minutes', async () => {
    const productId = await createProduct(3);
    const before = Date.now();

    const response = await request(app).post('/api/reservations').send({ productId, quantity: 1 });

    expect(response.status).toBe(201);
    expect(response.body.holdingId).toEqual(expect.any(String));
    expect(response.body.invoiceId).toEqual(expect.any(String));
    const expiresAt = Date.parse(response.body.expiresAt);
    expect(expiresAt).toBeGreaterThanOrEqual(before + 15 * 60 * 1000 - 1000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 15 * 60 * 1000 + 1000);
    expect(await readStock(productId)).toBe(2);
    expect(await readReservationCount(productId)).toBe(1);
  });

  it('allows exactly one of ten simultaneous buyers to reserve the last unit', async () => {
    const productId = await createProduct(1);

    // All ten requests are started before any response is awaited. The atomic
    // conditional decrement in PostgreSQL is the concurrency control point.
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app).post('/api/reservations').send({ productId, quantity: 1 }),
      ),
    );

    const winners = responses.filter((response) => response.status === 201);
    const soldOut = responses.filter((response) => response.status === 409);
    expect(winners).toHaveLength(1);
    expect(soldOut).toHaveLength(9);
    expect(winners[0].body.holdingId).toEqual(expect.any(String));
    expect(await readStock(productId)).toBe(0);
    expect(await readReservationCount(productId)).toBe(1);
  });

  it('rolls back the decrement and holding when invoice issuance fails', async () => {
    const productId = await createProduct(2);
    const failingApp = createApp(async () => {
      throw new Error('Gateway unavailable');
    });

    const response = await request(failingApp)
      .post('/api/reservations')
      .send({ productId, quantity: 1 });

    expect(response.status).toBe(502);
    expect(await readStock(productId)).toBe(2);
    expect(await readReservationCount(productId)).toBe(0);
  });

  it('returns stock once when a demo payment fails, including duplicate callbacks', async () => {
    const productId = await createProduct(2);
    const hold = await request(app).post('/api/reservations').send({ productId, quantity: 1 });
    expect(hold.status).toBe(201);
    expect(await readStock(productId)).toBe(1);

    const first = await request(app)
      .post(`/api/reservations/${hold.body.holdingId}/checkout`)
      .send({ outcome: 'failed' });
    const retry = await request(app)
      .post(`/api/reservations/${hold.body.holdingId}/checkout`)
      .send({ outcome: 'failed' });

    expect(first.body).toMatchObject({ status: 'failed', changed: true });
    expect(retry.body).toMatchObject({ status: 'failed', changed: false });
    expect(await readStock(productId)).toBe(2);
    expect(await readReservationCount(productId)).toBe(1);
  });

  it('releases expired holds once and returns their stock', async () => {
    const productId = await createProduct(1);
    const hold = await request(app).post('/api/reservations').send({ productId, quantity: 1 });
    expect(hold.status).toBe(201);
    await pool.query('UPDATE reservations SET expires_at = now() - interval \'1 second\' WHERE id = $1', [hold.body.holdingId]);

    expect(await releaseExpiredReservations()).toBe(1);
    expect(await releaseExpiredReservations()).toBe(0);
    expect(await readStock(productId)).toBe(1);
    const state = await pool.query<{ status: string }>(
      'SELECT status FROM reservations WHERE id = $1',
      [hold.body.holdingId],
    );
    expect(state.rows[0].status).toBe('expired');
  });
});
