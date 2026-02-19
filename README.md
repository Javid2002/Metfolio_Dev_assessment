# Metfolio — Junior Full-Stack Assessment

A full-stack product and order management app built with **Node.js + TypeScript**, **React + TypeScript**, **PostgreSQL**, and **Docker Compose**.

---

## Quick Start

```bash
docker compose up --build
```

| Service  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:5173      |
| API      | http://localhost:3001      |
| Postgres | localhost:5432             |

The database is automatically migrated and seeded with 12 products on first run.

---

## Project Structure

```
/
├── api/                    # Node.js + Express + TypeScript
│   └── src/
│       ├── index.ts        # App entry: migrate, seed, listen
│       ├── db/
│       │   ├── pool.ts     # pg connection pool
│       │   └── migrate.ts  # DDL + seed
│       ├── routes/
│       │   ├── products.ts
│       │   └── orders.ts
│       └── middleware/
│           └── errorHandler.ts
├── web/                    # React + Vite + TypeScript
│   └── src/
│       ├── api/client.ts   # Typed fetch wrapper
│       └── pages/
│           ├── ProductsPage.tsx
│           ├── CreateOrderPage.tsx
│           ├── OrdersPage.tsx
│           └── OrderDetailPage.tsx
└── docker-compose.yml
```

---

## API Reference

### Products

| Method | Path              | Description              |
|--------|-------------------|--------------------------|
| GET    | `/products`       | List/search/sort         |
| POST   | `/products`       | Create with validation   |
| PATCH  | `/products/:id`   | Update price and/or stock|

**GET /products** query params: `search`, `sort` (id/name/sku/price_cents/stock_qty), `order` (asc/desc)

**POST /products** body:
```json
{ "name": "Widget", "sku": "WGT-001", "price_cents": 999, "stock_qty": 50 }
```

**PATCH /products/:id** body (at least one field required):
```json
{ "price_cents": 1299, "stock_qty": 45 }
```

### Orders

| Method | Path          | Description               |
|--------|---------------|---------------------------|
| GET    | `/orders`     | List with totals           |
| GET    | `/orders/:id` | Order detail with items    |
| POST   | `/orders`     | Transactional order create |

**POST /orders** body:
```json
{
  "items": [
    { "product_id": 1, "qty": 2 },
    { "product_id": 3, "qty": 1 }
  ]
}
```

---

## Database Design

```sql
products   (id, name, sku UNIQUE, price_cents, stock_qty, created_at)
orders     (id, created_at)
order_items(id, order_id FK, product_id FK, qty, price_at_purchase)
```

All constraints are enforced at the DB level (`CHECK`, `UNIQUE`, `NOT NULL`, foreign keys).

---

## Key Engineering Decisions & Trade-offs

### Transactional Order Creation
`POST /orders` acquires `FOR UPDATE` row locks on all affected products before checking stock. This prevents race conditions where two simultaneous orders could both pass a stock check and oversell. The entire flow (stock check → insert order → insert items → decrement stock) runs in a single transaction.

### Price Snapshot
`order_items.price_at_purchase` stores the product's price at the time of order. This means changing a product's price later doesn't retroactively change order history — accurate financial records.

### Inline Cell Editing
Products page supports click-to-edit for price and stock directly in the table. Uses blur/Enter/Escape for commit/cancel. This is faster than a modal for bulk updates.

### Input Validation
- API uses [Zod](https://zod.dev) for schema validation. Zod errors are caught by the error handler and returned as structured `400` responses.
- SQL injection is prevented entirely via parameterized queries. The only dynamic SQL is `ORDER BY`, which is validated against an allowlist of column names.

### No Auth
Authentication is out of scope for this assessment. In production, you'd add JWT middleware and scope write operations.

### No Pagination
Product and order lists return all rows. For large datasets, cursor-based pagination on `created_at` would be the next step.
