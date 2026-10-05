import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: text('sku').notNull().unique(),
  title: text('title').notNull().default('Flash sale item'),
  priceIdr: integer('price_idr').notNull().default(0),
  stock: integer('stock').notNull(),
});

export const reservations = pgTable('reservations', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  invoiceId: text('invoice_id').notNull(),
  status: text('status').notNull().default('pending'),
});
