import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import {
  Smartphone,
  Search,
  ShoppingCart,
  User as UserIcon,
  Package,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

export default function Navbar({ onSearchChange, searchTerm }) {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount, openCart } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar mobile menu al navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSearchInput = (e) => {
    const val = e.target.value;
    if (onSearchChange) {
      onSearchChange(val);
    }
    // Si no estamos en la página de inicio, navegar allí al buscar
    if (location.pathname !== '/' && val.trim() !== '') {
      navigate(`/?q=${encodeURIComponent(val)}`);
    }
  };

  return (
    <header className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="logo-brand">
          <div className="logo-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={24} color="#818cf8" />
          </div>
          <div className="logo-text">
            <span>Electro<span className="gradient-text">Phone</span></span>
            <small className="colombia-badge">COLOMBIA</small>
          </div>
        </Link>

        {/* Buscador central */}
        <div className="nav-search-wrap">
          <div className="search-box">
            <Search size={18} className="search-icon" color="#9ca3af" />
            <input
              type="text"
              id="global-search-input"
              placeholder="Buscar iPhone, Galaxy, Xiaomi, procesador, 5G..."
              value={searchTerm || ''}
              onChange={handleSearchInput}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Acciones del Navbar */}
        <div className="nav-actions">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
            Catálogo
          </Link>
          <Link to="/track" className={`nav-link ${location.pathname === '/track' ? 'active' : ''}`}>
            <Package size={16} style={{ display: 'inline', marginRight: '4px' }} />
            Rastrear Pedido
          </Link>

          {isAdmin && (
            <Link to="/admin" className={`nav-link admin-link ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
              <LayoutDashboard size={16} style={{ display: 'inline', marginRight: '4px' }} />
              Admin
            </Link>
          )}

          {/* Botón de Carrito */}
          <button className="cart-btn" onClick={openCart} aria-label="Ver carrito">
            <ShoppingCart size={20} />
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </button>

          {/* Menú de Usuario o Login */}
          {isAuthenticated ? (
            <div className="nav-user-menu" ref={dropdownRef}>
              <button
                className="user-menu-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
              >
                <div className="user-avatar-mini">
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="user-menu-name">
                  {user.full_name ? user.full_name.split(' ')[0] : 'Cuenta'}
                </span>
                <ChevronDown size={14} />
              </button>

              {dropdownOpen && (
                <div className="user-dropdown-menu open">
                  <div className="user-dropdown-header">
                    <strong>{user.full_name}</strong>
                    <small>{user.email}</small>
                  </div>
                  <div className="dropdown-divider"></div>
                  <Link to="/account" onClick={() => setDropdownOpen(false)}>
                    <UserIcon size={16} /> Mi Cuenta & Órdenes
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setDropdownOpen(false)}>
                      <LayoutDashboard size={16} /> Panel de Administración
                    </Link>
                  )}
                  <div className="dropdown-divider"></div>
                  <button onClick={() => { setDropdownOpen(false); logout(); }} className="logout-btn">
                    <LogOut size={16} /> Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary-sm">
              <UserIcon size={16} style={{ marginRight: '6px' }} />
              Ingresar
            </Link>
          )}

          {/* Botón móvil hamburguesa */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Abrir menú móvil"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <div className="mobile-nav-search">
            <input
              type="text"
              placeholder="Buscar celulares..."
              value={searchTerm || ''}
              onChange={handleSearchInput}
            />
          </div>
          <Link to="/" className="mobile-nav-link">Catálogo</Link>
          <Link to="/track" className="mobile-nav-link">Rastrear Pedido</Link>
          {isAdmin && <Link to="/admin" className="mobile-nav-link">Panel Admin</Link>}
          {isAuthenticated ? (
            <>
              <Link to="/account" className="mobile-nav-link">Mi Perfil y Órdenes</Link>
              <button onClick={logout} className="mobile-nav-link" style={{ textAlign: 'left', background: 'none', border: 'none', color: '#ef4444' }}>
                Cerrar Sesión
              </button>
            </>
          ) : (
            <Link to="/login" className="mobile-nav-link">Iniciar Sesión / Registrarse</Link>
          )}
        </div>
      )}
    </header>
  );
}
