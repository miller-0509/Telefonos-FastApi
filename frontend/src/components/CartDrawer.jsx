import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, CheckCircle2 } from 'lucide-react';
import { formatCOP } from '../utils/formatters';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const {
    items,
    isCartOpen,
    closeCart,
    openCheckout,
    updateQuantity,
    removeFromCart,
    subtotal,
    shippingCost,
    total,
    coupon,
    couponDiscount,
    isCouponLoading,
    applyCoupon,
    removeCoupon
  } = useCart();

  const [couponInput, setCouponInput] = useState('');

  if (!isCartOpen) return null;

  const freeShippingThreshold = 1200000;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  const handleApplyCoupon = (e) => {
    e.preventDefault();
    applyCoupon(couponInput);
  };

  return (
    <div className="drawer-backdrop open" onClick={closeCart}>
      <aside className="cart-drawer glass" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="cart-drawer-header">
          <div className="cart-header-title">
            <ShoppingBag size={20} color="#818cf8" />
            <h3>Tu Carrito ({items.reduce((acc, i) => acc + i.quantity, 0)})</h3>
          </div>
          <button className="drawer-close-btn" onClick={closeCart} aria-label="Cerrar carrito">
            <X size={20} />
          </button>
        </div>

        {/* Barra de progreso de envío gratis */}
        {subtotal > 0 && (
          <div className="shipping-progress-banner">
            {remainingForFreeShipping > 0 ? (
              <p>
                Agrega <strong>{formatCOP(remainingForFreeShipping)}</strong> más para obtener <strong>Envío Gratis</strong>
              </p>
            ) : (
              <p className="free-shipping-success">
                <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '4px' }} />
                ¡Felicidades! Tienes <strong>Envío Gratis</strong> en tu orden
              </p>
            )}
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        )}

        {/* Lista de productos */}
        <div className="cart-items-container">
          {items.length === 0 ? (
            <div className="cart-empty-state">
              <ShoppingBag size={54} color="#6b7280" />
              <h4>Tu carrito está vacío</h4>
              <p>Explora nuestro catálogo con los mejores celulares del mercado.</p>
              <button className="btn-primary" onClick={closeCart}>
                Explorar Catálogo
              </button>
            </div>
          ) : (
            <div className="cart-items-list">
              {items.map((item) => (
                <div key={item.id} className="cart-item-row">
                  <img src={item.image_url} alt={item.name} className="cart-item-thumb" />

                  <div className="cart-item-details">
                    <div className="cart-item-title-row">
                      <h4 className="cart-item-name">{item.name}</h4>
                      <button
                        className="btn-remove-item"
                        onClick={() => removeFromCart(item.id)}
                        title="Eliminar producto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="cart-item-meta">
                      {item.color} · {item.storage_gb} GB
                    </div>

                    <div className="cart-item-controls-row">
                      <div className="quantity-controls">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Disminuir cantidad"
                        >
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          aria-label="Aumentar cantidad"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="cart-item-prices">
                        <div className="cart-item-price-total">
                          {formatCOP(item.price * item.quantity)}
                        </div>
                        {item.quantity > 1 && (
                          <div className="cart-item-price-unit">
                            {formatCOP(item.price)} c/u
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer del Carrito */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            {/* Cupón */}
            <div className="coupon-box">
              {coupon ? (
                <div className="applied-coupon-row">
                  <div className="applied-coupon-badge">
                    <Tag size={14} />
                    <span>{coupon.code}</span>
                    <strong>-{formatCOP(couponDiscount)}</strong>
                  </div>
                  <button onClick={removeCoupon} className="btn-text-danger">
                    Quitar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="coupon-form">
                  <input
                    type="text"
                    placeholder="Código de cupón (ej: BIENVENIDO10)"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  />
                  <button type="submit" disabled={isCouponLoading || !couponInput.trim()}>
                    {isCouponLoading ? '...' : 'Aplicar'}
                  </button>
                </form>
              )}
            </div>

            {/* Resumen de totales */}
            <div className="cart-summary-breakdown">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatCOP(subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="summary-row discount-row">
                  <span>Descuento cupón</span>
                  <span>-{formatCOP(couponDiscount)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Envío estimado</span>
                <span>{shippingCost === 0 ? <strong style={{ color: '#10b981' }}>GRATIS</strong> : formatCOP(shippingCost)}</span>
              </div>
              <div className="summary-row total-row">
                <span>Total estimado (con IVA)</span>
                <span className="total-amount">{formatCOP(total)}</span>
              </div>
            </div>

            {/* Botón de Checkout */}
            <button className="btn-checkout" onClick={openCheckout}>
              <span>Proceder al Pago</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
