import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings


def build_verification_url(token: str) -> str:
    base = settings.APP_BASE_URL.rstrip("/")
    return f"{base}/verify-email?token={token}"


def _send_email(to_email: str, subject: str, text: str, html: str) -> bool:
    """Envía un correo por SMTP. Sin SMTP configurado, imprime el contenido por consola (modo dev)."""
    if not settings.SMTP_HOST:
        print("\n" + "=" * 70)
        print("[DEV] No hay SMTP configurado. Correo:")
        print(f"   Para: {to_email}")
        print(f"   Asunto: {subject}")
        print(f"   Cuerpo (texto): {text[:200]}")
        print("=" * 70 + "\n")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=30) as server:
            server.starttls()
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        return True
    except Exception as exc:
        print(f"[ERROR] No se pudo enviar correo a {to_email}: {exc}")
        return False


def _render_verification_email(user_name: str, verify_url: str) -> tuple[str, str]:
    subject = "Confirma tu correo en ElectroPhone Store"
    html = f"""\
<html>
<body style="margin:0;padding:0;background:#0f1222;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1222;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1a1f3d;border-radius:16px;overflow:hidden;border:1px solid #2a3158;">
        <tr>
          <td align="center" style="padding:28px 24px 12px;">
            <div style="font-size:14px;font-weight:700;color:#818cf8;letter-spacing:1px;">📱 ELECTROPHONE STORE</div>
            <h1 style="color:#ffffff;font-size:22px;margin:12px 0 4px;">Verificación de correo</h1>
            <p style="color:#9aa3c7;font-size:14px;line-height:1.6;margin:8px 0;">Hola <strong style="color:#ffffff;">{user_name}</strong>, activá tu cuenta para comenzar a comprar celulares en Colombia.</p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:16px 24px;">
            <a href="{verify_url}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;display:inline-block;">Confirmar mi correo</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:12px 24px 8px;">
            <p style="color:#6b7294;font-size:12px;line-height:1.6;margin:0;">Si el botón no funciona, copiá este enlace en tu navegador:</p>
            <p style="color:#818cf8;font-size:12px;word-break:break-all;margin:6px 0 0;"><a href="{verify_url}" style="color:#818cf8;">{verify_url}</a></p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:20px 24px;background:#141831;">
            <p style="color:#5c6387;font-size:11px;margin:0;">Este enlace expira en {settings.VERIFICATION_TOKEN_EXPIRE_HOURS} horas. Si no solicitaste esta verificación, podés ignorar este correo.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    text = f"Confirmá tu correo en ElectroPhone Store: {verify_url}"
    return subject, text, html


def send_verification_email(to_email: str, user_name: str, token: str) -> bool:
    """Envía el correo de verificación. Sin SMTP configurado, imprime el enlace por consola."""
    verify_url = build_verification_url(token)
    subject, text, html = _render_verification_email(user_name, verify_url)
    return _send_email(to_email, subject, text, html)


def format_cop(value: float) -> str:
    try:
        val_int = int(round(float(value)))
        return f"${val_int:,}".replace(",", ".")
    except (ValueError, TypeError):
        return f"${value}"


def send_order_confirmation_email(to_email: str, customer_name: str, order: dict) -> bool:
    """Envía el correo de confirmación de una compra con el resumen de la orden."""
    items_html = "".join(
        f"<tr><td style='padding:8px 0;color:#e6e8f5;'>{item['phone_name']} x{item['quantity']}</td>"
        f"<td style='padding:8px 0;color:#a5b4fc;text-align:right;font-weight:700;'>{format_cop(item['subtotal'])}</td></tr>"
        for item in order.get("items", [])
    )
    subject = f"Tu pedido {order.get('order_number', '')} fue confirmado - ElectroPhone"
    text = (
        f"Hola {customer_name}, tu pedido {order.get('order_number', '')} fue confirmado.\n"
        f"Total: {format_cop(order.get('total', 0))}\n"
        f"Puedes rastrearlo con tu código de seguimiento."
    )
    html = f"""\
<html>
<body style="margin:0;padding:0;background:#0f1222;font-family:Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1222;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1a1f3d;border-radius:16px;overflow:hidden;border:1px solid #2a3158;">
        <tr>
          <td style="padding:28px 24px 12px;">
            <div style="font-size:14px;font-weight:700;color:#818cf8;letter-spacing:1px;">📱 ELECTROPHONE STORE</div>
            <h1 style="color:#ffffff;font-size:22px;margin:12px 0 4px;">¡Gracias por tu compra!</h1>
            <p style="color:#9aa3c7;font-size:14px;line-height:1.6;margin:8px 0;">Hola <strong style="color:#ffffff;">{customer_name}</strong>, confirmamos tu pedido y pronto lo estaremos despachando.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px;">
            <div style="background:#141831;border-radius:10px;padding:16px;">
              <div style="color:#6b7294;font-size:12px;margin-bottom:6px;">NÚMERO DE ORDEN</div>
              <div style="color:#818cf8;font-size:18px;font-weight:800;letter-spacing:1px;">{order.get('order_number', '')}</div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              {items_html}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;">
            <div style="border-top:1px solid #2a3158;padding-top:12px;display:flex;justify-content:space-between;">
              <span style="color:#9aa3c7;">Total</span>
              <span style="color:#ffffff;font-size:20px;font-weight:800;">{format_cop(order.get('total', 0))}</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 24px 24px;">
            <p style="color:#6b7294;font-size:12px;line-height:1.6;margin:0;">Método de pago: {order.get('payment_method', '')} · Envío a {order.get('shipping_address', '')}, {order.get('city', '')}. Usa el número de orden para rastrear tu pedido.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    return _send_email(to_email, subject, text, html)