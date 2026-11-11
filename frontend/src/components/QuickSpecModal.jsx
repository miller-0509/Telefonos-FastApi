import React from 'react';
import { Link } from 'react-router-dom';
import { X, Cpu, Smartphone, Battery, Camera, Shield, Check, ShoppingCart } from 'lucide-react';
import { formatCOP } from '../utils/formatters';
import { useCart } from '../context/CartContext';

export default function QuickSpecModal({ phone, onClose }) {
  const { addToCart } = useCart();
  if (!phone) return null;

  const currentPrice = phone.discount_price && phone.discount_price > 0 ? phone.discount_price : phone.price;

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal-card modal-spec glass" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar modal">
          <X size={20} />
        </button>

        <div className="spec-modal-layout">
          <div className="spec-modal-image-col">
            <img src={phone.image_url} alt={phone.name} className="spec-modal-img" />
            <div className="spec-modal-price-box">
              <div className="price-tag">{formatCOP(currentPrice)}</div>
              {phone.discount_price && phone.discount_price < phone.price && (
                <div className="price-tag-sub">Antes: {formatCOP(phone.price)}</div>
              )}
            </div>
          </div>

          <div className="spec-modal-info-col">
            <div className="spec-modal-brand">{phone.brand?.name}</div>
            <h2 className="spec-modal-title">{phone.name}</h2>
            <p className="spec-modal-desc">{phone.description}</p>

            <div className="spec-grid">
              <div className="spec-item">
                <Cpu size={18} color="#818cf8" />
                <div>
                  <strong>Procesador</strong>
                  <span>{phone.processor || 'Alto rendimiento'}</span>
                </div>
              </div>

              <div className="spec-item">
                <Smartphone size={18} color="#818cf8" />
                <div>
                  <strong>Pantalla</strong>
                  <span>{phone.screen_size ? `${phone.screen_size}"` : ''} {phone.screen_type || 'OLED'}</span>
                </div>
              </div>

              <div className="spec-item">
                <Battery size={18} color="#818cf8" />
                <div>
                  <strong>Batería</strong>
                  <span>{phone.battery_mah ? `${phone.battery_mah} mAh` : 'Carga Rápida'}</span>
                </div>
              </div>

              <div className="spec-item">
                <Camera size={18} color="#818cf8" />
                <div>
                  <strong>Cámaras</strong>
                  <span>Ppal: {phone.main_camera_mp || 48}MP | Frontal: {phone.front_camera_mp || 12}MP</span>
                </div>
              </div>

              <div className="spec-item">
                <Shield size={18} color="#818cf8" />
                <div>
                  <strong>Memoria & Storage</strong>
                  <span>{phone.ram_gb} GB RAM + {phone.storage_gb} GB</span>
                </div>
              </div>

              <div className="spec-item">
                <Check size={18} color="#818cf8" />
                <div>
                  <strong>Sistema Operativo</strong>
                  <span>{phone.os || 'Android / iOS'} ({phone.is_5g ? '5G' : '4G LTE'})</span>
                </div>
              </div>
            </div>

            <div className="spec-modal-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  addToCart(phone, 1);
                  onClose();
                }}
                disabled={phone.stock <= 0}
              >
                <ShoppingCart size={18} style={{ marginRight: '8px' }} />
                {phone.stock > 0 ? 'Agregar al Carrito' : 'Agotado'}
              </button>

              <Link
                to={`/phone/${phone.slug}`}
                className="btn-secondary"
                onClick={onClose}
              >
                Ver Ficha Completa & Reseñas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
