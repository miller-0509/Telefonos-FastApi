import axios from 'axios';

// Vite reenvía /api al backend local; para otros entornos se puede
// configurar una URL absoluta mediante VITE_API_URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de peticiones para inyectar token JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('electrophone_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuestas para manejo centralizado de 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config ? error.config.url : '';
      // Si no es petición de login, limpiar sesión
      if (!url.includes('/auth/login') && !url.includes('/auth/token')) {
        localStorage.removeItem('electrophone_token');
        localStorage.removeItem('electrophone_user');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
