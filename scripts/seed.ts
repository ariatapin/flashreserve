import { db, pool } from '../src/db/client.js';
import { products } from '../src/db/schema.js';

const examples = [
  { sku: 'FR-DEMO-HEADPHONES', title: 'Headphone Nirkabel', priceIdr: 1299000, stock: 1 },
  { sku: 'FR-DEMO-KEYBOARD', title: 'Keyboard Mekanis', priceIdr: 849000, stock: 8 },
  { sku: 'FR-DEMO-POWERBANK', title: 'Powerbank 20.000 mAh', priceIdr: 299000, stock: 12 },
];

try {
  for (const product of examples) {
    await db.insert(products).values(product).onConflictDoUpdate({
      target: products.sku,
      set: { title: product.title, priceIdr: product.priceIdr },
    });
  }
  console.log('Demo products are ready');
} finally {
  await pool.end();
}
