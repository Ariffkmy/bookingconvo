-- Affiliates table
CREATE TABLE IF NOT EXISTS affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Track affiliate on bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS affiliate_code text;

-- RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to affiliates"
  ON affiliates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Public can read active affiliates"
  ON affiliates FOR SELECT
  TO anon
  USING (is_active = true);
