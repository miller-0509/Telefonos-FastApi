import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Star, Heart, Check, Cpu, HardDrive, Battery, ShoppingCart } from 'lucide-react';
import { formatCOP } from '../utils/formatters';
import { useCart } from '../context/CartContext';

// Mapa de colores por marca (coincide con la referencia)
const BRAND_COLORS = {
  apple:    '#38bdf8',
  samsung:  '#22d3ee',
  xiaomi:   '#f97316',
  google:   '#60a5fa',
  oneplus:  '#f87171',
  motorola: '#a78bfa',
  oppo:     '#34d399',
  realme:   '#fb923c',
  huawei:   '#4ade80',
  sony:     '#818cf8',
};

function getBrandColor(brandName) {
  if (!brandName) return '#94a3b8';
  return BRAND_COLORS[brandName.toLowerCase()] || '#94a3b8';
}

export default function PhoneCard({ phone, onOpenQuickSpec, isFavorite, onToggleFavorite }) {
  const { addToCart } = useCart();

  const hasDiscount = phone.discount_price && phone.discount_price > 0 && phone.discount_price < phone.price;
  const discountPercent = hasDiscount
    ? Math.round(((phone.price - phone.discount_price) / phone.price) * 100)
    : 0;

  const brandColor = getBrandColor(phone.brand?.name);

  return (
    <div className="product-card">

      {/* ─── Imagen ─── */}
      <Link to={`/phone/${phone.slug}`} className="product-card-img-wrap">
        {/* Badges sobre la imagen */}
        <div className="product-card-badges">
          {phone.is_5g && <span className="badge badge-5g">5G</span>}
          {phone.is_featured && <span className="badge badge-featured">DESTACADO</span>}
          {hasDiscount && <span className="badge badge-discount">OFERTA</span>}
        </div>

        {/* Favorito */}
        <button
          className={`btn-fav ${isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(phone.id);
          }}
          title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          aria-label="Favorito"
        >
          <Heart size={15} fill={isFavorite ? '#ef4444' : 'none'} color={isFavorite ? '#ef4444' : '#64748b'} />
        </button>

        <img
          src={phone.image_url}
          alt={phone.name}
          loading="lazy"
          className="product-card-img"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80';
          }}
        />
      </Link>

      {/* ─── Cuerpo ─── */}
      <div className="product-card-body">
        {/* Marca coloreada */}
        <span className="product-brand-tag" style={{ color: brandColor }}>
          {phone.brand?.name?.toUpperCase() || 'SMARTPHONE'}
        </span>

        {/* Nombre */}
        <h3 className="product-title">
          <Link to={`/phone/${phone.slug}`}>{phone.name}</Link>
        </h3>

        {/* Specs chips */}
        <div className="product-specs-chips">
          <span className="spec-chip spec-chip-ram">
            <Cpu size={11} />
            {phone.ram_gb} GB RAM
          </span>
          <span className="spec-chip spec-chip-storage">
            <HardDrive size={11} />
            {phone.storage_gb} GB
          </span>
          {phone.battery_mah && (
            <span className="spec-chip spec-chip-battery">
              <Battery size={11} />
              {phone.battery_mah.toLocaleString()} mAh
            </span>
          )}
        </div>

        {/* Rating */}
        <div className="product-rating">
          <div className="stars">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={12}
                fill={i < Math.floor(phone.rating) ? '#f59e0b' : 'none'}
                color="#f59e0b"
              />
            ))}
          </div>
          <span className="rating-value">{phone.rating.toFixed(1)}</span>
          <span className="rating-count">({phone.rating_count})</span>
        </div>

        {/* Precio */}
        <div className="product-price-section">
          <div className="product-price-wrap">
            {hasDiscount && (
              <span className="price-original">{formatCOP(phone.price)}</span>
            )}
            <span className="price-current">
              {formatCOP(hasDiscount ? phone.discount_price : phone.price)}
            </span>
          </div>

          {/* Botón quick view */}
          <button
            className="btn-quick-view"
            onClick={() => onOpenQuickSpec && onOpenQuickSpec(phone)}
            title="Ver especificaciones"
            aria-label="Ver ficha rápida"
          >
            <Eye size={15} />
          </button>
        </div>

        {/* Stock */}
        {phone.stock <= 5 && phone.stock > 0 && (
          <span className="stock-low">¡Solo {phone.stock} disponibles!</span>
        )}
        {phone.stock <= 0 && (
          <span className="stock-out">Agotado</span>
        )}
      </div>
    </div>
  );
}
