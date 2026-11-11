import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useToast } from '../context/ToastContext';
import { formatCOP, formatDate } from '../utils/formatters';
import {
  DollarSign,
  ShoppingBag,
  Smartphone,
  Tag,
  Users,
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  CheckCircle,
  Clock,
  Layers,
  Search
} from 'lucide-react';

export default function AdminPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' | 'phones' | 'brands' | 'coupons' | 'orders'

  // Métricas
  const [metrics, setMetrics] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Teléfonos
  const [phones, setPhones] = useState([]);
  const [totalPhones, setTotalPhones] = useState(0);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [editingPhone, setEditingPhone] = useState(null);

  // Marcas
  const [brands, setBrands] = useState([]);
  const [brandModalOpen, setBrandModalOpen] = useState(false);

  // Cupones
  const [coupons, setCoupons] = useState([]);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  // Órdenes
  const [allOrders, setAllOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Estado del formulario de smartphone
  const initialPhoneState = {
    brand_id: '',
    name: '',
    slug: '',
    model_code: '',
    description: '',
    price: 3000000,
    discount_price: '',
    stock: 10,
    ram_gb: 8,
    storage_gb: 256,
    color: 'Negro',
    screen_size: 6.7,
    screen_type: 'OLED 120Hz',
    processor: '',
    battery_mah: 5000,
    main_camera_mp: 50,
    front_camera_mp: 12,
    os: 'Android 14',
    is_5g: true,
    is_featured: false,
    is_active: true,
    image_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
  };
  const [phoneFormData, setPhoneFormData] = useState(initialPhoneState);

  // Estado formulario de marca
  const [brandFormData, setBrandFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    description: '',
  });

  // Estado formulario de cupón
  const [couponFormData, setCouponFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    max_uses: 100,
  });

  // Cargar métricas
  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await apiClient.get('/admin/metrics');
      setMetrics(res.data);
    } catch (err) {
      showToast('Error al cargar métricas de administración', 'error');
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Cargar teléfonos
  const fetchPhones = async () => {
    try {
      const res = await apiClient.get('/phones', {
        params: { limit: 100, search: phoneSearch || undefined },
      });
      setPhones(res.data.data || []);
      setTotalPhones(res.data.total || 0);
    } catch (err) {
      showToast('Error al cargar teléfonos', 'error');
    }
  };

  // Cargar marcas
  const fetchBrands = async () => {
    try {
      const res = await apiClient.get('/brands');
      setBrands(res.data || []);
    } catch (err) {
      showToast('Error al cargar marcas', 'error');
    }
  };

  // Cargar cupones
  const fetchCoupons = async () => {
    try {
      const res = await apiClient.get('/coupons');
      setCoupons(res.data || []);
    } catch (err) {
      showToast('Error al cargar cupones', 'error');
    }
  };

  // Cargar todas las órdenes
  const fetchAllOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await apiClient.get('/orders');
      setAllOrders(res.data || []);
    } catch (err) {
      showToast('Error al cargar órdenes', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchBrands();
    fetchPhones();
    fetchCoupons();
    fetchAllOrders();
  }, []);

  // Guardar teléfono (Crear o Editar)
  const handleSavePhone = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...phoneFormData,
        brand_id: Number(phoneFormData.brand_id),
        price: Number(phoneFormData.price),
        discount_price: phoneFormData.discount_price ? Number(phoneFormData.discount_price) : null,
        stock: Number(phoneFormData.stock),
        ram_gb: Number(phoneFormData.ram_gb),
        storage_gb: Number(phoneFormData.storage_gb),
        screen_size: phoneFormData.screen_size ? Number(phoneFormData.screen_size) : null,
        battery_mah: phoneFormData.battery_mah ? Number(phoneFormData.battery_mah) : null,
        main_camera_mp: phoneFormData.main_camera_mp ? Number(phoneFormData.main_camera_mp) : null,
        front_camera_mp: phoneFormData.front_camera_mp ? Number(phoneFormData.front_camera_mp) : null,
      };

      if (editingPhone) {
        await apiClient.put(`/phones/${editingPhone.id}`, payload);
        showToast('Smartphone actualizado con éxito', 'success');
      } else {
        await apiClient.post('/phones', payload);
        showToast('Smartphone añadido al catálogo', 'success');
      }
      setPhoneModalOpen(false);
      setEditingPhone(null);
      fetchPhones();
      fetchMetrics();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al guardar smartphone', 'error');
    }
  };

  // Eliminar teléfono
  const handleDeletePhone = async (phoneId) => {
    if (window.confirm('¿Deseas eliminar este smartphone del catálogo?')) {
      try {
        await apiClient.delete(`/phones/${phoneId}`);
        showToast('Smartphone eliminado correctamente', 'info');
        fetchPhones();
        fetchMetrics();
      } catch (err) {
        showToast('Error al eliminar teléfono', 'error');
      }
    }
  };

  // Abrir modal para crear teléfono
  const handleOpenCreatePhone = () => {
    setEditingPhone(null);
    setPhoneFormData({
      ...initialPhoneState,
      brand_id: brands[0]?.id || 1,
    });
    setPhoneModalOpen(true);
  };

  // Abrir modal para editar teléfono
  const handleOpenEditPhone = (p) => {
    setEditingPhone(p);
    setPhoneFormData({
      brand_id: p.brand_id,
      name: p.name,
      slug: p.slug,
      model_code: p.model_code || '',
      description: p.description || '',
      price: p.price,
      discount_price: p.discount_price || '',
      stock: p.stock,
      ram_gb: p.ram_gb,
      storage_gb: p.storage_gb,
      color: p.color,
      screen_size: p.screen_size || '',
      screen_type: p.screen_type || '',
      processor: p.processor || '',
      battery_mah: p.battery_mah || '',
      main_camera_mp: p.main_camera_mp || '',
      front_camera_mp: p.front_camera_mp || '',
      os: p.os || '',
      is_5g: p.is_5g,
      is_featured: p.is_featured,
      is_active: p.is_active,
      image_url: p.image_url,
    });
    setPhoneModalOpen(true);
  };

  // Guardar Marca
  const handleSaveBrand = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/brands', brandFormData);
      showToast('Marca creada exitosamente', 'success');
      setBrandModalOpen(false);
      setBrandFormData({ name: '', slug: '', logo_url: '', description: '' });
      fetchBrands();
      fetchMetrics();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al crear marca', 'error');
    }
  };

  // Guardar Cupón
  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/coupons', {
        ...couponFormData,
        discount_value: Number(couponFormData.discount_value),
        max_uses: Number(couponFormData.max_uses),
      });
      showToast('Cupón creado exitosamente', 'success');
      setCouponModalOpen(false);
      setCouponFormData({ code: '', discount_type: 'percentage', discount_value: 10, max_uses: 100 });
      fetchCoupons();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al crear cupón', 'error');
    }
  };

  // Eliminar Cupón
  const handleDeleteCoupon = async (couponId) => {
    if (window.confirm('¿Deseas eliminar este cupón?')) {
      try {
        await apiClient.delete(`/coupons/${couponId}`);
        showToast('Cupón eliminado', 'info');
        fetchCoupons();
      } catch (err) {
        showToast('Error al eliminar cupón', 'error');
      }
    }
  };

  // Cambiar estado de orden
  const handleOrderStatusChange = async (orderId, newStatus) => {
    try {
      await apiClient.patch(`/orders/${orderId}/status`, { status: newStatus });
      showToast(`Estado de la orden actualizado a: ${newStatus}`, 'success');
      fetchAllOrders();
      fetchMetrics();
    } catch (err) {
      showToast('Error al actualizar estado de la orden', 'error');
    }
  };

  return (
    <div className="admin-page-container">
      {/* Cabecera del Panel */}
      <div className="admin-header-card glass">
        <div>
          <h2>Panel de Control Administrativo</h2>
          <p>Gestión integral de ventas, inventario, marcas y cupones de ElectroPhone Colombia.</p>
        </div>

        <div className="admin-header-actions">
          <button className="btn-primary" onClick={handleOpenCreatePhone}>
            <Plus size={16} style={{ marginRight: '6px' }} />
            Nuevo Smartphone
          </button>
        </div>
      </div>

      {/* Tabs de Administración */}
      <div className="admin-tabs-bar">
        <button
          className={`admin-tab-btn ${activeTab === 'metrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('metrics')}
        >
          Resumen & Métricas
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'phones' ? 'active' : ''}`}
          onClick={() => setActiveTab('phones')}
        >
          Catálogo Smartphones ({totalPhones})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Gestión de Órdenes ({allOrders.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'brands' ? 'active' : ''}`}
          onClick={() => setActiveTab('brands')}
        >
          Marcas ({brands.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'coupons' ? 'active' : ''}`}
          onClick={() => setActiveTab('coupons')}
        >
          Cupones de Descuento ({coupons.length})
        </button>
      </div>

      {/* ================= TAB 1: MÉTRICAS Y RESUMEN ================= */}
      {activeTab === 'metrics' && (
        <div className="admin-metrics-view">
          {loadingMetrics ? (
            <div className="admin-loading-box">
              <div className="spinner"></div>
              <p>Calculando estadísticas en tiempo real...</p>
            </div>
          ) : metrics ? (
            <>
              {/* Tarjetas KPI */}
              <div className="kpi-cards-grid">
                <div className="kpi-card glass">
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <DollarSign size={24} />
                  </div>
                  <div className="kpi-content">
                    <span>Facturación Total</span>
                    <h3>{formatCOP(metrics.total_revenue)}</h3>
                  </div>
                </div>

                <div className="kpi-card glass">
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                    <ShoppingBag size={24} />
                  </div>
                  <div className="kpi-content">
                    <span>Total de Pedidos</span>
                    <h3>{metrics.total_orders}</h3>
                  </div>
                </div>

                <div className="kpi-card glass">
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                    <Smartphone size={24} />
                  </div>
                  <div className="kpi-content">
                    <span>Modelos de Celulares</span>
                    <h3>{metrics.total_phones}</h3>
                  </div>
                </div>

                <div className="kpi-card glass">
                  <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                    <Users size={24} />
                  </div>
                  <div className="kpi-content">
                    <span>Usuarios Registrados</span>
                    <h3>{metrics.total_users}</h3>
                  </div>
                </div>
              </div>

              {/* Alertas de Bajo Stock */}
              {metrics.low_stock_items && metrics.low_stock_items.length > 0 && (
                <div className="low-stock-alert-card glass">
                  <div className="alert-header">
                    <AlertTriangle size={20} color="#f59e0b" />
                    <h4>Alerta de Inventario Bajo (5 unidades o menos)</h4>
                  </div>
                  <div className="low-stock-table">
                    {metrics.low_stock_items.map((item) => (
                      <div key={item.id} className="low-stock-row">
                        <span>{item.name}</span>
                        <span className="stock-count-warning">Stock: <strong>{item.stock} un.</strong></span>
                        <span>{formatCOP(item.price)}</span>
                        <button
                          className="btn-edit-sm"
                          onClick={() => {
                            const found = phones.find((p) => p.id === item.id);
                            if (found) handleOpenEditPhone(found);
                          }}
                        >
                          Abastecer
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Órdenes Recientes */}
              <div className="recent-orders-card glass">
                <h4>Últimas Órdenes Registradas</h4>
                <div className="orders-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>N° Orden</th>
                        <th>Cliente</th>
                        <th>Total</th>
                        <th>Fecha</th>
                        <th>Estado Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.recent_orders?.map((ord) => (
                        <tr key={ord.id}>
                          <td><strong>{ord.order_number}</strong></td>
                          <td>{ord.customer_name}</td>
                          <td>{formatCOP(ord.total)}</td>
                          <td>{formatDate(ord.created_at)}</td>
                          <td>
                            <span className={`status-pill status-${ord.status}`}>
                              {ord.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ================= TAB 2: CATÁLOGO SMARTPHONES ================= */}
      {activeTab === 'phones' && (
        <div className="admin-phones-view glass">
          <div className="admin-table-toolbar">
            <div className="search-box">
              <Search size={18} color="#9ca3af" />
              <input
                type="text"
                placeholder="Buscar celular por nombre, procesador..."
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPhones()}
              />
            </div>
            <button className="btn-secondary" onClick={fetchPhones}>Buscar</button>
            <button className="btn-primary" onClick={handleOpenCreatePhone}>+ Agregar Celular</button>
          </div>

          <div className="orders-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Modelo</th>
                  <th>Marca</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Specs</th>
                  <th>5G</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {phones.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <img src={p.image_url} alt={p.name} className="table-thumb" />
                    </td>
                    <td>
                      <strong>{p.name}</strong>
                      <br /><small>{p.color}</small>
                    </td>
                    <td>{p.brand?.name}</td>
                    <td>
                      <strong>{formatCOP(p.discount_price || p.price)}</strong>
                      {p.discount_price && <small style={{ display: 'block', textDecoration: 'line-through', color: '#9ca3af' }}>{formatCOP(p.price)}</small>}
                    </td>
                    <td>
                      <span className={p.stock <= 5 ? 'text-warning' : ''}>
                        {p.stock} un.
                      </span>
                    </td>
                    <td>
                      <small>{p.ram_gb}GB / {p.storage_gb}GB</small>
                    </td>
                    <td>{p.is_5g ? '✓' : '✕'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn-icon"
                          onClick={() => handleOpenEditPhone(p)}
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="btn-icon text-danger"
                          onClick={() => handleDeletePhone(p.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 3: GESTIÓN DE ÓRDENES ================= */}
      {activeTab === 'orders' && (
        <div className="admin-orders-view glass">
          <div className="admin-table-toolbar">
            <h3>Órdenes Realizadas ({allOrders.length})</h3>
            <button className="btn-secondary" onClick={fetchAllOrders}>Actualizar</button>
          </div>

          <div className="orders-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>N° Orden</th>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Estado de Envío</th>
                </tr>
              </thead>
              <tbody>
                {allOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td><strong>{ord.order_number}</strong></td>
                    <td>
                      {ord.customer_name}
                      <br /><small>{ord.shipping_address}, {ord.city}</small>
                    </td>
                    <td>
                      <small>{ord.customer_email}</small>
                      <br /><small>{ord.customer_phone}</small>
                    </td>
                    <td><strong>{formatCOP(ord.total)}</strong></td>
                    <td>
                      <span className={`status-pill status-${ord.payment_status}`}>
                        {ord.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <select
                        value={ord.status}
                        onChange={(e) => handleOrderStatusChange(ord.id, e.target.value)}
                        className="admin-select-status"
                      >
                        <option value="pending">Pendiente</option>
                        <option value="processing">En Preparación</option>
                        <option value="shipped">Despachado / En Camino</option>
                        <option value="delivered">Entregado</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: MARCAS ================= */}
      {activeTab === 'brands' && (
        <div className="admin-brands-view glass">
          <div className="admin-table-toolbar">
            <h3>Marcas Disponibles</h3>
            <button className="btn-primary" onClick={() => setBrandModalOpen(true)}>+ Nueva Marca</button>
          </div>

          <div className="brands-admin-grid">
            {brands.map((b) => (
              <div key={b.id} className="brand-admin-card glass">
                <img src={b.logo_url} alt={b.name} className="brand-admin-logo" />
                <h4>{b.name}</h4>
                <small>Slug: {b.slug}</small>
                <p>{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= TAB 5: CUPONES ================= */}
      {activeTab === 'coupons' && (
        <div className="admin-coupons-view glass">
          <div className="admin-table-toolbar">
            <h3>Cupones Promocionales</h3>
            <button className="btn-primary" onClick={() => setCouponModalOpen(true)}>+ Crear Cupón</button>
          </div>

          <div className="orders-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Descuento</th>
                  <th>Usos</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.code}</strong></td>
                    <td>{c.discount_type === 'percentage' ? 'Porcentaje (%)' : 'Monto Fijo (COP)'}</td>
                    <td>
                      {c.discount_type === 'percentage' ? `${c.discount_value}%` : formatCOP(c.discount_value)}
                    </td>
                    <td>{c.used_count} de {c.max_uses === 0 ? 'Ilimitado' : c.max_uses}</td>
                    <td>{c.is_active ? <span className="status-pill status-delivered">Activo</span> : 'Inactivo'}</td>
                    <td>
                      <button
                        className="btn-icon text-danger"
                        onClick={() => handleDeleteCoupon(c.id)}
                        title="Eliminar cupón"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL DE SMARTPHONE ================= */}
      {phoneModalOpen && (
        <div className="modal-backdrop open" onClick={() => setPhoneModalOpen(false)}>
          <div className="modal-card modal-lg glass" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setPhoneModalOpen(false)}>
              <X size={20} />
            </button>
            <h3>{editingPhone ? 'Editar Smartphone' : 'Nuevo Smartphone'}</h3>

            <form onSubmit={handleSavePhone} className="admin-phone-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    value={phoneFormData.name}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, name: e.target.value })}
                    placeholder="Ej: Galaxy S24 Ultra"
                  />
                </div>

                <div className="form-group">
                  <label>Slug (Identificador URL) *</label>
                  <input
                    type="text"
                    required
                    value={phoneFormData.slug}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, slug: e.target.value })}
                    placeholder="galaxy-s24-ultra-512gb"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Marca *</label>
                  <select
                    value={phoneFormData.brand_id}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, brand_id: e.target.value })}
                    required
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Color *</label>
                  <input
                    type="text"
                    required
                    value={phoneFormData.color}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, color: e.target.value })}
                    placeholder="Ej: Titanio Negro"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio Regular (COP) *</label>
                  <input
                    type="number"
                    required
                    min="10000"
                    value={phoneFormData.price}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Precio con Descuento (COP Opcional)</label>
                  <input
                    type="number"
                    value={phoneFormData.discount_price}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, discount_price: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Stock Disponible *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={phoneFormData.stock}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>RAM (GB) *</label>
                  <input
                    type="number"
                    required
                    value={phoneFormData.ram_gb}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, ram_gb: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Almacenamiento (GB) *</label>
                  <input
                    type="number"
                    required
                    value={phoneFormData.storage_gb}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, storage_gb: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Batería (mAh)</label>
                  <input
                    type="number"
                    value={phoneFormData.battery_mah}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, battery_mah: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Procesador</label>
                  <input
                    type="text"
                    value={phoneFormData.processor}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, processor: e.target.value })}
                    placeholder="Snapdragon 8 Gen 3"
                  />
                </div>

                <div className="form-group">
                  <label>Pantalla</label>
                  <input
                    type="text"
                    value={phoneFormData.screen_type}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, screen_type: e.target.value })}
                    placeholder="Dynamic AMOLED 2X 120Hz"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>URL de Imagen Principal *</label>
                <input
                  type="url"
                  required
                  value={phoneFormData.image_url}
                  onChange={(e) => setPhoneFormData({ ...phoneFormData, image_url: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Descripción Comercial</label>
                <textarea
                  rows="3"
                  value={phoneFormData.description}
                  onChange={(e) => setPhoneFormData({ ...phoneFormData, description: e.target.value })}
                ></textarea>
              </div>

              <div className="form-row checkboxes-row">
                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={phoneFormData.is_5g}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, is_5g: e.target.checked })}
                  />
                  <span>Conectividad 5G</span>
                </label>

                <label className="checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={phoneFormData.is_featured}
                    onChange={(e) => setPhoneFormData({ ...phoneFormData, is_featured: e.target.checked })}
                  />
                  <span>Destacado en Portada</span>
                </label>
              </div>

              <div className="modal-actions-right">
                <button type="button" className="btn-secondary" onClick={() => setPhoneModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={16} style={{ marginRight: '6px' }} />
                  Guardar Smartphone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CREAR MARCA ================= */}
      {brandModalOpen && (
        <div className="modal-backdrop open" onClick={() => setBrandModalOpen(false)}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setBrandModalOpen(false)}>
              <X size={20} />
            </button>
            <h3>Nueva Marca</h3>
            <form onSubmit={handleSaveBrand} className="admin-form">
              <div className="form-group">
                <label>Nombre de Marca *</label>
                <input
                  type="text"
                  required
                  value={brandFormData.name}
                  onChange={(e) => setBrandFormData({ ...brandFormData, name: e.target.value })}
                  placeholder="Ej: Sony"
                />
              </div>
              <div className="form-group">
                <label>Slug *</label>
                <input
                  type="text"
                  required
                  value={brandFormData.slug}
                  onChange={(e) => setBrandFormData({ ...brandFormData, slug: e.target.value })}
                  placeholder="sony"
                />
              </div>
              <div className="form-group">
                <label>URL del Logo</label>
                <input
                  type="url"
                  value={brandFormData.logo_url}
                  onChange={(e) => setBrandFormData({ ...brandFormData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  rows="2"
                  value={brandFormData.description}
                  onChange={(e) => setBrandFormData({ ...brandFormData, description: e.target.value })}
                ></textarea>
              </div>
              <button type="submit" className="btn-primary btn-block">Crear Marca</button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL CREAR CUPÓN ================= */}
      {couponModalOpen && (
        <div className="modal-backdrop open" onClick={() => setCouponModalOpen(false)}>
          <div className="modal-card glass" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setCouponModalOpen(false)}>
              <X size={20} />
            </button>
            <h3>Crear Cupón Promocional</h3>
            <form onSubmit={handleSaveCoupon} className="admin-form">
              <div className="form-group">
                <label>Código del Cupón (Ej: DESCUENTO20) *</label>
                <input
                  type="text"
                  required
                  value={couponFormData.code}
                  onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="form-group">
                <label>Tipo de Descuento</label>
                <select
                  value={couponFormData.discount_type}
                  onChange={(e) => setCouponFormData({ ...couponFormData, discount_type: e.target.value })}
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo en COP ($)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Valor del Descuento *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={couponFormData.discount_value}
                  onChange={(e) => setCouponFormData({ ...couponFormData, discount_value: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Cantidad Máxima de Usos</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={couponFormData.max_uses}
                  onChange={(e) => setCouponFormData({ ...couponFormData, max_uses: e.target.value })}
                />
                <small>0 = Usos ilimitados</small>
              </div>
              <button type="submit" className="btn-primary btn-block">Guardar Cupón</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
