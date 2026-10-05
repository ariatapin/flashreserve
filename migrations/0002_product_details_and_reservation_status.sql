ALTER TABLE products
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT 'Flash sale item',
  ADD COLUMN IF NOT EXISTS price_idr integer NOT NULL DEFAULT 0 CHECK (price_idr >= 0);

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'paid', 'failed', 'expired'));

CREATE INDEX IF NOT EXISTS reservations_pending_expiry_idx
  ON reservations (expires_at)
  WHERE status = 'pending';
