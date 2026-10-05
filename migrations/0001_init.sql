CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL UNIQUE,
  stock integer NOT NULL CHECK (stock >= 0)
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  expires_at timestamptz NOT NULL,
  invoice_id text NOT NULL
);

CREATE INDEX IF NOT EXISTS reservations_product_id_idx ON reservations(product_id);
