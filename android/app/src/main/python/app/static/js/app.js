/**
 * ElectroPhone Colombia - Fast API Virtual Store Client Script (COP Currency)
 */

let cart = JSON.parse(localStorage.getItem('electrophone_cart')) || [];
let activeFilters = {
    brand_id: null,
    min_price: null,
    max_price: null,
    ram_gb: null,
    storage_gb: null,
    is_5g: null,
    search: '',
    sort_by: 'created_at'
};

// Format currency in Colombian Pesos ($ 5.499.900)
function formatCOP(amount) {
    if (amount === null || amount === undefined) return '$0';
    return '$ ' + Math.round(amount).toLocaleString('es-CO');
}

document.addEventListener('DOMContentLoaded', () => {
    initCart();
    initSearch();
    initPriceSlider();
    initFilterListeners();
    loadCatalog();
    initAuthUI();
});

// ================= Auth Session (global) =================
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem('electrophone_user') || 'null');
    } catch (e) {
        return null;
    }
}

function getAuthToken() {
    return localStorage.getItem('electrophone_token');
}

function initAuthUI() {
    const user = getCurrentUser();
    const loginBtn = document.getElementById('btn-nav-login');
    const userMenu = document.getElementById('user-menu');

    // Botones solo para administradores
    const adminBtn = document.getElementById('btn-nav-admin');
    const swaggerBtn = document.getElementById('btn-nav-swagger');
    const footerAdmin = document.getElementById('footer-nav-admin');
    const isAdmin = !!(user && user.is_admin);
    if (adminBtn) adminBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if (swaggerBtn) swaggerBtn.style.display = isAdmin ? 'inline-block' : 'none';
    if (footerAdmin) footerAdmin.style.display = isAdmin ? 'block' : 'none';

    if (!loginBtn && !userMenu) return;

    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userMenu) {
            userMenu.style.display = 'inline-block';
            const nameEl = document.getElementById('nav-user-name');
            if (nameEl) nameEl.innerText = (user.full_name || 'Mi Cuenta').split(' ')[0];
            const dn = document.getElementById('dropdown-user-name');
            const de = document.getElementById('dropdown-user-email');
            if (dn) dn.innerText = user.full_name || 'Mi Cuenta';
            if (de) de.innerText = user.email || '';
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (userMenu) userMenu.style.display = 'none';
    }

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
        const dd = document.getElementById('user-dropdown');
        if (dd && !e.target.closest('.nav-user-menu')) {
            dd.classList.remove('open');
        }
    });
}

function toggleUserMenu() {
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.toggle('open');
}

function handleLogout() {
    localStorage.removeItem('electrophone_token');
    localStorage.removeItem('electrophone_user');
    showToast('Sesión cerrada correctamente', 'info');
    setTimeout(() => window.location.href = '/', 600);
}

// ================= Toast Notifications =================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ================= Shopping Cart =================
function saveCart() {
    localStorage.setItem('electrophone_cart', JSON.stringify(cart));
    updateCartUI();
}

function initCart() {
    updateCartUI();

    const openBtn = document.getElementById('btn-open-cart');
    const closeBtn = document.getElementById('btn-close-cart');
    const overlay = document.getElementById('cart-drawer-overlay');
    const drawer = document.getElementById('cart-drawer');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            overlay.classList.add('active');
            drawer.classList.add('active');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.classList.remove('active');
            drawer.classList.remove('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
                drawer.classList.remove('active');
            }
        });
    }
}

function addToCart(phoneId, name, price, imageUrl, color, storage) {
    const existingIndex = cart.findIndex(item => item.phone_id === phoneId);
    if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
    } else {
        cart.push({
            phone_id: phoneId,
            name: name,
            price: price,
            image_url: imageUrl,
            color: color,
            storage: storage,
            quantity: 1
        });
    }
    saveCart();
    showToast(`¡${name} añadido al carrito!`, 'success');

    // Automatically open drawer
    const overlay = document.getElementById('cart-drawer-overlay');
    const drawer = document.getElementById('cart-drawer');
    if (overlay && drawer) {
        overlay.classList.add('active');
        drawer.classList.add('active');
    }
}

function updateCartQuantity(phoneId, delta) {
    const index = cart.findIndex(item => item.phone_id === phoneId);
    if (index > -1) {
        cart[index].quantity += delta;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        saveCart();
    }
}

function removeFromCart(phoneId) {
    cart = cart.filter(item => item.phone_id !== phoneId);
    saveCart();
    showToast('Producto eliminado del carrito', 'info');
}

function updateCartUI() {
    const badge = document.getElementById('cart-count-badge');
    const listContainer = document.getElementById('cart-items-list');
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const totalEl = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('btn-cart-checkout');

    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) badge.innerText = totalCount;

    if (!listContainer) return;

    if (cart.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; color: var(--text-dim); padding: 3rem 1rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🛒</div>
                <p>Tu carrito está vacío</p>
                <small>Explora nuestro catálogo y agrega los mejores smartphones</small>
            </div>
        `;
        if (subtotalEl) subtotalEl.innerText = '$ 0';
        if (shippingEl) shippingEl.innerText = '$ 0';
        if (totalEl) totalEl.innerText = '$ 0';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    if (checkoutBtn) checkoutBtn.disabled = false;

    let subtotal = 0;
    listContainer.innerHTML = cart.map(item => {
        const itemSubtotal = item.price * item.quantity;
        subtotal += itemSubtotal;
        return `
            <div class="cart-item">
                <img src="${item.image_url}" alt="${item.name}">
                <div class="cart-item-info">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-meta">${item.color || ''} • ${item.storage || ''}</div>
                    <div class="cart-item-price">${formatCOP(item.price)}</div>
                </div>
                <div class="cart-qty-ctrl">
                    <button class="cart-qty-btn" onclick="updateCartQuantity(${item.phone_id}, -1)">-</button>
                    <span style="font-size: 0.9rem; font-weight: 700;">${item.quantity}</span>
                    <button class="cart-qty-btn" onclick="updateCartQuantity(${item.phone_id}, 1)">+</button>
                </div>
                <button onclick="removeFromCart(${item.phone_id})" style="background:none; border:none; color:#ef4444; cursor:pointer; margin-left:0.5rem;" title="Eliminar">🗑️</button>
            </div>
        `;
    }).join('');

    const shipping = subtotal > 1200000 ? 0 : 20000;
    const total = subtotal + shipping;

    if (subtotalEl) subtotalEl.innerText = formatCOP(subtotal);
    if (shippingEl) shippingEl.innerText = shipping === 0 ? '¡Gratis!' : formatCOP(shipping);
    if (totalEl) totalEl.innerText = formatCOP(total);
}

// ================= Catalog Filtering & Fetching =================
const catalogState = {
    skip: 0,
    limit: 12,
    total: 0,
    isLoading: false,
    hasMore: true
};

document.addEventListener('DOMContentLoaded', () => {
    // Infinite scroll: observar un centinela al final del grid
    initCatalogObserver();
});

let catalogObserver = null;
function initCatalogObserver() {
    if (catalogObserver) catalogObserver.disconnect();
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    catalogObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && catalogState.hasMore && !catalogState.isLoading) {
            loadMoreCatalog();
        }
    }, { rootMargin: '200px' });

    const sentinel = document.getElementById('catalog-sentinel');
    if (sentinel) catalogObserver.observe(sentinel);
}

function buildCatalogQuery() {
    const params = new URLSearchParams();
    if (activeFilters.brand_id) params.append('brand_id', activeFilters.brand_id);
    if (activeFilters.min_price) params.append('min_price', activeFilters.min_price);
    if (activeFilters.max_price) params.append('max_price', activeFilters.max_price);
    if (activeFilters.ram_gb) params.append('ram_gb', activeFilters.ram_gb);
    if (activeFilters.storage_gb) params.append('storage_gb', activeFilters.storage_gb);
    if (activeFilters.is_5g !== null) params.append('is_5g', activeFilters.is_5g);
    if (activeFilters.search) params.append('search', activeFilters.search);
    if (activeFilters.sort_by) params.append('sort_by', activeFilters.sort_by);
    return params;
}

function renderPhoneCard(phone) {
    const currentPrice = phone.discount_price || phone.price;
    const hasDiscount = phone.discount_price && phone.discount_price < phone.price;

    return `
        <div class="phone-card glass">
            <div class="card-badges">
                ${phone.is_5g ? '<span class="badge badge-5g">5G</span>' : ''}
                ${phone.is_featured ? '<span class="badge badge-featured">Destacado</span>' : ''}
                ${hasDiscount ? '<span class="badge badge-offer">Oferta</span>' : ''}
            </div>

            <div class="phone-img-wrap" onclick="openPhoneModal(${phone.id})">
                <img src="${phone.image_url}" alt="${phone.name}" loading="lazy">
            </div>

            <div class="phone-brand-tag">${phone.brand ? phone.brand.name : 'Smartphone'}</div>
            <a href="/phone/${phone.slug}" class="phone-title">${phone.name}</a>

            <div class="specs-pills">
                <span class="spec-pill">🚀 ${phone.ram_gb} GB RAM</span>
                <span class="spec-pill">💾 ${phone.storage_gb} GB</span>
                <span class="spec-pill">🔋 ${phone.battery_mah || 5000} mAh</span>
            </div>

            <div class="phone-footer">
                <div class="price-wrap">
                    ${hasDiscount ? `<span class="old-price">${formatCOP(phone.price)}</span>` : ''}
                    <span class="current-price">${formatCOP(currentPrice)}</span>
                </div>
                <button class="btn-add-cart" onclick="addToCart(${phone.id}, '${phone.name.replace(/'/g, "\\'")}', ${currentPrice}, '${phone.image_url}', '${phone.color}', '${phone.storage_gb}GB')" title="Agregar al carrito">
                    🛒
                </button>
            </div>
        </div>
    `;
}

async function loadCatalog() {
    const grid = document.getElementById('products-grid');
    const countEl = document.getElementById('results-count');
    if (!grid) return;

    // Reset de paginación
    catalogState.skip = 0;
    catalogState.hasMore = true;

    grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem;">
            <div style="font-size: 2rem; animation: spin 1s linear infinite; display: inline-block;">⚡</div>
            <p style="color: var(--text-muted); margin-top: 0.5rem;">Cargando catálogo de celulares...</p>
        </div>
    `;

    const params = buildCatalogQuery();
    params.append('skip', '0');
    params.append('limit', catalogState.limit);

    try {
        const response = await fetch(`/api/v1/phones?${params.toString()}`);
        if (!response.ok) throw new Error('Error al cargar productos');
        const data = await response.json();

        catalogState.total = data.total;

        if (countEl) countEl.innerText = `${data.total} celulares encontrados`;

        if (data.data.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: var(--bg-card); border-radius: var(--radius-md);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📱</div>
                    <h3>No se encontraron teléfonos</h3>
                    <p style="color: var(--text-muted);">Prueba ajustando los filtros o tu término de búsqueda.</p>
                </div>
            `;
            catalogState.hasMore = false;
            return;
        }

        catalogState.skip = data.data.length;
        catalogState.hasMore = catalogState.skip < catalogState.total;

        grid.innerHTML = data.data.map(renderPhoneCard).join('') +
            `<div id="catalog-sentinel" style="grid-column:1/-1;height:20px;"></div>`;

        initCatalogObserver();

    } catch (err) {
        grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--danger); text-align: center; padding: 2rem;">Error cargando el catálogo. Revisa la consola o recarga.</div>`;
    }
}

async function loadMoreCatalog() {
    const grid = document.getElementById('products-grid');
    if (!grid || catalogState.isLoading || !catalogState.hasMore) return;

    catalogState.isLoading = true;

    // Mostrar spinner de carga al final
    const sentinel = document.getElementById('catalog-sentinel');
    if (sentinel) {
        sentinel.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-muted);"><span style="font-size:1.5rem;animation:spin 1s linear infinite;display:inline-block;">⚡</span> Cargando más...</div>`;
    }

    const params = buildCatalogQuery();
    params.append('skip', String(catalogState.skip));
    params.append('limit', String(catalogState.limit));

    try {
        const response = await fetch(`/api/v1/phones?${params.toString()}`);
        if (!response.ok) throw new Error('Error');
        const data = await response.json();

        catalogState.skip += data.data.length;
        catalogState.hasMore = catalogState.skip < catalogState.total;

        // Remover spinner y añadir nuevas tarjetas antes del centinela
        const newSentinel = document.createElement('div');
        newSentinel.id = 'catalog-sentinel';
        newSentinel.style.gridColumn = '1 / -1';
        newSentinel.style.height = '20px';

        if (sentinel && sentinel.parentNode) {
            sentinel.insertAdjacentHTML('beforebegin', data.data.map(renderPhoneCard).join(''));
            sentinel.replaceWith(newSentinel);
        }
        if (catalogState.hasMore) initCatalogObserver();
    } catch (err) {
        const s = document.getElementById('catalog-sentinel');
        if (s) s.innerHTML = '';
    } finally {
        catalogState.isLoading = false;
    }
}

function scrollCatalogIntoView() {
    const el = document.querySelector('.catalog-container');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initSearch() {
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;

    const onIndex = !!document.getElementById('products-grid');

    // Si venimos de otra pagina con ?search=..., precargar el termino
    if (onIndex) {
        const urlSearch = new URLSearchParams(window.location.search).get('search');
        if (urlSearch) {
            searchInput.value = urlSearch;
            activeFilters.search = urlSearch.trim();
        }
    }

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        if (!onIndex) return; // En otras paginas solo se navega con Enter
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            activeFilters.search = e.target.value.trim();
            loadCatalog();
            scrollCatalogIntoView();
        }, 300);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const term = e.target.value.trim();
        if (!onIndex) {
            window.location.href = '/?search=' + encodeURIComponent(term);
            return;
        }
        clearTimeout(debounceTimer);
        activeFilters.search = term;
        loadCatalog();
        scrollCatalogIntoView();
    });
}

function initPriceSlider() {
    const slider = document.getElementById('price-range-slider');
    const label = document.getElementById('price-range-val');
    if (!slider || !label) return;

    slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        label.innerText = formatCOP(val);
        activeFilters.max_price = val;
    });

    slider.addEventListener('change', () => {
        loadCatalog();
    });
}

function initFilterListeners() {
    // Brand filters
    const brandPills = document.querySelectorAll('.brand-pill-filter');
    brandPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.preventDefault();
            brandPills.forEach(p => p.classList.remove('active'));
            const brandId = pill.dataset.brandId;
            if (activeFilters.brand_id == brandId) {
                activeFilters.brand_id = null;
            } else {
                pill.classList.add('active');
                activeFilters.brand_id = brandId ? parseInt(brandId) : null;
            }
            loadCatalog();
        });
    });

    // RAM filters
    const ramRadios = document.querySelectorAll('input[name="ram_filter"]');
    ramRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            activeFilters.ram_gb = e.target.value ? parseInt(e.target.value) : null;
            loadCatalog();
        });
    });

    // Storage filters
    const storageRadios = document.querySelectorAll('input[name="storage_filter"]');
    storageRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            activeFilters.storage_gb = e.target.value ? parseInt(e.target.value) : null;
            loadCatalog();
        });
    });

    // 5G checkbox
    const filter5G = document.getElementById('filter-5g-only');
    if (filter5G) {
        filter5G.addEventListener('change', (e) => {
            activeFilters.is_5g = e.target.checked ? true : null;
            loadCatalog();
        });
    }

    // Sort select
    const sortSelect = document.getElementById('sort-catalog-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            activeFilters.sort_by = e.target.value;
            loadCatalog();
        });
    }

    // Reset button
    const resetBtn = document.getElementById('btn-reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            activeFilters = {
                brand_id: null,
                min_price: null,
                max_price: null,
                ram_gb: null,
                storage_gb: null,
                is_5g: null,
                search: '',
                sort_by: 'created_at'
            };
            const searchInput = document.getElementById('search-input');
            if (searchInput) searchInput.value = '';
            document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
            if (filter5G) filter5G.checked = false;
            
            const slider = document.getElementById('price-range-slider');
            const label = document.getElementById('price-range-val');
            if (slider && label) {
                slider.value = 7000000;
                label.innerText = formatCOP(7000000);
            }

            brandPills.forEach(p => p.classList.remove('active'));
            loadCatalog();
            showToast('Filtros restablecidos', 'info');
        });
    }
}

// ================= Quick Phone Details Modal =================
async function openPhoneModal(phoneId) {
    const modal = document.getElementById('phone-detail-modal');
    const content = document.getElementById('phone-modal-content');
    if (!modal || !content) return;

    modal.classList.add('active');
    content.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 2rem; animation: spin 1s linear infinite;">⚡</div>
            <p>Cargando detalles...</p>
        </div>
    `;

    try {
        const response = await fetch(`/api/v1/phones/${phoneId}`);
        if (!response.ok) throw new Error('No se encontró el teléfono');
        const phone = await response.json();

        const currentPrice = phone.discount_price || phone.price;

        content.innerHTML = `
            <div class="phone-modal-grid">
                <div style="text-align: center;">
                    <img src="${phone.image_url}" alt="${phone.name}" style="max-width: 100%; max-height: 320px; object-fit: contain; border-radius: var(--radius-md);">
                    <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center;">
                        <span class="spec-pill" style="background: rgba(99,102,241,0.2); color: #818cf8;">Color: ${phone.color}</span>
                        <span class="spec-pill">Stock: ${phone.stock} u.</span>
                    </div>
                </div>
                <div>
                    <div style="font-size: 0.85rem; color: var(--accent); font-weight: 800; text-transform: uppercase;">
                        ${phone.brand ? phone.brand.name : 'Smartphone'}
                    </div>
                    <h2 style="font-size: 1.6rem; font-weight: 800; margin: 0.3rem 0 1rem; color: #fff;">${phone.name}</h2>
                    <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5;">${phone.description || 'Sin descripción.'}</p>

                    <h4 style="font-size: 1rem; color: #fff; margin-bottom: 0.8rem;">Especificaciones Técnicas:</h4>
                    <div class="specs-detail-grid" style="margin-bottom: 1.5rem;">
                        <div style="background: rgba(255,255,255,0.04); padding: 0.6rem; border-radius: 6px;">
                            <small style="color: var(--text-dim); display: block;">Procesador</small>
                            <strong>${phone.processor || 'N/A'}</strong>
                        </div>
                        <div style="background: rgba(255,255,255,0.04); padding: 0.6rem; border-radius: 6px;">
                            <small style="color: var(--text-dim); display: block;">Pantalla</small>
                            <strong>${phone.screen_size}" ${phone.screen_type || ''}</strong>
                        </div>
                        <div style="background: rgba(255,255,255,0.04); padding: 0.6rem; border-radius: 6px;">
                            <small style="color: var(--text-dim); display: block;">Memoria & Almacenamiento</small>
                            <strong>${phone.ram_gb} GB RAM / ${phone.storage_gb} GB</strong>
                        </div>
                        <div style="background: rgba(255,255,255,0.04); padding: 0.6rem; border-radius: 6px;">
                            <small style="color: var(--text-dim); display: block;">Cámara & Batería</small>
                            <strong>${phone.main_camera_mp} MP / ${phone.battery_mah} mAh</strong>
                        </div>
                    </div>

                    <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <div>
                            <span style="font-size: 1.8rem; font-weight: 800; color: #fff;">${formatCOP(currentPrice)}</span>
                            <div style="margin-top: 0.3rem;">
                                <a href="/phone/${phone.slug}" class="nav-btn" style="font-size: 0.85rem; padding: 0.4rem 0.8rem;">Ver página completa →</a>
                            </div>
                        </div>
                        <button class="nav-btn" style="background: var(--accent-gradient); color: #fff; padding: 0.8rem 1.5rem; font-size: 1rem;" onclick="addToCart(${phone.id}, '${phone.name.replace(/'/g, "\\'")}', ${currentPrice}, '${phone.image_url}', '${phone.color}', '${phone.storage_gb}GB'); closePhoneModal();">
                            🛒 Agregar al Carrito
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        content.innerHTML = `<div style="padding: 2rem; color: var(--danger); text-align: center;">Error al cargar información del producto.</div>`;
    }
}

function closePhoneModal() {
    const modal = document.getElementById('phone-detail-modal');
    if (modal) modal.classList.remove('active');
}

// ================= Checkout Flow =================
function openCheckoutModal() {
    if (cart.length === 0) {
        showToast('Agrega productos al carrito primero', 'error');
        return;
    }
    const modal = document.getElementById('checkout-modal');
    if (modal) {
        // Close cart drawer
        document.getElementById('cart-drawer-overlay').classList.remove('active');
        document.getElementById('cart-drawer').classList.remove('active');
        modal.classList.add('active');
    }
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.remove('active');
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    if (cart.length === 0) return;

    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = 'Procesando pedido...';

    const orderPayload = {
        customer_name: form.customer_name.value,
        customer_email: form.customer_email.value,
        customer_phone: form.customer_phone.value,
        shipping_address: form.shipping_address.value,
        city: form.city.value,
        postal_code: form.postal_code.value,
        payment_method: form.payment_method.value,
        items: cart.map(item => ({
            phone_id: item.phone_id,
            quantity: item.quantity
        }))
    };

    try {
        const response = await fetch('/api/v1/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Error al procesar la compra');
        }

        const order = await response.json();

        // Clear cart
        cart = [];
        saveCart();
        closeCheckoutModal();

        // Show Success Modal
        showOrderSuccessModal(order);

    } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerText = 'Confirmar y Pagar';
    }
}

function showOrderSuccessModal(order) {
    const modal = document.getElementById('order-success-modal');
    const content = document.getElementById('order-success-content');
    if (!modal || !content) return;

    content.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1.5rem;">
            <div style="font-size: 3.5rem; margin-bottom: 1rem;">🎉</div>
            <h2 style="font-size: 1.8rem; font-weight: 800; color: #fff; margin-bottom: 0.5rem;">¡Orden Realizada con Éxito!</h2>
            <p style="color: var(--text-muted); margin-bottom: 1.5rem;">Gracias por tu compra, <strong>${order.customer_name}</strong>. Hemos registrado tu pedido.</p>

            <div style="background: rgba(255,255,255,0.04); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem; margin-bottom: 1.5rem; text-align: left;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <span style="color: var(--text-muted);">Número de Orden:</span>
                    <strong style="color: var(--primary); font-family: monospace; font-size: 1.1rem;">${order.order_number}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
                    <span style="color: var(--text-muted);">Total Pagado:</span>
                    <strong style="color: #fff; font-size: 1.1rem;">${formatCOP(order.total)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
                    <span style="color: var(--text-muted);">Método de Pago:</span>
                    <span style="color: var(--text-main); text-transform: capitalize;">${order.payment_method}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: var(--text-muted);">Dirección de Envío:</span>
                    <span style="color: var(--text-main);">${order.shipping_address}, ${order.city}</span>
                </div>
            </div>

            <button class="nav-btn" style="background: var(--accent-gradient); color:#fff; width: 100%; padding: 0.8rem;" onclick="document.getElementById('order-success-modal').classList.remove('active');">
                Continuar Comprando
            </button>
        </div>
    `;

    modal.classList.add('active');
}
