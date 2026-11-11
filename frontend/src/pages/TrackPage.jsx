import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { formatCOP, formatDate } from '../utils/formatters';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  CreditCard,
  AlertCircle
} from 'lucide-react';

export default function TrackPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('order') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const performSearch = async (num) => {
    if (!num || !num.trim()) {
      setError('Por favor ingresa un número de orden válido');
      return;
    }
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const response = await apiClient.get(`/orders/track/${num.trim().toUpperCase()}`);
      setOrder(response.data);
      setSearchParams({ order: num.trim().toUpperCase() });
    } catch (err) {
      setError('No encontramos ninguna orden con este código. Revisa que esté bien escrito (ej: ORD-A1B2C3D4).');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = searchParams.get('order');
    if (q) {
      setOrderNumber(q);
      performSearch(q);
    }
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    performSearch(orderNumber);
  };

  // Determinar paso activo en el stepper
  const getStepStatus = (stepName) => {
    if (!order) return 'upcoming';
    const status = order.status; // pending, processing, shipped, delivered, cancelled
    if (status === 'cancelled') return 'cancelled';

    const orderStages = ['pending', 'processing', 'shipped', 'delivered'];
    const currentIndex = orderStages.indexOf(status);
    const stepIndex = orderStages.indexOf(stepName);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="track-page-container">
      <div className="track-hero-box glass">
        <Package size={42} color="#818cf8" />
        <h1>Rastreo de Envíos en Colombia</h1>
          <p>Ingresa tu número de orden para consultar el estado y resumen de tu pedido.</p>

        <form onSubmit={handleSearchSubmit} className="track-search-form">
          <div className="track-input-wrap">
            <Search size={20} color="#9ca3af" />
            <input
              type="text"
              placeholder="Ej: ORD-XXXXXXXX"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Consultando...' : 'Rastrear'}
          </button>
        </form>
      </div>

      {error && (
        <div className="track-error-card glass">
          <AlertCircle size={24} color="#ef4444" />
          <p>{error}</p>
        </div>
      )}

      {order && (
        <div className="track-results-card glass">
          {/* Cabecera del resultado */}
          <div className="track-result-header">
            <div>
              <span className="order-tag">ORDEN DE COMPRA</span>
              <h2>{order.order_number}</h2>
              <small>Realizada el {formatDate(order.created_at)}</small>
            </div>
            <div className={`status-badge-lg status-${order.status}`}>
              {order.status === 'pending' && 'Pendiente de Pago'}
              {order.status === 'processing' && 'En Preparación'}
              {order.status === 'shipped' && 'En Camino'}
              {order.status === 'delivered' && 'Entregado'}
              {order.status === 'cancelled' && 'Cancelado'}
            </div>
          </div>

          {/* Stepper Visual */}
          {order.status !== 'cancelled' ? (
            <div className="order-stepper">
              <div className={`step-item ${getStepStatus('pending')}`}>
                <div className="step-icon"><Clock size={18} /></div>
                <div className="step-label">
                  <strong>Recibido</strong>
                  <small>Orden creada</small>
                </div>
              </div>

              <div className="step-connector"></div>

              <div className={`step-item ${getStepStatus('processing')}`}>
                <div className="step-icon"><Package size={18} /></div>
                <div className="step-label">
                  <strong>Preparando</strong>
                  <small>Empaque y verificación</small>
                </div>
              </div>

              <div className="step-connector"></div>

              <div className={`step-item ${getStepStatus('shipped')}`}>
                <div className="step-icon"><Truck size={18} /></div>
                <div className="step-label">
                  <strong>En Tránsito</strong>
                  <small>Despachado con transportadora</small>
                </div>
              </div>

              <div className="step-connector"></div>

              <div className={`step-item ${getStepStatus('delivered')}`}>
                <div className="step-icon"><CheckCircle2 size={18} /></div>
                <div className="step-label">
                  <strong>Entregado</strong>
                  <small>Recibido en destino</small>
                </div>
              </div>
            </div>
          ) : (
            <div className="order-cancelled-banner">
              <XCircle size={24} color="#ef4444" />
              <span>Esta orden fue cancelada. Si tienes preguntas, contacta a soporte.</span>
            </div>
          )}

          {/* Información del Cliente y Entrega */}
          <div className="track-info-grid">
            <div className="track-info-box">
              <div className="box-title">
                <MapPin size={18} color="#818cf8" />
                <h4>Ciudad de Entrega</h4>
              </div>
              <p>{order.city}, Colombia</p>
            </div>

            <div className="track-info-box">
              <div className="box-title">
                <CreditCard size={18} color="#818cf8" />
                <h4>Pago y Facturación</h4>
              </div>
              <p><strong>Método:</strong> <span style={{ textTransform: 'uppercase' }}>{order.payment_method}</span></p>
              <p><strong>Estado de pago:</strong> {order.payment_status === 'completed' ? 'Aprobado ✓' : order.payment_status}</p>
              <p><strong>Subtotal:</strong> {formatCOP(order.subtotal)}</p>
              {order.discount_amount > 0 && <p style={{ color: '#10b981' }}><strong>Descuento cupón:</strong> -{formatCOP(order.discount_amount)}</p>}
              <p><strong>Envío:</strong> {order.shipping_cost === 0 ? 'Gratis' : formatCOP(order.shipping_cost)}</p>
              <p><strong>IVA (19%):</strong> {formatCOP(order.tax)}</p>
              <p className="track-total-highlight"><strong>Total:</strong> {formatCOP(order.total)}</p>
            </div>
          </div>

          {/* Productos en la Orden */}
          <div className="track-items-box">
            <h4>Artículos en este envío ({order.items.length})</h4>
            <div className="track-items-table">
              {order.items.map((item) => (
                <div key={item.id} className="track-item-row">
                  <div className="track-item-info">
                    <strong>{item.phone_name}</strong>
                    <small>{item.phone_color} · {item.phone_storage}</small>
                  </div>
                  <div className="track-item-qty">
                    Cant: {item.quantity}
                  </div>
                  <div className="track-item-price">
                    {formatCOP(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
