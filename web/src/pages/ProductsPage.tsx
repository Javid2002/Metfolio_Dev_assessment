import { useEffect, useState, useCallback } from 'react';
import { getProducts, patchProduct, createProduct, deleteProduct, Product } from '../api/client';
import './ProductsPage.css';

function fmtPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

type EditField = { id: number; field: 'price_cents' | 'stock_qty'; value: string } | null;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search,   setSearch]   = useState('');
  const [sort,     setSort]     = useState('id');
  const [order,    setOrder]    = useState<'asc' | 'desc'>('asc');
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [edit,     setEdit]     = useState<EditField>(null);
  const [saving,   setSaving]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create product form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sku: '', price_cents: '', stock_qty: '0' });
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getProducts(search, sort, order);
      setProducts(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [search, sort, order]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (col: string) => {
    if (sort === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSort(col); setOrder('asc'); }
  };

  const commitEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      const numVal = edit.field === 'price_cents'
        ? Math.round(parseFloat(edit.value) * 100)
        : parseInt(edit.value);
      if (isNaN(numVal) || numVal < 0) { setEdit(null); return; }
      const updated = await patchProduct(edit.id, { [edit.field]: numVal });
      setProducts(ps => ps.map(p => p.id === edit.id ? updated : p));
      setEdit(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await deleteProduct(id);
      setProducts(ps => ps.filter(p => p.id !== id));
      setConfirmDelete(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const priceCents = Math.round(parseFloat(form.price_cents) * 100);
    const stockQty   = parseInt(form.stock_qty);
    if (!form.name || !form.sku || isNaN(priceCents) || priceCents < 0) {
      setFormError('All fields are required and price must be ≥ 0');
      return;
    }
    try {
      const p = await createProduct({ name: form.name, sku: form.sku, price_cents: priceCents, stock_qty: stockQty });
      setProducts(ps => [p, ...ps]);
      setForm({ name: '', sku: '', price_cents: '', stock_qty: '0' });
      setShowForm(false);
    } catch (e) {
      setFormError((e as Error).message);
    }
  };

  const SortIcon = ({ col }: { col: string }) =>
    sort === col ? (order === 'asc' ? <> ↑</> : <> ↓</>) : null;

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form className="card create-form" onSubmit={handleCreate}>
          <h2>New Product</h2>
          {formError && <div className="error-msg">{formError}</div>}
          <div className="form-grid">
            <label>Name
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Wireless Headphones" required />
            </label>
            <label>SKU
              <input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} placeholder="ELEC-001" required />
            </label>
            <label>Price ($)
              <input type="number" min="0" step="0.01" value={form.price_cents}
                onChange={e => setForm(f => ({...f, price_cents: e.target.value}))} placeholder="29.99" required />
            </label>
            <label>Stock Qty
              <input type="number" min="0" value={form.stock_qty}
                onChange={e => setForm(f => ({...f, stock_qty: e.target.value}))} />
            </label>
          </div>
          <button type="submit" className="btn-primary">Create Product</button>
        </form>
      )}

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search by name or SKU…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="count">{products.length} products</span>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card table-wrap">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th onClick={() => handleSort('id')}     className="sortable">ID    <SortIcon col="id"          /></th>
                <th onClick={() => handleSort('name')}   className="sortable">Name  <SortIcon col="name"        /></th>
                <th onClick={() => handleSort('sku')}    className="sortable">SKU   <SortIcon col="sku"         /></th>
                <th onClick={() => handleSort('price_cents')}  className="sortable">Price  <SortIcon col="price_cents"  /></th>
                <th onClick={() => handleSort('stock_qty')}    className="sortable">Stock  <SortIcon col="stock_qty"    /></th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td className="text-muted">{p.id}</td>
                  <td>{p.name}</td>
                  <td><span className="badge badge-yellow">{p.sku}</span></td>

                  {/* Editable Price */}
                  <td className="editable-cell" onClick={() => !edit && setEdit({ id: p.id, field: 'price_cents', value: (p.price_cents / 100).toFixed(2) })}>
                    {edit?.id === p.id && edit.field === 'price_cents' ? (
                      <input
                        autoFocus
                        type="number" min="0" step="0.01"
                        value={edit.value}
                        onChange={e => setEdit(ed => ed ? {...ed, value: e.target.value} : ed)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' ? commitEdit() : e.key === 'Escape' && setEdit(null)}
                        disabled={saving}
                      />
                    ) : (
                      <span className="editable-value">{fmtPrice(p.price_cents)} <span className="edit-hint">✎</span></span>
                    )}
                  </td>

                  {/* Editable Stock */}
                  <td className="editable-cell" onClick={() => !edit && setEdit({ id: p.id, field: 'stock_qty', value: String(p.stock_qty) })}>
                    {edit?.id === p.id && edit.field === 'stock_qty' ? (
                      <input
                        autoFocus
                        type="number" min="0"
                        value={edit.value}
                        onChange={e => setEdit(ed => ed ? {...ed, value: e.target.value} : ed)}
                        onBlur={commitEdit}
                        onKeyDown={e => e.key === 'Enter' ? commitEdit() : e.key === 'Escape' && setEdit(null)}
                        disabled={saving}
                      />
                    ) : (
                      <span className={`editable-value ${p.stock_qty === 0 ? 'out-of-stock' : ''}`}>
                        <span className={`badge ${p.stock_qty === 0 ? 'badge-red' : p.stock_qty < 10 ? 'badge-yellow' : 'badge-green'}`}>
                          {p.stock_qty}
                        </span>
                        <span className="edit-hint">✎</span>
                      </span>
                    )}
                  </td>

                  <td className="text-muted">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    {confirmDelete === p.id ? (
                      <span className="delete-confirm">
                        Sure?{' '}
                        <button className="btn-ghost" style={{ color: 'var(--red)', padding: '2px 6px' }}
                          onClick={() => handleDelete(p.id)} disabled={deleting}>
                          {deleting ? '…' : 'Yes'}
                        </button>
                        <button className="btn-ghost" style={{ padding: '2px 6px' }}
                          onClick={() => setConfirmDelete(null)}>No</button>
                      </span>
                    ) : (
                      <button className="btn-ghost delete-btn" onClick={() => setConfirmDelete(p.id)}
                        title="Delete product">🗑</button>
                    )}
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
