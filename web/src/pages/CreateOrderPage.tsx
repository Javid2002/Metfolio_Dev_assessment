import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, createOrder, Product } from '../api/client';
import './CreateOrderPage.css';

interface CartItem {
  product: Product;
  qty: number;
}

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CreateOrderPage() {
  const navigate  = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search,   setSearch]   = useState('');
  const [cart,     setCart]     = useState<Map<number, CartItem>>(new Map());
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [placing,  setPlacing]  = useState(false);

  useEffect(() => {
    getProducts().then(setProducts).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(c => {
      const next = new Map(c);
      const item = next.get(product.id);
      if (item && item.qty < product.stock_qty) {
        next.set(product.id, { ...item, qty: item.qty + 1 });
      } else if (!item && product.stock_qty > 0) {
        next.set(product.id, { product, qty: 1 });
      }
      return next;
    });
  };

  const setQty = (productId: number, qty: number) => {
    setCart(c => {
      const next = new Map(c);
      if (qty <= 0) {
        next.delete(productId);
      } else {
        const item = next.get(productId);
        if (item) next.set(productId, { ...item, qty: Math.min(qty, item.product.stock_qty) });
      }
      return next;
    });
  };

  const cartItems  = Array.from(cart.values());
  const totalCents = cartItems.reduce((s, i) => s + i.qty * i.product.price_cents, 0);
  const totalItems = cartItems.reduce((s, i) => s + i.qty, 0);

  const placeOrder = async () => {
    if (cart.size === 0) return;
    setPlacing(true);
    setError('');
    try {
      const { id } = await createOrder(
        cartItems.map(i => ({ product_id: i.product.id, qty: i.qty }))
      );
      navigate(`/orders/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setPlacing(false);
    }
  };

  return (
    <div className="create-order-layout">
      <div className="products-panel">
        <div className="panel-header">
          <h1>New Order</h1>
          <input
            className="search"
            placeholder="Search products…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {error && <div className="error-msg">{error}</div>}

        {loading ? (
          <div className="loading">Loading products…</div>
        ) : (
          <div className="product-grid">
            {filtered.map(p => {
              const inCart = cart.get(p.id)?.qty ?? 0;
              const outOfStock = p.stock_qty === 0;
              return (
                <div
                  key={p.id}
                  className={`product-card card ${outOfStock ? 'out-of-stock' : ''} ${inCart ? 'in-cart' : ''}`}
                  onClick={() => !outOfStock && addToCart(p)}
                >
                  <div className="pc-sku">{p.sku}</div>
                  <div className="pc-name">{p.name}</div>
                  <div className="pc-footer">
                    <span className="pc-price">{fmtPrice(p.price_cents)}</span>
                    <span className={`badge ${outOfStock ? 'badge-red' : p.stock_qty < 5 ? 'badge-yellow' : 'badge-green'}`}>
                      {outOfStock ? 'Out of stock' : `${p.stock_qty} left`}
                    </span>
                  </div>
                  {inCart > 0 && <div className="cart-badge">{inCart}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <aside className="cart-panel card">
        <h2>Cart {totalItems > 0 && <span className="cart-count">{totalItems}</span>}</h2>

        {cartItems.length === 0 ? (
          <p className="empty-cart">Click products to add them</p>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map(({ product, qty }) => (
                <div key={product.id} className="cart-item">
                  <div className="ci-info">
                    <span className="ci-name">{product.name}</span>
                    <span className="ci-unit">{fmtPrice(product.price_cents)} each</span>
                  </div>
                  <div className="ci-controls">
                    <button className="btn-ghost qty-btn" onClick={() => setQty(product.id, qty - 1)}>−</button>
                    <span className="ci-qty">{qty}</span>
                    <button
                      className="btn-ghost qty-btn"
                      onClick={() => setQty(product.id, qty + 1)}
                      disabled={qty >= product.stock_qty}
                    >+</button>
                  </div>
                  <div className="ci-total">{fmtPrice(qty * product.price_cents)}</div>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Subtotal ({totalItems} items)</span>
                <span>{fmtPrice(totalCents)}</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span className="total-price">{fmtPrice(totalCents)}</span>
              </div>
            </div>

            <button
              className="btn-primary place-order-btn"
              onClick={placeOrder}
              disabled={placing}
            >
              {placing ? 'Placing…' : 'Place Order'}
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
