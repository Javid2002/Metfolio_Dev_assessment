import { Routes, Route, NavLink } from 'react-router-dom';
import ProductsPage from './pages/ProductsPage';
import CreateOrderPage from './pages/CreateOrderPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-brand">📦 Metfolio</div>
        <div className="nav-links">
          <NavLink to="/" end>Products</NavLink>
          <NavLink to="/orders/new">New Order</NavLink>
          <NavLink to="/orders">Orders</NavLink>
        </div>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/"            element={<ProductsPage />} />
          <Route path="/orders"      element={<OrdersPage />} />
          <Route path="/orders/new"  element={<CreateOrderPage />} />
          <Route path="/orders/:id"  element={<OrderDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
