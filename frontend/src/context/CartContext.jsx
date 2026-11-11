import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import apiClient from '../api/client';
import { useToast } from './ToastContext';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem('electrophone_cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isCouponLoading, setIsCouponLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    localStorage.setItem('electrophone_cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (phone, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === phone.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        if (newQty > phone.stock) {
          showToast(`Solo hay ${phone.stock} unidades disponibles`, 'warning');
          updated[existingIndex].quantity = phone.stock;
        } else {
          updated[existingIndex].quantity = newQty;
          showToast(`Se actualizó la cantidad en el carrito`, 'info');
        }
        return updated;
      } else {
        if (phone.stock < quantity) {
          showToast(`Producto sin stock suficiente`, 'error');
          return prev;
        }
        showToast(`¡${phone.name} agregado al carrito!`, 'success');
        return [
          ...prev,
          {
            id: phone.id,
            name: phone.name,
            slug: phone.slug,
            price: phone.discount_price && phone.discount_price > 0 ? phone.discount_price : phone.price,
            originalPrice: phone.price,
            color: phone.color,
            storage_gb: phone.storage_gb,
            image_url: phone.image_url,
            stock: phone.stock,
            quantity: quantity,
          },
        ];
      }
    });
  };

  const removeFromCart = (phoneId) => {
    setItems((prev) => prev.filter((item) => item.id !== phoneId));
    showToast('Producto eliminado del carrito', 'info');
  };

  const updateQuantity = (phoneId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(phoneId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === phoneId) {
          if (newQuantity > item.stock) {
            showToast(`Máximo stock disponible: ${item.stock}`, 'warning');
            return { ...item, quantity: item.stock };
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    setCoupon(null);
    setCouponDiscount(0);
    localStorage.removeItem('electrophone_cart');
  };

  // Cálculos de totales
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [items]);

  const shippingCost = useMemo(() => {
    if (subtotal === 0) return 0;
    return subtotal >= 1200000 ? 0 : 20000;
  }, [subtotal]);

  // Recalcular cupón si cambia el subtotal
  useEffect(() => {
    if (!coupon || subtotal === 0) {
      setCouponDiscount(0);
      return;
    }
    const applyValidation = async () => {
      try {
        const response = await apiClient.post('/coupons/validate', {
          code: coupon.code,
          subtotal: subtotal,
        });
        setCouponDiscount(response.data.discount_amount);
      } catch (e) {
        setCoupon(null);
        setCouponDiscount(0);
      }
    };
    applyValidation();
  }, [coupon, subtotal]);

  const tax = useMemo(() => {
    const taxable = subtotal - couponDiscount + shippingCost;
    return taxable > 0 ? Math.round(taxable * 0.19) : 0;
  }, [subtotal, couponDiscount, shippingCost]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - couponDiscount + shippingCost + tax);
  }, [subtotal, couponDiscount, shippingCost, tax]);

  const itemCount = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity, 0);
  }, [items]);

  const applyCoupon = async (code) => {
    if (!code || !code.trim()) {
      showToast('Ingresa un código de cupón válido', 'warning');
      return;
    }
    if (subtotal === 0) {
      showToast('Agrega productos al carrito antes de aplicar un cupón', 'warning');
      return;
    }
    setIsCouponLoading(true);
    try {
      const response = await apiClient.post('/coupons/validate', {
        code: code.trim(),
        subtotal: subtotal,
      });
      setCoupon({ code: response.data.code });
      setCouponDiscount(response.data.discount_amount);
      showToast('¡Cupón aplicado con éxito!', 'success');
    } catch (error) {
      const msg = error.response?.data?.detail || 'Cupón inválido o expirado';
      showToast(msg, 'error');
      setCoupon(null);
      setCouponDiscount(0);
    } finally {
      setIsCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCoupon(null);
    setCouponDiscount(0);
    showToast('Cupón removido', 'info');
  };

  const value = {
    items,
    itemCount,
    isCartOpen,
    isCheckoutOpen,
    subtotal,
    shippingCost,
    tax,
    total,
    coupon,
    couponDiscount,
    isCouponLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    openCart: () => setIsCartOpen(true),
    closeCart: () => setIsCartOpen(false),
    openCheckout: () => {
      setIsCartOpen(false);
      setIsCheckoutOpen(true);
    },
    closeCheckout: () => setIsCheckoutOpen(false),
    applyCoupon,
    removeCoupon,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de CartProvider');
  }
  return context;
}
