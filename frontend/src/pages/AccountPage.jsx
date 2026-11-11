import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCOP, formatDate } from '../utils/formatters';
import {
  User,
  Package,
  Save,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  Mail
} from 'lucide-react';

export default function AccountPage() {
  const { user, updateProfile, deleteAccount, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'profile'
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Formulario de edición
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [address, setAddress] = useState(user?.address || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Cargar pedidos del usuario
  useEffect(() => {
    async function fetchUserOrders() {
      setLoadingOrders(true);
      try {
        const response = await apiClient.get('/orders/my-orders');
        setOrders(response.data || []);
      } catch (err) {
        console.error('Error al cargar órdenes del usuario:', err);
      } finally {
        setLoadingOrders(false);
      }
    }
    fetchUserOrders();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim() || null,
        address: address.trim() || null,
      });
    } catch (err) {
      // Toast gestionado por el contexto
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccountConfirm = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar permanentemente tu cuenta? Esta acción no se puede deshacer.')) {
      try {
        await deleteAccount();
      } catch (err) {
        // Toast gestionado
      }
    }
  };

  return (
    <div className="account-page-container">
      {/* Cabecera del perfil */}
      <div className="account-header-card glass">
        <div className="account-avatar-large">
          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
        </div>
        <div className="account-user-meta">
          <h2>{user?.full_name}</h2>
          <p>{user?.email}</p>
          <div className="account-badges">
            <span className="badge badge-verified">
              <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Cuenta Verificada
            </span>
            {user?.is_admin && <span className="badge badge-admin">Administrador</span>}
          </div>
        </div>
      </div>

      {/* Tabs de Cuenta */}
      <div className="account-tabs-bar">
        <button
          className={`account-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <Package size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Mis Compras ({orders.length})
        </button>
        <button
          className={`account-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={18} style={{ display: 'inline', marginRight: '6px' }} />
          Datos Personales
        </button>
      </div>

      {/* Tab: Mis Compras */}
      {activeTab === 'orders' && (
        <div className="account-content-pane">
          {loadingOrders ? (
            <div className="account-loading-box">
              <div className="spinner"></div>
              <p>Consultando tu historial de compras...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="account-empty-state glass">
              <Package size={48} color="#6b7280" />
              <h3>Aún no has realizado ninguna compra</h3>
              <p>Elige tu smartphone preferido en nuestro catálogo y recíbelo en tu hogar.</p>
              <Link to="/" className="btn-primary">Ver Celulares</Link>
            </div>
          ) : (
            <div className="account-orders-list">
              {orders.map((ord) => (
                <div key={ord.id} className="user-order-card glass">
                  <div className="user-order-header">
                    <div>
                      <span className="order-number-label">ORDEN</span>
                      <h3>{ord.order_number}</h3>
                      <small>Fecha: {formatDate(ord.created_at)}</small>
                    </div>

                    <div className="user-order-header-right">
                      <span className={`status-pill status-${ord.status}`}>
                        {ord.status === 'processing' && 'En preparación'}
                        {ord.status === 'shipped' && 'En camino'}
                        {ord.status === 'delivered' && 'Entregado'}
                        {ord.status === 'cancelled' && 'Cancelado'}
                        {ord.status === 'pending' && 'Pendiente'}
                      </span>
                      <Link to={`/track?order=${ord.order_number}`} className="btn-track-sm">
                        <ExternalLink size={14} style={{ marginRight: '4px' }} />
                        Rastrear
                      </Link>
                    </div>
                  </div>

                  <div className="user-order-items-table">
                    {ord.items.map((item) => (
                      <div key={item.id} className="user-order-item-row">
                        <div>
                          <strong>{item.phone_name}</strong>
                          <small>{item.phone_color} · {item.phone_storage} · Cant: {item.quantity}</small>
                        </div>
                        <div className="user-order-item-price">
                          {formatCOP(item.subtotal)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="user-order-footer">
                    <div>
                      <span className="destination-text">
                        <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                        Entrega en: {ord.shipping_address}, {ord.city}
                      </span>
                    </div>
                    <div className="user-order-total-box">
                      <span>Total:</span>
                      <strong>{formatCOP(ord.total)}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Datos Personales */}
      {activeTab === 'profile' && (
        <div className="account-content-pane">
          <div className="profile-edit-card glass">
            <h3>Actualizar Información de Contacto</h3>
            <p className="profile-subtitle">Estos datos se usarán por defecto para agilizar tus compras.</p>

            <form onSubmit={handleUpdateProfile} className="profile-edit-form">
              <div className="form-group">
                <label>Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Correo Electrónico (No modificable)</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="input-disabled"
                />
              </div>

              <div className="form-group">
                <label>Celular / Teléfono</label>
                <input
                  type="tel"
                  placeholder="+57 300 123 4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Dirección de Entrega</label>
                <input
                  type="text"
                  placeholder="Calle, Carrera, Barrio, Apto..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={isUpdating}>
                <Save size={16} style={{ marginRight: '6px' }} />
                {isUpdating ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>

            <div className="profile-danger-zone">
              <div className="danger-zone-title">
                <ShieldAlert size={18} color="#ef4444" />
                <h4>Zona de Peligro</h4>
              </div>
              <p>Eliminar permanentemente tu cuenta de usuario y tus preferencias guardadas.</p>
              <button onClick={handleDeleteAccountConfirm} className="btn-danger-outline">
                <Trash2 size={16} style={{ marginRight: '6px' }} />
                Eliminar Mi Cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
