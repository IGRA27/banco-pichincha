"""Middlewares de seguridad HTTP: cabeceras defensivas y rate limiting."""
from __future__ import annotations

import time
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

MAX_BODY_BYTES = 8 * 1024

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",  # respuestas con datos personales
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}


class SecurityMiddleware(BaseHTTPMiddleware):
    """Rate limit por IP (ventana deslizante en memoria) + límite de body + cabeceras."""

    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.method == "POST":
            if int(request.headers.get("content-length") or 0) > MAX_BODY_BYTES:
                return JSONResponse({"detail": "Solicitud demasiado grande"}, status_code=413)
            ip = (request.headers.get("x-forwarded-for") or request.client.host or "?").split(",")[0].strip()
            now, window = time.monotonic(), self._hits[ip]
            while window and now - window[0] > 60:
                window.popleft()
            if len(window) >= settings.rate_limit_per_minute:
                return JSONResponse({"detail": "Demasiadas solicitudes, intenta en un minuto"},
                                    status_code=429, headers={"Retry-After": "60"})
            window.append(now)
        response = await call_next(request)
        response.headers.update(SECURITY_HEADERS)
        return response
