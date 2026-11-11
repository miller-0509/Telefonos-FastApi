from sqlalchemy.orm import Session
from app.modules.inventario.models import Brand, Phone
from app.modules.login.models import User
from app.core.security import get_password_hash
from app.core.config import settings

def seed_database(db: Session) -> None:
    # Check if admin exists
    admin = db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first()
    if not admin:
        admin = User(
            full_name="Administrador ElectroPhone Colombia",
            email=settings.FIRST_ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
            phone_number="+57 310 987 6543",
            address="Carrera 15 # 85-30, Bogotá D.C.",
            is_admin=True,
            is_active=True,
            is_verified=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
    elif not admin.is_verified:
        # Asegura que el admin existente quede verificado (para poder iniciar sesión)
        admin.is_verified = True
        admin.verification_token = None
        admin.verification_token_expires = None
        db.commit()
        db.refresh(admin)

    # If brands don't exist, create them
    if db.query(Brand).count() == 0:
        brands_data = [
            {
                "name": "Apple",
                "slug": "apple",
                "logo_url": "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
                "description": "Innovación, diseño premium y el ecosistema iOS más avanzado del mundo."
            },
            {
                "name": "Samsung",
                "slug": "samsung",
                "logo_url": "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
                "description": "Líder en pantallas Dynamic AMOLED 2X, inteligencia artificial Galaxy AI y fotografía profesional."
            },
            {
                "name": "Xiaomi",
                "slug": "xiaomi",
                "logo_url": "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg",
                "description": "Tecnología de gama alta y cámaras Leica con la mejor relación calidad-precio."
            },
            {
                "name": "Google",
                "slug": "google",
                "logo_url": "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
                "description": "La experiencia Android más pura potenciada por Google Tensor y fotografía computacional."
            },
            {
                "name": "OnePlus",
                "slug": "oneplus",
                "logo_url": "https://upload.wikimedia.org/wikipedia/commons/f/f8/OP_LU_Reg_1_Line_R_RGB.svg",
                "description": "Rendimiento extremo 'Never Settle', carga ultra rápida SuperVOOC y pantalla ProXDR."
            },
            {
                "name": "Motorola",
                "slug": "motorola",
                "logo_url": "https://upload.wikimedia.org/wikipedia/commons/e/e0/Motorola_new_logo.svg",
                "description": "Diseños elegantes con acabados en cuero vegano Pantone y experiencia fluida My UX."
            }
        ]

        brand_objs = {}
        for b_data in brands_data:
            brand = Brand(**b_data)
            db.add(brand)
            db.flush()
            brand_objs[brand.slug] = brand

        # Seed Phones with realistic Colombian Pesos (COP)
        phones_data = [
            {
                "brand_id": brand_objs["apple"].id,
                "name": "iPhone 15 Pro Max",
                "slug": "iphone-15-pro-max-256gb-titanio-natural",
                "model_code": "A3106",
                "description": "Diseñado en titanio aeroespacial, chip A17 Pro revolucionario, botón de Acción personalizable y sistema de cámaras Pro con teleobjetivo 5x.",
                "price": 5499900.0,
                "discount_price": 4999900.0,
                "stock": 18,
                "ram_gb": 8,
                "storage_gb": 256,
                "color": "Titanio Natural",
                "screen_size": 6.7,
                "screen_type": "Super Retina XDR OLED 120Hz ProMotion",
                "processor": "Apple A17 Pro (3nm)",
                "battery_mah": 4422,
                "main_camera_mp": 48,
                "front_camera_mp": 12,
                "os": "iOS 17",
                "is_5g": True,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80",
                "rating": 4.9,
                "rating_count": 84
            },
            {
                "brand_id": brand_objs["samsung"].id,
                "name": "Samsung Galaxy S24 Ultra",
                "slug": "samsung-galaxy-s24-ultra-512gb-titanium-black",
                "model_code": "SM-S928B",
                "description": "El titán de Android con Galaxy AI integrada, marco de titanio, S Pen incorporado, pantalla plana Dynamic AMOLED 2X y cámara principal de 200MP.",
                "price": 5899900.0,
                "discount_price": 5299900.0,
                "stock": 14,
                "ram_gb": 12,
                "storage_gb": 512,
                "color": "Titanium Black",
                "screen_size": 6.8,
                "screen_type": "Dynamic AMOLED 2X 120Hz 2600 nits",
                "processor": "Snapdragon 8 Gen 3 for Galaxy",
                "battery_mah": 5000,
                "main_camera_mp": 200,
                "front_camera_mp": 12,
                "os": "Android 14 (One UI 6.1)",
                "is_5g": True,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80",
                "rating": 4.9,
                "rating_count": 67
            },
            {
                "brand_id": brand_objs["xiaomi"].id,
                "name": "Xiaomi 14 Ultra",
                "slug": "xiaomi-14-ultra-512gb-black",
                "model_code": "24030PN60G",
                "description": "Óptica legendaria Leica Vario-Summilux con sensor de 1 pulgada, apertura variable, Snapdragon 8 Gen 3 y carga hiper rápida de 90W.",
                "price": 4899900.0,
                "discount_price": 4399900.0,
                "stock": 10,
                "ram_gb": 16,
                "storage_gb": 512,
                "color": "Negro Cuero Vegano",
                "screen_size": 6.73,
                "screen_type": "LTPO AMOLED 120Hz Dolby Vision",
                "processor": "Snapdragon 8 Gen 3",
                "battery_mah": 5000,
                "main_camera_mp": 50,
                "front_camera_mp": 32,
                "os": "Android 14 (Xiaomi HyperOS)",
                "is_5g": True,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80",
                "rating": 4.8,
                "rating_count": 42
            },
            {
                "brand_id": brand_objs["google"].id,
                "name": "Google Pixel 8 Pro",
                "slug": "google-pixel-8-pro-256gb-obsidian",
                "model_code": "GC3VE",
                "description": "El smartphone de Google impulsado por el chip Tensor G3. Funciones exclusivas de IA como Magic Editor, Mejor Toma y 7 años de actualizaciones.",
                "price": 3899900.0,
                "discount_price": 3499900.0,
                "stock": 15,
                "ram_gb": 12,
                "storage_gb": 256,
                "color": "Obsidian",
                "screen_size": 6.7,
                "screen_type": "Super Actua display LTPO OLED 120Hz",
                "processor": "Google Tensor G3 + Titan M2",
                "battery_mah": 5050,
                "main_camera_mp": 50,
                "front_camera_mp": 10,
                "os": "Android 14 Pure",
                "is_5g": True,
                "is_featured": True,
                "image_url": "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80",
                "rating": 4.7,
                "rating_count": 39
            },
            {
                "brand_id": brand_objs["oneplus"].id,
                "name": "OnePlus 12",
                "slug": "oneplus-12-512gb-silky-black",
                "model_code": "CPH2581",
                "description": "Rendimiento supremo con 16GB RAM LPDDR5X, cámara Hasselblad de 4ta generación, pantalla 2K ProXDR a 4500 nits y carga 100W.",
                "price": 3699900.0,
                "discount_price": 3299900.0,
                "stock": 12,
                "ram_gb": 16,
                "storage_gb": 512,
                "color": "Silky Black",
                "screen_size": 6.82,
                "screen_type": "ProXDR LTPO AMOLED 120Hz",
                "processor": "Snapdragon 8 Gen 3",
                "battery_mah": 5400,
                "main_camera_mp": 50,
                "front_camera_mp": 32,
                "os": "OxygenOS 14 (Android 14)",
                "is_5g": True,
                "is_featured": False,
                "image_url": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&auto=format&fit=crop&q=80",
                "rating": 4.8,
                "rating_count": 28
            },
            {
                "brand_id": brand_objs["motorola"].id,
                "name": "Motorola Edge 50 Ultra",
                "slug": "motorola-edge-50-ultra-512gb-peach-fuzz",
                "model_code": "XT2401-2",
                "description": "Elegancia certificada por Pantone con acabado en madera real o cuero vegano, certificación IP68, teleobjetivo periscopio 3x y carga TurboPower 125W.",
                "price": 3599900.0,
                "discount_price": 3199900.0,
                "stock": 9,
                "ram_gb": 16,
                "storage_gb": 512,
                "color": "Peach Fuzz Pantone",
                "screen_size": 6.7,
                "screen_type": "pOLED 144Hz Super HD 1.5K",
                "processor": "Snapdragon 8s Gen 3",
                "battery_mah": 4500,
                "main_camera_mp": 50,
                "front_camera_mp": 50,
                "os": "Android 14 (Hello UI)",
                "is_5g": True,
                "is_featured": False,
                "image_url": "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80",
                "rating": 4.6,
                "rating_count": 19
            },
            {
                "brand_id": brand_objs["apple"].id,
                "name": "iPhone 15",
                "slug": "iphone-15-128gb-azul",
                "model_code": "A3090",
                "description": "Dynamic Island, cámara principal de 48 MP con teleobjetivo de 2x y diseño resistente de vidrio con infusión de color y aluminio.",
                "price": 3699900.0,
                "discount_price": 3399900.0,
                "stock": 25,
                "ram_gb": 6,
                "storage_gb": 128,
                "color": "Azul Pastel",
                "screen_size": 6.1,
                "screen_type": "Super Retina XDR OLED",
                "processor": "Apple A16 Bionic",
                "battery_mah": 3349,
                "main_camera_mp": 48,
                "front_camera_mp": 12,
                "os": "iOS 17",
                "is_5g": True,
                "is_featured": False,
                "image_url": "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80",
                "rating": 4.8,
                "rating_count": 55
            },
            {
                "brand_id": brand_objs["samsung"].id,
                "name": "Samsung Galaxy A55 5G",
                "slug": "samsung-galaxy-a55-5g-256gb-awesome-iceblue",
                "model_code": "SM-A556B",
                "description": "El rey de la gama media con marco de metal premium, pantalla Super AMOLED de 120Hz, cámara triple de 50 MP y resistencia al agua IP67.",
                "price": 1799900.0,
                "discount_price": 1499900.0,
                "stock": 30,
                "ram_gb": 8,
                "storage_gb": 256,
                "color": "Awesome Iceblue",
                "screen_size": 6.6,
                "screen_type": "Super AMOLED 120Hz Vision Booster",
                "processor": "Exynos 1480 con GPU AMD",
                "battery_mah": 5000,
                "main_camera_mp": 50,
                "front_camera_mp": 32,
                "os": "Android 14 (One UI 6.1)",
                "is_5g": True,
                "is_featured": False,
                "image_url": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80",
                "rating": 4.6,
                "rating_count": 72
            }
        ]

        for p_data in phones_data:
            phone = Phone(**p_data)
            db.add(phone)

        db.commit()
    else:
        # Update existing phones if prices were in USD
        phones_updates = {
            "iphone-15-pro-max-256gb-titanio-natural": (5499900.0, 4999900.0),
            "samsung-galaxy-s24-ultra-512gb-titanium-black": (5899900.0, 5299900.0),
            "xiaomi-14-ultra-512gb-black": (4899900.0, 4399900.0),
            "google-pixel-8-pro-256gb-obsidian": (3899900.0, 3499900.0),
            "oneplus-12-512gb-silky-black": (3699900.0, 3299900.0),
            "motorola-edge-50-ultra-512gb-peach-fuzz": (3599900.0, 3199900.0),
            "iphone-15-128gb-azul": (3699900.0, 3399900.0),
            "samsung-galaxy-a55-5g-256gb-awesome-iceblue": (1799900.0, 1499900.0),
        }
        for slug, (pr, dpr) in phones_updates.items():
            phone = db.query(Phone).filter(Phone.slug == slug).first()
            if phone:
                phone.price = pr
                phone.discount_price = dpr
        db.commit()
