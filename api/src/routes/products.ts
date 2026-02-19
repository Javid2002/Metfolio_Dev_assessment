import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import pool from '../db/pool';

const router = Router();

// Validation schemas
const createProductSchema = z.object({
  name:        z.string().min(1),
  sku:         z.string().min(1),
  price_cents: z.number().int().nonnegative(),
  stock_qty:   z.number().int().nonnegative().default(0),
});

const patchProductSchema = z.object({
  price_cents: z.number().int().nonnegative().optional(),
  stock_qty:   z.number().int().nonnegative().optional(),
}).refine(d => d.price_cents !== undefined || d.stock_qty !== undefined, {
  message: 'At least one of price_cents or stock_qty must be provided',
});

// GET /products?search=&sort=name|price_cents|stock_qty&order=asc|desc
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search = '', sort = 'id', order = 'asc' } = req.query as Record<string, string>;

    const allowedSorts = ['id', 'name', 'sku', 'price_cents', 'stock_qty', 'created_at'];
    const safeSort  = allowedSorts.includes(sort)  ? sort  : 'id';
    const safeOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const { rows } = await pool.query(
      `SELECT * FROM products
       WHERE name ILIKE $1 OR sku ILIKE $1
       ORDER BY ${safeSort} ${safeOrder}`,
      [`%${search}%`]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /products
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProductSchema.parse(req.body);
    const { rows } = await pool.query(
      `INSERT INTO products (name, sku, price_cents, stock_qty)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.sku, data.price_cents, data.stock_qty]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /products/:id
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id   = parseInt(req.params.id);
    const data = patchProductSchema.parse(req.body);

    const setClauses: string[] = [];
    const values:     unknown[] = [];

    if (data.price_cents !== undefined) {
      values.push(data.price_cents);
      setClauses.push(`price_cents = $${values.length}`);
    }
    if (data.stock_qty !== undefined) {
      values.push(data.stock_qty);
      setClauses.push(`stock_qty = $${values.length}`);
    }

    values.push(id);
    const { rows } = await pool.query(
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /products/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    // Prevent deleting products that are part of existing orders
    const { rows: usedRows } = await pool.query(
      'SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1',
      [id]
    );
    if (usedRows.length > 0) {
      res.status(409).json({ error: 'Cannot delete a product that is part of existing orders' });
      return;
    }

    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    if (rowCount === 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
