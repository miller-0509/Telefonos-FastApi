import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import apiClient from '../api/client';
import { Smartphone, Mail, Lock, User, Phone, MapPin, ArrowRight, RefreshCw } from 'lucide-react';

export default function LoginPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Estados de login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estados de registro
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  // Reenvío de verificación
  const [showResend, setShowResend] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await login(loginEmail, loginPassword);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('verificada')) {
        setShowResend(true);
        setResendEmail(loginEmail);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    try {
      await register({
        full_name: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone_number: regPhone.trim() || null,
        address: regAddress.trim() || null,
      });
      setTab('login');
      setLoginEmail(regEmail);
    } catch (err) {
      // El error ya es mostrado por el toast del contexto
    } finally {
      setIsRegistering(false);
    }
  };

  const handleResendVerification = async (e) => {
    e.preventDefault();
    if (!resendEmail) return;
    setIsResending(true);
    try {
      await apiClient.post('/auth/resend-verification', { email: resendEmail });
      showToast('Enlace de verificación reenviado a tu correo', 'success');
      setShowResend(false);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Error al reenviar verificación', 'error');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass">
        {/* Logo */}
        <div className="auth-brand-header">
          <div className="logo-icon-wrap" style={{ display: 'inline-flex' }}>
            <Smartphone size={28} color="#818cf8" />
          </div>
          <h2>Electro<span className="gradient-text">Phone</span></h2>
          <p>Tu portal exclusivo de telefonía móvil</p>
        </div>

        {/* Selector de Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => setTab('login')}
          >
            Iniciar Sesión
          </button>
          <button
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => setTab('register')}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Tab Iniciar Sesión */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-email">Correo Electrónico</label>
              <div className="input-with-icon">
                <Mail size={18} color="#9ca3af" />
                <input
                  type="email"
                  id="login-email"
                  required
                  placeholder="ejemplo@electrophone.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Contraseña</label>
              <div className="input-with-icon">
                <Lock size={18} color="#9ca3af" />
                <input
                  type="password"
                  id="login-password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary btn-block" disabled={isLoggingIn}>
              {isLoggingIn ? 'Accediendo...' : 'Iniciar Sesión'}
            </button>

            {/* Reenvío de correo */}
            {showResend && (
              <div className="resend-box glass">
                <p>¿No te llegó el correo de confirmación?</p>
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={handleResendVerification}
                  disabled={isResending}
                >
                  <RefreshCw size={14} style={{ marginRight: '6px' }} />
                  {isResending ? 'Enviando...' : 'Reenviar Enlace de Activación'}
                </button>
              </div>
            )}

            <div className="auth-hint-card">
              <p>Credenciales de Administrador por defecto:</p>
              <code>admin@electrophone.com / admin123456</code>
            </div>
          </form>
        ) : (
          /* Tab Registro */
          <form onSubmit={handleRegisterSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="reg-name">Nombre Completo *</label>
              <div className="input-with-icon">
                <User size={18} color="#9ca3af" />
                <input
                  type="text"
                  id="reg-name"
                  required
                  placeholder="Ej: Andrés Gómez"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Correo Electrónico *</label>
              <div className="input-with-icon">
                <Mail size={18} color="#9ca3af" />
                <input
                  type="email"
                  id="reg-email"
                  required
                  placeholder="andres@correo.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-password">Contraseña *</label>
              <div className="input-with-icon">
                <Lock size={18} color="#9ca3af" />
                <input
                  type="password"
                  id="reg-password"
                  required
                  placeholder="Al menos 6 caracteres"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Celular (Opcional)</label>
              <div className="input-with-icon">
                <Phone size={18} color="#9ca3af" />
                <input
                  type="tel"
                  id="reg-phone"
                  placeholder="+57 310 123 4567"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-address">Dirección de Despacho (Opcional)</label>
              <div className="input-with-icon">
                <MapPin size={18} color="#9ca3af" />
                <input
                  type="text"
                  id="reg-address"
                  placeholder="Carrera 15 # 80-20, Bogotá"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary btn-block" disabled={isRegistering}>
              {isRegistering ? 'Creando Cuenta...' : 'Registrarme'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
