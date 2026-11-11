import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../api/client';
import PhoneCard from '../components/PhoneCard';
import QuickSpecModal from '../components/QuickSpecModal';
import { formatCOP } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  SlidersHorizontal,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function HomePage({ globalSearch }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [brands, setBrands] = useState([]);
  const [phones, setPhones] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [maxPrice, setMaxPrice] = useState(Number(searchParams.get('max_price')) || 7000000);
  const [selectedRam, setSelectedRam] = useState(Number(searchParams.get('ram')) || '');
  const [selectedStorage, setSelectedStorage] = useState(Number(searchParams.get('storage')) || '');
  const [is5GOnly, setIs5GOnly] = useState(searchParams.get('is_5g') === 'true');
  const [sortBy, setSortBy] = useState(searchParams.get('sort_by') || 'created_at');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [quickSpecPhone, setQuickSpecPhone] = useState(null);

  useEffect(() => {
    async function loadBrands() {
      try {
        const response = await apiClient.get('/brands');
        setBrands(response.data);
      } catch (err) {
        console.error('Error al cargar marcas:', err);
      }
    }
    loadBrands();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      apiClient.get('/favorites')
        .then((res) => setFavoriteIds(new Set(res.data.map((p) => p.id))))
        .catch(() => {});
    } else {
      setFavoriteIds(new Set());
    }
  }, [isAuthenticated]);

  const fetchPhones = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        skip: (currentPage - 1) * pageSize,
        limit: pageSize,
        sort_by: sortBy,
      };
      if (selectedBrand) {
        const b = brands.find((br) => br.slug === selectedBrand || br.id === Number(selectedBrand));
        if (b) params.brand_id = b.id;
      }
      if (maxPrice && maxPrice < 7000000) params.max_price = maxPrice;
      if (selectedRam)     params.ram_gb     = selectedRam;
      if (selectedStorage) params.storage_gb = selectedStorage;
      if (is5GOnly)        params.is_5g      = true;
      if (globalSearch && globalSearch.trim()) params.search = globalSearch.trim();

      const response = await apiClient.get('/phones', { params });
      setPhones(response.data.data || []);
      setTotalCount(response.data.total || 0);
    } catch (err) {
      setError('No pudimos conectar con el servidor. Verifica que el backend esté activo.');
    } finally {
      setLoading(false);
    }
  }, [brands, currentPage, globalSearch, is5GOnly, maxPrice, selectedBrand, selectedRam, selectedStorage, sortBy]);

  useEffect(() => { fetchPhones(); }, [fetchPhones]);

  const handleToggleFavorite = async (phoneId) => {
    if (!isAuthenticated) { showToast('Inicia sesión para guardar favoritos', 'info'); return; }
    const isFav = favoriteIds.has(phoneId);
    try {
      if (isFav) {
        await apiClient.delete(`/favorites/${phoneId}`);
        setFavoriteIds((prev) => { const s = new Set(prev); s.delete(phoneId); return s; });
        showToast('Eliminado de favoritos', 'info');
      } else {
        await apiClient.post(`/favorites/${phoneId}`);
        setFavoriteIds((prev) => new Set(prev).add(phoneId));
        showToast('¡Guardado en tus favoritos!', 'success');
      }
    } catch { showToast('Error al actualizar favoritos', 'error'); }
  };

  const handleResetFilters = () => {
    setSelectedBrand('');
    setMaxPrice(7000000);
    setSelectedRam('');
    setSelectedStorage('');
    setIs5GOnly(false);
    setSortBy('created_at');
    setCurrentPage(1);
    setSearchParams({});
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="catalog-page-container">
      <div className="catalog-layout">

        {/* ── SIDEBAR FILTROS ── */}
        <aside className="filters-sidebar">
          <div className="filters-header">
            <div className="filters-title">
              <SlidersHorizontal size={16} color="#818cf8" />
              <h3>Filtros</h3>
            </div>
            <button className="btn-reset-filters" onClick={handleResetFilters}>
              <RotateCcw size={12} />
              Limpiar
            </button>
          </div>

          {/* Marca */}
          {brands.length > 0 && (
            <div className="filter-group">
              <p className="filter-label">Marca</p>
              <div className="filter-chips-list">
                <button
                  className={`filter-chip ${selectedBrand === '' ? 'active' : ''}`}
                  onClick={() => { setSelectedBrand(''); setCurrentPage(1); }}
                >Todas</button>
                {brands.map((b) => (
                  <button
                    key={b.id}
                    className={`filter-chip ${selectedBrand === b.slug ? 'active' : ''}`}
                    onClick={() => { setSelectedBrand(b.slug); setCurrentPage(1); }}
                  >{b.name}</button>
                ))}
              </div>
            </div>
          )}

          {/* Precio */}
          <div className="filter-group">
            <p className="filter-label">Precio Máximo</p>
            <input
              type="range"
              min="1000000"
              max="7000000"
              step="100000"
              value={maxPrice}
              onChange={(e) => { setMaxPrice(Number(e.target.value)); setCurrentPage(1); }}
              className="price-slider-input"
            />
            <div className="slider-range-row">
              <span>$ 1.000.000</span>
              <span className="slider-max-val">{formatCOP(maxPrice)}</span>
            </div>
          </div>

          {/* 5G */}
          <div className="filter-group">
            <label className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={is5GOnly}
                onChange={(e) => { setIs5GOnly(e.target.checked); setCurrentPage(1); }}
              />
              <span className="custom-checkbox"></span>
              <span>Solo celulares 5G ⚡</span>
            </label>
          </div>

          {/* RAM — radio buttons */}
          <div className="filter-group">
            <p className="filter-label">Memoria RAM</p>
            <div className="filter-radio-list">
              {[
                { val: '', label: 'Cualquiera' },
                { val: 6,  label: '6 GB' },
                { val: 8,  label: '8 GB' },
                { val: 12, label: '12 GB' },
                { val: 16, label: '16 GB (Gama Alta)' },
              ].map(({ val, label }) => (
                <label key={label} className="filter-radio-label">
                  <input
                    type="radio"
                    name="ram"
                    checked={selectedRam === val}
                    onChange={() => { setSelectedRam(val); setCurrentPage(1); }}
                  />
                  <span className="radio-dot"></span>
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Almacenamiento — radio buttons */}
          <div className="filter-group">
            <p className="filter-label">Almacenamiento</p>
            <div className="filter-radio-list">
              {[
                { val: '',   label: 'Cualquiera' },
                { val: 128,  label: '128 GB' },
                { val: 256,  label: '256 GB' },
                { val: 512,  label: '512 GB' },
              ].map(({ val, label }) => (
                <label key={label} className="filter-radio-label">
                  <input
                    type="radio"
                    name="storage"
                    checked={selectedStorage === val}
                    onChange={() => { setSelectedStorage(val); setCurrentPage(1); }}
                  />
                  <span className="radio-dot"></span>
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* ── GRID DE PRODUCTOS ── */}
        <main className="catalog-products-main">
          {/* Toolbar */}
          <div className="catalog-toolbar">
            <span className="catalog-count-info">
              {loading ? 'Buscando...' : (
                <><strong>{phones.length}</strong> de <strong>{totalCount}</strong> smartphones</>
              )}
            </span>
            <div className="catalog-sort-select">
              <label htmlFor="sort-by">Ordenar:</label>
              <select id="sort-by" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}>
                <option value="created_at">Más Recientes</option>
                <option value="price_asc">Precio: ↑</option>
                <option value="price_desc">Precio: ↓</option>
                <option value="rating">Mejor Calificados</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="catalog-error-box">
              <p>{error}</p>
              <button className="btn-primary" onClick={fetchPhones}>Reintentar</button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading ? (
            <div className="products-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="product-skeleton-card">
                  <div className="skeleton-img"></div>
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div className="skeleton-line" style={{ width: '35%', height: '11px' }}></div>
                    <div className="skeleton-line" style={{ width: '80%', height: '16px' }}></div>
                    <div className="skeleton-line" style={{ width: '60%', height: '11px' }}></div>
                    <div className="skeleton-line" style={{ width: '50%', height: '20px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : phones.length === 0 ? (
            <div className="catalog-empty-state">
              <h3>Sin resultados</h3>
              <p>Prueba ajustando los filtros o cambiando la búsqueda.</p>
              <button className="btn-secondary" onClick={handleResetFilters}>Restablecer Filtros</button>
            </div>
          ) : (
            <div className="products-grid">
              {phones.map((phone) => (
                <PhoneCard
                  key={phone.id}
                  phone={phone}
                  onOpenQuickSpec={(p) => setQuickSpecPhone(p)}
                  isFavorite={favoriteIds.has(phone.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <button className="btn-page-nav" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft size={15} /> Anterior
              </button>
              <span className="pagination-page-indicator">Página {currentPage} de {totalPages}</span>
              <button className="btn-page-nav" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                Siguiente <ChevronRight size={15} />
              </button>
            </div>
          )}
        </main>
      </div>

      {quickSpecPhone && (
        <QuickSpecModal phone={quickSpecPhone} onClose={() => setQuickSpecPhone(null)} />
      )}
    </div>
  );
}
