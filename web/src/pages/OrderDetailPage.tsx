import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrder, OrderDetail } from '../api/client';

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order,   setOrder]   = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!id) return;
    getOrder(parseInt(id))
      .then(setOrder)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading order…</div>;
  if (error)   return <div className="error-msg">{error}</div>;
  if (!order)  return null;

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Link to="/orders"><button className="btn-ghost" style={{ fontSize: 13 }}>← Back</button></Link>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Order #{order.id}</h1>
        <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 'auto' }}>
          {new Date(order.created_at).toLocaleString()}
        </span>
      </div>

      <div className="card" style={{ overflow: 'hidden', marginBottom: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                <td><span className="badge badge-yellow">{item.product_sku}</span></td>
                <td>{item.qty}</td>
                <td style={{ color: 'var(--text-muted)' }}>{fmtPrice(item.price_at_purchase)}</td>
                <td style={{ fontWeight: 600 }}>{fmtPrice(item.qty * item.price_at_purchase)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {order.items.reduce((s, i) => s + i.qty, 0)} items
          </span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Total</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
              {fmtPrice(order.total_cents)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
