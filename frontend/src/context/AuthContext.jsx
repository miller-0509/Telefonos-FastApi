import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('electrophone_token'));
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('electrophone_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem('electrophone_token');
    if (!currentToken) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data);
      localStorage.setItem('electrophone_user', JSON.stringify(response.data));
      return response.data;
    } catch (err) {
      console.warn('Error al obtener perfil actual:', err);
      localStorage.removeItem('electrophone_token');
      localStorage.removeItem('electrophone_user');
      setUser(null);
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { access_token, user: userData } = response.data;
      localStorage.setItem('electrophone_token', access_token);
      localStorage.setItem('electrophone_user', JSON.stringify(userData));
      setToken(access_token);
      setUser(userData);
      showToast(`¡Bienvenido de nuevo, ${userData.full_name}!`, 'success');
      return userData;
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al iniciar sesión';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const register = async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      showToast('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.', 'success', 5000);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error en el registro';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('electrophone_token');
    localStorage.removeItem('electrophone_user');
    setToken(null);
    setUser(null);
    showToast('Sesión cerrada correctamente', 'info');
  };

  const updateProfile = async (updateData) => {
    try {
      const response = await apiClient.put('/auth/me', updateData);
      setUser(response.data);
      localStorage.setItem('electrophone_user', JSON.stringify(response.data));
      showToast('Perfil actualizado correctamente', 'success');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al actualizar el perfil';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const deleteAccount = async () => {
    try {
      await apiClient.delete('/auth/me');
      logout();
      showToast('Tu cuenta ha sido eliminada', 'info');
    } catch (error) {
      const msg = error.response?.data?.detail || 'Error al eliminar la cuenta';
      showToast(msg, 'error');
      throw new Error(msg);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,
    isAdmin: !!(user && user.is_admin),
    login,
    register,
    logout,
    updateProfile,
    deleteAccount,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de AuthProvider');
  }
  return context;
}
