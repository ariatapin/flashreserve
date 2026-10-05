import express from 'express';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from './db/client.js';
import { products } from './db/schema.js';
import {
  InvoiceGateway,
  reserveStock,
  settleDemoCheckout,
  SoldOutError,
} from './reservations/service.js';

const localInvoiceGateway: InvoiceGateway = async () => `inv_${randomUUID()}`;

export function createApp(invoiceGateway: InvoiceGateway = localInvoiceGateway) {
  const app = express();
  app.use(express.json());
  app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

  app.get('/api/products', async (_req, res) => {
    try {
      const availableProducts = await db.select({
        id: products.id,
        sku: products.sku,
        title: products.title,
        priceIdr: products.priceIdr,
        stock: products.stock,
      }).from(products).orderBy(products.title);
      res.json(availableProducts);
    } catch {
      res.status(500).json({ error: 'Could not load products' });
    }
  });

  app.post('/api/reservations', async (req, res) => {
    const { productId, quantity } = req.body as { productId?: unknown; quantity?: unknown };
    if (typeof productId !== 'string' || typeof quantity !== 'number') {
      res.status(400).json({ error: 'productId and numeric quantity are required' });
      return;
    }
    try {
      const result = await reserveStock(productId, quantity, invoiceGateway);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof SoldOutError) {
        res.status(409).json({ error: 'Insufficient stock' });
        return;
      }
      if (error instanceof RangeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      res.status(502).json({ error: 'Invoice issuance failed; reservation rolled back' });
    }
  });

  app.post('/api/reservations/:holdingId/checkout', async (req, res) => {
    const { outcome } = req.body as { outcome?: unknown };
    if (outcome !== 'paid' && outcome !== 'failed') {
      res.status(400).json({ error: 'outcome must be paid or failed' });
      return;
    }
    try {
      const result = await settleDemoCheckout(req.params.holdingId, outcome);
      if (!result.found) {
        res.status(404).json({ error: 'Holding not found' });
        return;
      }
      res.json({ status: result.status, changed: result.changed });
    } catch {
      res.status(500).json({ error: 'Could not update demo checkout' });
    }
  });

  return app;
}

export default createApp();
