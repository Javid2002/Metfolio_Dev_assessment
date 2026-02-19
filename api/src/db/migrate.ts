import pool from './pool';

export async function migrate(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id          SERIAL PRIMARY KEY,
      name        TEXT        NOT NULL CHECK (char_length(name) > 0),
      sku         TEXT        NOT NULL UNIQUE CHECK (char_length(sku) > 0),
      price_cents INTEGER     NOT NULL CHECK (price_cents >= 0),
      stock_qty   INTEGER     NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id         SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id                SERIAL PRIMARY KEY,
      order_id          INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id        INTEGER NOT NULL REFERENCES products(id),
      qty               INTEGER NOT NULL CHECK (qty > 0),
      price_at_purchase INTEGER NOT NULL CHECK (price_at_purchase >= 0)
    );
  `);
}

export async function seed(): Promise<void> {
  const { rows } = await pool.query('SELECT COUNT(*) FROM products');
  if (parseInt(rows[0].count) > 0) return; // already seeded

  await pool.query(`
    INSERT INTO products (name, sku, price_cents, stock_qty) VALUES
      ('Wireless Noise-Cancelling Headphones', 'ELEC-001', 29999, 42),
      ('Mechanical Keyboard - TKL',            'ELEC-002',  8999, 75),
      ('USB-C Hub 7-in-1',                     'ELEC-003',  4999, 120),
      ('27" 4K Monitor',                        'ELEC-004', 54999, 18),
      ('Ergonomic Office Chair',               'FURN-001',  89999, 10),
      ('Standing Desk Converter',              'FURN-002',  24999, 30),
      ('LED Desk Lamp with USB Charging',      'FURN-003',   3999, 85),
      ('Webcam 1080p with Microphone',         'ELEC-005',  7999, 60),
      ('Laptop Stand Aluminum',                'ELEC-006',   2999, 200),
      ('Wireless Mouse - Ergonomic',           'ELEC-007',   4499, 95),
      ('Cable Management Box',                 'FURN-004',   1999, 150),
      ('Monitor Light Bar',                    'ELEC-008',   3499, 70)
    ON CONFLICT (sku) DO NOTHING;
  `);
}
