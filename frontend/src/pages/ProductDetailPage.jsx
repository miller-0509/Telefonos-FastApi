import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { formatCOP, formatDate } from '../utils/formatters';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Star,
  ShoppingCart,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Cpu,
  Smartphone,
  Battery,
  Camera,
  Layers,
  Heart,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [phone, setPhone] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // Formulario de nueva reseña
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    async function fetchPhoneData() {
      setLoading(true);
      setError(null);
      try {
        const phoneRes = await apiClient.get(`/phones/${slug}`);
        setPhone(phoneRes.data);

        // Cargar reseñas del teléfono
        const reviewsRes = await apiClient.get(`/phones/${phoneRes.data.id}/reviews`);
        setReviews(reviewsRes.data.data || []);
      } catch (err) {
        console.error('Error al cargar producto:', err);
        setError('No pudimos encontrar este smartphone o ya no está disponible.');
      } finally {
        setLoading(false);
      }
    }
    fetchPhoneData();
  }, [slug]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Debes iniciar sesión para dejar una reseña', 'warning');
      return;
    }
    if (!user.is_verified) {
      showToast('Debes verificar tu correo para poder comentar', 'warning');
      return;
    }
    if (commentInput.trim().length < 3) {
      showToast('El comentario debe tener al menos 3 caracteres', 'warning');
      return;
    }

    setSubmittingReview(true);
    try {
      const response = await apiClient.post(`/phones/${phone.id}/reviews`, {
        rating: ratingInput,
        comment: commentInput.trim(),
      });
      setReviews((prev) => [response.data, ...prev]);
      setCommentInput('');
      setRatingInput(5);
      showToast('¡Gracias por tu reseña!', 'success');
      // Actualizar el rating del teléfono
      const updatedPhoneRes = await apiClient.get(`/phones/${phone.id}`);
      setPhone(updatedPhoneRes.data);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Error al publicar la reseña';
      showToast(msg, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-loading">
        <div className="spinner"></div>
        <p>Cargando información del smartphone...</p>
      </div>
    );
  }

  if (error || !phone) {
    return (
      <div className="product-detail-error glass">
        <AlertCircle size={48} color="#ef4444" />
        <h2>Producto no encontrado</h2>
        <p>{error || 'El producto que buscas no existe en el catálogo.'}</p>
        <Link to="/" className="btn-primary">Volver al Catálogo</Link>
      </div>
    );
  }

  const currentPrice = phone.discount_price && phone.discount_price > 0 ? phone.discount_price : phone.price;
  const hasDiscount = phone.discount_price && phone.discount_price > 0 && phone.discount_price < phone.price;
  const discountPercent = hasDiscount
    ? Math.round(((phone.price - phone.discount_price) / phone.price) * 100)
    : 0;

  return (
    <div className="product-detail-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb-nav">
        <Link to="/">Inicio</Link>
        <span>/</span>
        <Link to={`/?brand=${phone.brand?.slug || ''}`}>{phone.brand?.name || 'Smartphones'}</Link>
        <span>/</span>
        <span className="breadcrumb-current">{phone.name}</span>
      </nav>

      {/* Hero del Producto: Imagen + Compra */}
      <div className="product-hero-card glass">
        <div className="product-hero-gallery">
          <div className="gallery-main-frame">
            <img src={phone.image_url} alt={phone.name} className="gallery-main-img" />
          </div>
          {phone.is_5g && <span className="gallery-badge-5g">Red 5G Ultra Rápida</span>}
        </div>

        <div className="product-hero-details">
          <div className="product-hero-brand">{phone.brand?.name}</div>
          <h1 className="product-hero-title">{phone.name}</h1>

          {/* Rating */}
          <div className="product-hero-rating">
            <div className="stars">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < Math.floor(phone.rating) ? '#f59e0b' : 'none'}
                  color="#f59e0b"
                />
              ))}
            </div>
            <span className="rating-score">{phone.rating.toFixed(1)}</span>
            <span className="rating-separator">·</span>
            <a href="#reviews-section" className="rating-link">{reviews.length} reseñas de clientes</a>
          </div>

          {/* Precios en COP */}
          <div className="product-hero-pricing">
            <div className="hero-price-current">{formatCOP(currentPrice)}</div>
            {hasDiscount && (
              <div className="hero-price-discount-box">
                <span className="hero-price-original">{formatCOP(phone.price)}</span>
                <span className="hero-badge-discount">Ahorras {discountPercent}%</span>
              </div>
            )}
            <small className="hero-vat-note">Precio final con IVA (19%) incluido</small>
          </div>

          <p className="product-hero-description">{phone.description}</p>

          {/* Selector de color y almacenamiento */}
          <div className="product-variants-summary">
            <div className="variant-row">
              <span className="variant-label">Color:</span>
              <strong className="variant-val">{phone.color}</strong>
            </div>
            <div className="variant-row">
              <span className="variant-label">Almacenamiento:</span>
              <strong className="variant-val">{phone.storage_gb} GB</strong>
            </div>
            <div className="variant-row">
              <span className="variant-label">RAM:</span>
              <strong className="variant-val">{phone.ram_gb} GB</strong>
            </div>
          </div>

          {/* Stock y Compra */}
          <div className="product-purchase-box">
            <div className="stock-indicator">
              {phone.stock > 0 ? (
                <span className="stock-in">
                  <Check size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {phone.stock <= 5 ? `¡Últimas ${phone.stock} unidades disponibles!` : 'Disponible para despacho inmediato'}
                </span>
              ) : (
                <span className="stock-out">Agotado temporalmente</span>
              )}
            </div>

            {phone.stock > 0 && (
              <div className="purchase-controls-row">
                <div className="quantity-selector">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span>{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(phone.stock, q + 1))}
                    disabled={quantity >= phone.stock}
                  >
                    +
                  </button>
                </div>

                <button
                  className="btn-primary btn-add-main"
                  onClick={() => addToCart(phone, quantity)}
                >
                  <ShoppingCart size={18} style={{ marginRight: '8px' }} />
                  Agregar al Carrito ({formatCOP(currentPrice * quantity)})
                </button>
              </div>
            )}
          </div>

          {/* Garantías y entrega */}
          <div className="product-guarantees-grid">
            <div className="guarantee-item">
              <Truck size={18} color="#818cf8" />
              <span>Envío seguro a toda Colombia con rastreo en vivo</span>
            </div>
            <div className="guarantee-item">
              <ShieldCheck size={18} color="#10b981" />
              <span>Garantía de 12 meses directamente con la marca</span>
            </div>
            <div className="guarantee-item">
              <RotateCcw size={18} color="#06b6d4" />
              <span>Devoluciones sin complicaciones dentro de los primeros 10 días</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ficha Técnica Detallada */}
      <section className="product-specs-section glass">
        <h2 className="specs-section-title">
          <Layers size={22} color="#818cf8" style={{ marginRight: '8px' }} />
          Especificaciones Técnicas Completas
        </h2>

        <div className="specs-detailed-grid">
          <div className="spec-card">
            <div className="spec-card-icon"><Cpu size={24} color="#818cf8" /></div>
            <div className="spec-card-body">
              <h4>Procesador y Rendimiento</h4>
              <p><strong>CPU:</strong> {phone.processor || 'Chip de última generación'}</p>
              <p><strong>Memoria RAM:</strong> {phone.ram_gb} GB LPDDR5X</p>
              <p><strong>Almacenamiento:</strong> {phone.storage_gb} GB de alta velocidad</p>
            </div>
          </div>

          <div className="spec-card">
            <div className="spec-card-icon"><Smartphone size={24} color="#06b6d4" /></div>
            <div className="spec-card-body">
              <h4>Pantalla & Visualización</h4>
              <p><strong>Tamaño:</strong> {phone.screen_size ? `${phone.screen_size} pulgadas` : '6.7"'}</p>
              <p><strong>Panel:</strong> {phone.screen_type || 'Super AMOLED / OLED 120Hz'}</p>
              <p><strong>Conectividad:</strong> {phone.is_5g ? '5G Ultra Rápida + Wi-Fi 6E' : '4G LTE'}</p>
            </div>
          </div>

          <div className="spec-card">
            <div className="spec-card-icon"><Camera size={24} color="#ec4899" /></div>
            <div className="spec-card-body">
              <h4>Sistema de Cámaras</h4>
              <p><strong>Cámara Principal:</strong> {phone.main_camera_mp || 50} MP con OIS y modo noche</p>
              <p><strong>Cámara Frontal:</strong> {phone.front_camera_mp || 12} MP HDR para selfies</p>
              <p><strong>Video:</strong> Grabación hasta 4K / 8K con estabilización óptica</p>
            </div>
          </div>

          <div className="spec-card">
            <div className="spec-card-icon"><Battery size={24} color="#10b981" /></div>
            <div className="spec-card-body">
              <h4>Batería y Sistema Operativo</h4>
              <p><strong>Capacidad:</strong> {phone.battery_mah ? `${phone.battery_mah} mAh` : 'Autonomía de todo el día'}</p>
              <p><strong>Sistema Operativo:</strong> {phone.os || 'Android / iOS'}</p>
              <p><strong>Modelo:</strong> {phone.model_code || 'Versión Global Homologada'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de Reseñas */}
      <section className="product-reviews-section glass" id="reviews-section">
        <div className="reviews-header">
          <div className="reviews-title-wrap">
            <MessageSquare size={22} color="#818cf8" />
            <h2>Opiniones y Calificaciones</h2>
          </div>
          <div className="reviews-score-badge">
            <span className="big-score">{phone.rating.toFixed(1)}</span>
            <div className="score-stars">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < Math.floor(phone.rating) ? '#f59e0b' : 'none'}
                  color="#f59e0b"
                />
              ))}
              <small>{reviews.length} opiniones</small>
            </div>
          </div>
        </div>

        {/* Formulario de nueva reseña */}
        <div className="add-review-box glass">
          <h3>Deja tu reseña sobre este smartphone</h3>
          {!isAuthenticated ? (
            <p className="review-auth-hint">
              <Link to="/login" state={{ from: `/phone/${slug}` }}>Inicia sesión</Link> para compartir tu experiencia de compra.
            </p>
          ) : !user.is_verified ? (
            <p className="review-auth-hint" style={{ color: '#f59e0b' }}>
              Debes verificar tu cuenta de correo electrónico antes de dejar una calificación.
            </p>
          ) : (
            <form onSubmit={handleAddReview} className="add-review-form">
              <div className="rating-select-row">
                <label>Calificación:</label>
                <div className="interactive-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setRatingInput(s)}
                      className="star-btn"
                    >
                      <Star
                        size={22}
                        fill={s <= ratingInput ? '#f59e0b' : 'none'}
                        color="#f59e0b"
                      />
                    </button>
                  ))}
                  <span className="selected-star-text">{ratingInput} de 5 estrellas</span>
                </div>
              </div>

              <div className="form-group">
                <textarea
                  rows="3"
                  placeholder="¿Qué tal te pareció el rendimiento, la cámara y la batería?"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn-primary" disabled={submittingReview}>
                {submittingReview ? 'Publicando...' : 'Publicar Reseña'}
              </button>
            </form>
          )}
        </div>

        {/* Listado de comentarios */}
        <div className="reviews-list">
          {reviews.length === 0 ? (
            <p className="no-reviews-msg">Aún no hay reseñas para este teléfono. ¡Sé el primero en calificarlo!</p>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="review-card glass">
                <div className="review-card-header">
                  <div className="reviewer-avatar">
                    {rev.user_name ? rev.user_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="reviewer-meta">
                    <strong>{rev.user_name}</strong>
                    <small>{formatDate(rev.created_at)}</small>
                  </div>
                  <div className="review-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < rev.rating ? '#f59e0b' : 'none'}
                        color="#f59e0b"
                      />
                    ))}
                  </div>
                </div>
                <p className="review-comment">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
