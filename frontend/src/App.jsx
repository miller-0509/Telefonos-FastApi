import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import ProductDetailPage from './pages/ProductDetailPage';
import TrackPage from './pages/TrackPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AccountPage from './pages/AccountPage';
import AdminPage from './pages/AdminPage';

function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '5rem 1rem', minHeight: '60vh' }}>
      <h1 style={{ fontSize: '4rem', color: '#818cf8', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ marginBottom: '1rem' }}>Página no encontrada</h2>
      <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>La ruta solicitada no existe o ha sido movida.</p>
      <Link to="/" className="btn-primary">Volver al Inicio</Link>
    </div>
  );
}

export default function App() {
  const [globalSearch, setGlobalSearch] = useState('');

  return (
    <ToastProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <div className="app-layout">
              <Navbar
                searchTerm={globalSearch}
                onSearchChange={(val) => setGlobalSearch(val)}
              />

              <main className="main-content">
                <Routes>
                  <Route path="/" element={<HomePage globalSearch={globalSearch} />} />
                  <Route path="/phone/:slug" element={<ProductDetailPage />} />
                  <Route path="/track" element={<TrackPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute>
                        <AccountPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireAdmin={true}>
                        <AdminPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>

              <Footer />
              <CartDrawer />
              <CheckoutModal />
            </div>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
