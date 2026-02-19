import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders, OrderSummary } from '../api/client';

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrdersPage() {
  const [orders,  setOrders]  = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getOrders()
      .then(setOrders)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Orders</h1>
        <Link to="/orders/new">
          <button className="btn-primary">+ New Order</button>
        </Link>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="loading">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="loading">No orders yet. <Link to="/orders/new" style={{ color: 'var(--accent)' }}>Create one.</Link></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>#</span>{o.id}</td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td><span className="badge badge-yellow">{o.item_count} items</span></td>
                  <td style={{ fontWeight: 700 }}>{fmtPrice(o.total_cents)}</td>
                  <td>
                    <Link to={`/orders/${o.id}`}>
                      <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: 13 }}>
                        View →
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
