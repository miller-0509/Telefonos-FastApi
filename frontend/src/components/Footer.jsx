import React from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, ShieldCheck, Truck, CreditCard, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { isAdmin } = useAuth();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Banner de beneficios */}
        <div className="footer-features-grid">
          <div className="footer-feature-item">
            <Truck size={24} color="#818cf8" />
            <div>
              <h4>Envío Gratis</h4>
              <p>En pedidos mayores a $ 1.200.000 COP a toda Colombia</p>
            </div>
          </div>
          <div className="footer-feature-item">
            <ShieldCheck size={24} color="#818cf8" />
            <div>
              <h4>Garantía Oficial</h4>
              <p>12 meses de garantía directa de fábrica</p>
            </div>
          </div>
          <div className="footer-feature-item">
            <CreditCard size={24} color="#818cf8" />
            <div>
              <h4>Múltiples Medios de Pago</h4>
              <p>PSE, Nequi, Daviplata, Tarjetas y Contra entrega</p>
            </div>
          </div>
          <div className="footer-feature-item">
            <RotateCcw size={24} color="#818cf8" />
            <div>
              <h4>Compra Segura</h4>
              <p>Equipos 100% nuevos, homologados y libres para todo operador</p>
            </div>
          </div>
        </div>

        <div className="footer-main-grid">
          {/* Columna Marca */}
          <div className="footer-col">
            <div className="footer-logo">
              <Smartphone size={22} color="#818cf8" />
              <span>Electro<span className="gradient-text">Phone</span> Colombia</span>
            </div>
            <p className="footer-desc">
              Tu tienda especializada en venta de smartphones de alta gama, media y accesorios en Colombia. Precios transparentes con IVA incluido.
            </p>
          </div>

          {/* Columna Navegación */}
          <div className="footer-col">
            <h5>Navegación</h5>
            <ul className="footer-links">
              <li><Link to="/">Catálogo de Celulares</Link></li>
              <li><Link to="/track">Rastreador de Envíos</Link></li>
              <li><Link to="/login">Mi Cuenta</Link></li>
              {isAdmin && <li><Link to="/admin">Panel de Administración</Link></li>}
            </ul>
          </div>

          {/* Columna Marcas */}
          <div className="footer-col">
            <h5>Marcas Top</h5>
            <ul className="footer-links">
              <li><Link to="/?brand=apple">Apple iPhone</Link></li>
              <li><Link to="/?brand=samsung">Samsung Galaxy</Link></li>
              <li><Link to="/?brand=xiaomi">Xiaomi</Link></li>
              <li><Link to="/?brand=google">Google Pixel</Link></li>
              <li><Link to="/?brand=motorola">Motorola</Link></li>
            </ul>
          </div>

          {/* Columna Soporte */}
          <div className="footer-col">
            <h5>Atención al Cliente</h5>
            <p className="footer-contact-item">📍 Bogotá D.C., Colombia</p>
            <p className="footer-contact-item">📞 +57 (601) 345-6789</p>
            <p className="footer-contact-item">✉️ soporte@electrophone.com</p>
            <p className="footer-contact-item">🕒 Lunes a Sábado: 8:00 AM - 7:00 PM</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} ElectroPhone Colombia. Todos los derechos reservados. Desarrollado con FastAPI + React.</p>
        </div>
      </div>
    </footer>
  );
}
