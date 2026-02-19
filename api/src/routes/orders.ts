import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool';

const router = Router();

const createOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.number().int().positive(),
    qty:        z.number().int().positive(),
  })).min(1),
});

// GET /orders — list with totals
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        o.id,
        o.created_at,
        COALESCE(SUM(oi.qty * oi.price_at_purchase), 0)::int AS total_cents,
        COALESCE(SUM(oi.qty), 0)::int                        AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /orders/:id — order details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    const { rows: orderRows } = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [id]
    );
    if (orderRows.length === 0) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const { rows: itemRows } = await pool.query(`
      SELECT
        oi.id,
        oi.qty,
        oi.price_at_purchase,
        p.name  AS product_name,
        p.sku   AS product_sku,
        p.id    AS product_id
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1
    `, [id]);

    const total_cents = itemRows.reduce(
      (sum, item) => sum + item.qty * item.price_at_purchase, 0
    );

    res.json({ ...orderRows[0], items: itemRows, total_cents });
  } catch (err) {
    next(err);
  }
});

// POST /orders — transactional order creation
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const { items } = createOrderSchema.parse(req.body);

    await client.query('BEGIN');

    // Deduplicate items by product_id
    const deduped = Object.values(
      items.reduce<Record<number, { product_id: number; qty: number }>>((acc, item) => {
        if (acc[item.product_id]) {
          acc[item.product_id].qty += item.qty;
        } else {
          acc[item.product_id] = { ...item };
        }
        return acc;
      }, {})
    );

    // Lock product rows & verify stock
    const productIds = deduped.map(i => i.product_id);
    const { rows: products } = await client.query(
      'SELECT * FROM products WHERE id = ANY($1) FOR UPDATE',
      [productIds]
    );

    const productMap = new Map(products.map(p => [p.id, p]));

    for (const item of deduped) {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw Object.assign(new Error(`Product ${item.product_id} not found`), { status: 404 });
      }
      if (product.stock_qty < item.qty) {
        throw Object.assign(
          new Error(`Insufficient stock for "${product.name}" (available: ${product.stock_qty})`),
          { status: 409 }
        );
      }
    }

    // Create order
    const { rows: [order] } = await client.query(
      'INSERT INTO orders DEFAULT VALUES RETURNING *'
    );

    // Insert items & decrement stock
    for (const item of deduped) {
      const product = productMap.get(item.product_id)!;
      await client.query(
        `INSERT INTO order_items (order_id, product_id, qty, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.qty, product.price_cents]
      );
      await client.query(
        'UPDATE products SET stock_qty = stock_qty - $1 WHERE id = $2',
        [item.qty, item.product_id]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ id: order.id, created_at: order.created_at });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
