import time
from collections import defaultdict, deque
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting simple en memoria por IP.

    Solo aplica a las rutas de autenticación para mitigar fuerza bruta.
    """

    def __init__(self, app, limit: int = 5, window_seconds: int = 60, protected_prefixes: tuple = None):
        super().__init__(app)
        self.limit = limit
        self.window_seconds = window_seconds
        self.protected_prefixes = protected_prefixes or ("/api/v1/auth/",)
        self._hits: dict[str, deque] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if any(path.startswith(prefix) for prefix in self.protected_prefixes) and request.method in ("POST",):
            client_ip = request.client.host if request.client else "unknown"
            now = time.monotonic()
            dq = self._hits[client_ip]
            # Limpiar timestamps fuera de la ventana
            while dq and now - dq[0] > self.window_seconds:
                dq.popleft()
            if len(dq) >= self.limit:
                retry_after = int(self.window_seconds - (now - dq[0]))
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Demasiados intentos. Intenta de nuevo más tarde."},
                    headers={"Retry-After": str(max(retry_after, 1))},
                )
            dq.append(now)
        return await call_next(request)


def get_client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"