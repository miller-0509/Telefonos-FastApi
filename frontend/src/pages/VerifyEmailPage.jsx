import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { CheckCircle2, XCircle, ArrowRight, Smartphone } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [tokenInput, setTokenInput] = useState(tokenFromUrl);
  const [status, setStatus] = useState('idle'); // 'loading' | 'success' | 'error' | 'idle'
  const [message, setMessage] = useState('');

  const verifyToken = async (tok) => {
    if (!tok || !tok.trim()) return;
    setStatus('loading');
    setMessage('');
    try {
      const response = await apiClient.get(`/auth/verify-email?token=${tok.trim()}`);
      setStatus('success');
      setMessage(response.data.message || '¡Tu cuenta ha sido verificada exitosamente!');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.detail || 'El enlace de verificación no es válido o ha expirado.');
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      verifyToken(tokenFromUrl);
    }
  }, [tokenFromUrl]);

  return (
    <div className="verify-page-container">
      <div className="verify-card glass">
        <div className="logo-icon-wrap" style={{ display: 'inline-flex', marginBottom: '1rem' }}>
          <Smartphone size={32} color="#818cf8" />
        </div>
        <h2>Verificación de Cuenta</h2>

        {status === 'loading' && (
          <div className="verify-loading-state">
            <div className="spinner"></div>
            <p>Confirmando tu correo electrónico, por favor espera un momento...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-success-state">
            <CheckCircle2 size={56} color="#10b981" />
            <h3>¡Cuenta Verificada!</h3>
            <p>{message}</p>
            <Link to="/login" className="btn-primary">
              Iniciar Sesión Ahora <ArrowRight size={16} style={{ marginLeft: '6px' }} />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-error-state">
            <XCircle size={56} color="#ef4444" />
            <h3>Error de Verificación</h3>
            <p>{message}</p>
            <div className="verify-actions">
              <Link to="/login" className="btn-secondary">
                Volver a Iniciar Sesión
              </Link>
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div className="verify-manual-form">
            <p>Ingresa el token de verificación que recibiste por correo electrónico:</p>
            <form onSubmit={(e) => { e.preventDefault(); verifyToken(tokenInput); }}>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Pega aquí tu token..."
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn-primary btn-block">
                Verificar Mi Cuenta
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
