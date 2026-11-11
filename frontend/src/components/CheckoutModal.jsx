import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, CreditCard, Shield, Truck, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { formatCOP } from '../utils/formatters';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import apiClient from '../api/client';

export default function CheckoutModal() {
  const { isCheckoutOpen, closeCheckout, items, subtotal, shippingCost, tax, total, coupon, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    city: 'Bogotá D.C.',
    postal_code: '110111',
    payment_method: 'pse',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Autocompletar datos del usuario si está logueado
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        customer_name: user.full_name || prev.customer_name,
        customer_email: user.email || prev.customer_email,
        customer_phone: user.phone_number || prev.customer_phone,
        shipping_address: user.address || prev.shipping_address,
      }));
    }
  }, [user]);

  if (!isCheckoutOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (items.length === 0) {
      setErrorMessage('No hay productos en el carrito');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim(),
        customer_phone: formData.customer_phone.trim(),
        shipping_address: formData.shipping_address.trim(),
        city: formData.city.trim(),
        postal_code: formData.postal_code?.trim() || null,
        payment_method: formData.payment_method,
        coupon_code: coupon ? coupon.code : null,
        items: items.map((i) => ({
          phone_id: i.id,
          quantity: i.quantity,
        })),
      };

      const response = await apiClient.post('/orders', payload);
      setCreatedOrder(response.data);
      clearCart();
      showToast('¡Compra procesada con éxito!', 'success', 5000);
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al procesar el pago. Intenta de nuevo.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyOrderNumber = () => {
    if (createdOrder?.order_number) {
      navigator.clipboard.writeText(createdOrder.order_number);
      showToast('Código de orden copiado al portapapeles', 'info');
    }
  };

  const handleGoToTracking = () => {
    const ord = createdOrder?.order_number;
    closeCheckout();
    setCreatedOrder(null);
    navigate(`/track?order=${ord}`);
  };

  return (
    <div className="modal-backdrop open" onClick={closeCheckout}>
      <div className="modal-card modal-checkout glass" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close-btn"
          onClick={() => {
            closeCheckout();
            setCreatedOrder(null);
          }}
          aria-label="Cerrar checkout"
        >
          <X size={20} />
        </button>

        {createdOrder ? (
          /* Pantalla de Confirmación de Éxito */
          <div className="checkout-success-view">
            <div className="success-icon-wrap">
              <CheckCircle size={64} color="#10b981" />
            </div>
            <h2>¡Recibimos tu pedido!</h2>
            <p className="success-subtitle">
              Esta versión local registra el pedido, pero no procesa cobros ni emite una factura.
            </p>

            <div className="order-number-card">
              <span>NÚMERO DE ORDEN</span>
              <div className="order-number-display">
                <strong>{createdOrder.order_number}</strong>
                <button onClick={handleCopyOrderNumber} className="btn-icon" title="Copiar código">
                  <Copy size={16} />
                </button>
              </div>
              <small>Consérvalo para rastrear el despacho de tu celular.</small>
            </div>

            <div className="order-details-summary">
              <div className="summary-item">
                <span>Destino:</span>
                <strong>{createdOrder.shipping_address}, {createdOrder.city}</strong>
              </div>
              <div className="summary-item">
                <span>Método de pago:</span>
                <strong style={{ textTransform: 'uppercase' }}>{createdOrder.payment_method}</strong>
              </div>
              <div className="summary-item">
                <span>Total del pedido:</span>
                <strong className="text-primary-color">{formatCOP(createdOrder.total)}</strong>
              </div>
            </div>

            <div className="success-actions">
              <button className="btn-primary" onClick={handleGoToTracking}>
                <ExternalLink size={16} style={{ marginRight: '6px' }} />
                Rastrear Estado del Envío
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  closeCheckout();
                  setCreatedOrder(null);
                  navigate('/');
                }}
              >
                Volver a la Tienda
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Checkout */
          <div className="checkout-layout">
            <div className="checkout-form-col">
              <h3>Finalizar Compra</h3>
              <p className="checkout-subtitle">Ingresa los datos para la entrega y facturación en Colombia</p>

              {errorMessage && (
                <div className="alert-box alert-error">
                  <AlertCircle size={18} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="checkout-form">
                <div className="form-group">
                  <label htmlFor="customer_name">Nombre Completo *</label>
                  <input
                    type="text"
                    id="customer_name"
                    name="customer_name"
                    required
                    value={formData.customer_name}
                    onChange={handleChange}
                    placeholder="Ej. Juan Pérez González"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="customer_email">Correo Electrónico *</label>
                    <input
                      type="email"
                      id="customer_email"
                      name="customer_email"
                      required
                      value={formData.customer_email}
                      onChange={handleChange}
                      placeholder="nombre@correo.com"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customer_phone">Celular / Teléfono *</label>
                    <input
                      type="tel"
                      id="customer_phone"
                      name="customer_phone"
                      required
                      value={formData.customer_phone}
                      onChange={handleChange}
                      placeholder="+57 300 123 4567"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="shipping_address">Dirección de Entrega *</label>
                  <input
                    type="text"
                    id="shipping_address"
                    name="shipping_address"
                    required
                    value={formData.shipping_address}
                    onChange={handleChange}
                    placeholder="Calle, Carrera, Edificio, Apto..."
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">Ciudad / Municipio *</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Bogotá, Medellín, Cali..."
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="postal_code">Código Postal</label>
                    <input
                      type="text"
                      id="postal_code"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      placeholder="110111"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Método de Pago *</label>
                  <div className="payment-methods-grid">
                    <label className={`payment-method-option ${formData.payment_method === 'pse' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="pse"
                        checked={formData.payment_method === 'pse'}
                        onChange={handleChange}
                      />
                      <span>PSE (Cuentas de Ahorros)</span>
                    </label>

                    <label className={`payment-method-option ${formData.payment_method === 'nequi' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="nequi"
                        checked={formData.payment_method === 'nequi'}
                        onChange={handleChange}
                      />
                      <span>Nequi / Daviplata</span>
                    </label>

                    <label className={`payment-method-option ${formData.payment_method === 'credit_card' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="credit_card"
                        checked={formData.payment_method === 'credit_card'}
                        onChange={handleChange}
                      />
                      <span>Tarjeta Débito / Crédito</span>
                    </label>

                    <label className={`payment-method-option ${formData.payment_method === 'cash_on_delivery' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="cash_on_delivery"
                        checked={formData.payment_method === 'cash_on_delivery'}
                        onChange={handleChange}
                      />
                      <span>Pago Contra Entrega</span>
                    </label>
                  </div>
                </div>

                <button type="submit" className="btn-primary btn-submit-order" disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Procesando Compra...'
                  ) : (
                    <>
                      <Shield size={18} style={{ marginRight: '8px' }} />
                      Confirmar Compra ({formatCOP(total)})
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Columna Resumen del Pedido */}
            <div className="checkout-summary-col">
              <h4>Resumen del Pedido</h4>
              <div className="checkout-items-scroll">
                {items.map((item) => (
                  <div key={item.id} className="checkout-item-preview">
                    <img src={item.image_url} alt={item.name} />
                    <div className="preview-details">
                      <strong>{item.name}</strong>
                      <small>{item.color} · Cant: {item.quantity}</small>
                      <span>{formatCOP(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="checkout-totals-box">
                <div className="row">
                  <span>Subtotal:</span>
                  <span>{formatCOP(subtotal)}</span>
                </div>
                {coupon && (
                  <div className="row discount">
                    <span>Cupón ({coupon.code}):</span>
                    <span>-{formatCOP(total - subtotal - shippingCost - tax)}</span>
                  </div>
                )}
                <div className="row">
                  <span>Envío:</span>
                  <span>{shippingCost === 0 ? <strong style={{ color: '#10b981' }}>GRATIS</strong> : formatCOP(shippingCost)}</span>
                </div>
                <div className="row">
                  <span>IVA (19%):</span>
                  <span>{formatCOP(tax)}</span>
                </div>
                <div className="row grand-total">
                  <span>Total a Pagar:</span>
                  <span className="total-val">{formatCOP(total)}</span>
                </div>
              </div>

              <div className="secure-badge">
                <Shield size={16} color="#10b981" />
                <span>Demo local: no se ha realizado ningún cobro</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
