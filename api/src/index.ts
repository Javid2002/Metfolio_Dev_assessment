import express from 'express';
import cors from 'cors';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import { errorHandler } from './middleware/errorHandler';
import { migrate, seed } from './db/migrate';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN ?? '*',
}));
app.use(express.json());

app.use('/products', productsRouter);
app.use('/orders', ordersRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

async function start() {
  try {
    await migrate();
    console.log('✓ Migrations complete');
    await seed();
    console.log('✓ Seed complete');
    app.listen(PORT, () => console.log(`✓ API listening on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
