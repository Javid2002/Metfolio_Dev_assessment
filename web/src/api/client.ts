const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}` : '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  price_cents: number;
  stock_qty: number;
  created_at: string;
}

export interface OrderSummary {
  id: number;
  created_at: string;
  total_cents: number;
  item_count: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  qty: number;
  price_at_purchase: number;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItem[];
}

// Products
export const getProducts = (search = '', sort = 'id', order = 'asc') =>
  request<Product[]>(`/products?search=${encodeURIComponent(search)}&sort=${sort}&order=${order}`);

export const createProduct = (body: Omit<Product, 'id' | 'created_at'>) =>
  request<Product>('/products', { method: 'POST', body: JSON.stringify(body) });

export const patchProduct = (id: number, body: { price_cents?: number; stock_qty?: number }) =>
  request<Product>(`/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) });

export const deleteProduct = (id: number) =>
  request<void>(`/products/${id}`, { method: 'DELETE' });

// Orders
export const getOrders = () => request<OrderSummary[]>('/orders');

export const getOrder = (id: number) => request<OrderDetail>(`/orders/${id}`);

export const createOrder = (items: { product_id: number; qty: number }[]) =>
  request<{ id: number; created_at: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
