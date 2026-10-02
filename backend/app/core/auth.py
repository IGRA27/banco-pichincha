"""Autenticación simple y segura (OWASP ASVS nivel básico).

* Contraseña almacenada solo como hash PBKDF2-SHA256 (600k iteraciones).
* Comparaciones en tiempo constante; mensaje de error genérico.
* Token firmado HMAC-SHA256 con expiración (stateless, sin dependencias).
* Límite de intentos de login por IP (anti fuerza bruta).

CLI para generar un hash:  python -m app.core.auth hash "<contraseña>"
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import sys
import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

ITERATIONS = 600_000
LOGIN_MAX_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300


def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    # Separador ":" (no "$") para que Docker Compose no lo interprete como variable
    return f"pbkdf2_sha256:{ITERATIONS}:{_b64e(salt)}:{_b64e(h)}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, it, salt, expected = stored.replace("$", ":").split(":")
        if algo != "pbkdf2_sha256":
            return False
        h = hashlib.pbkdf2_hmac("sha256", password.encode(), _b64d(salt), int(it))
        return hmac.compare_digest(h, _b64d(expected))
    except (ValueError, TypeError):
        return False


def _secret() -> bytes:
    s = os.getenv("AUTH_TOKEN_SECRET", "")
    if len(s) < 32:
        raise RuntimeError("AUTH_TOKEN_SECRET no configurado (mín. 32 caracteres)")
    return s.encode()


def issue_token(username: str) -> tuple[str, int]:
    ttl = int(os.getenv("AUTH_TOKEN_TTL_MINUTES", "480")) * 60
    payload = _b64e(json.dumps({"sub": username, "exp": int(time.time()) + ttl}).encode())
    sig = _b64e(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
    return f"{payload}.{sig}", ttl


def verify_token(token: str) -> str | None:
    try:
        payload, sig = token.split(".")
        good = _b64e(hmac.new(_secret(), payload.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(sig, good):
            return None
        data = json.loads(_b64d(payload))
        return data["sub"] if data["exp"] > time.time() else None
    except (ValueError, KeyError, TypeError):
        return None


# Dummy hash para igualar tiempos cuando el usuario no existe (anti enumeración)
_DUMMY_HASH = hash_password(secrets.token_urlsafe(16))
_attempts: dict[str, deque[float]] = defaultdict(deque)


def _window(key: str, now: float) -> deque[float]:
    w = _attempts[key]
    while w and now - w[0] > LOGIN_WINDOW_SECONDS:
        w.popleft()
    return w


def authenticate(username: str, password: str, ip: str) -> str:
    now = time.monotonic()
    by_ip, by_user = _window(f"ip:{ip}", now), _window(f"user:{username.lower()}", now)
    # Límite por IP y por usuario (falsear X-Forwarded-For no evita el bloqueo)
    if len(by_ip) >= LOGIN_MAX_ATTEMPTS or len(by_user) >= LOGIN_MAX_ATTEMPTS * 2:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                            "Demasiados intentos. Espera unos minutos.",
                            headers={"Retry-After": str(LOGIN_WINDOW_SECONDS)})
    expected_user = os.getenv("AUTH_USERNAME", "")
    stored = os.getenv("AUTH_PASSWORD_HASH", "")
    user_ok = bool(expected_user) and hmac.compare_digest(username.encode(), expected_user.encode())
    pass_ok = verify_password(password, stored if (user_ok and stored) else _DUMMY_HASH)
    if not (user_ok and pass_ok):
        by_ip.append(now)
        by_user.append(now)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario o contraseña incorrectos")
    by_ip.clear()
    by_user.clear()
    return username


_bearer = HTTPBearer(auto_error=False)


def require_user(creds: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    user = verify_token(creds.credentials) if creds else None
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada",
                            headers={"WWW-Authenticate": "Bearer"})
    return user


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    return (fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?"))


if __name__ == "__main__" and len(sys.argv) == 3 and sys.argv[1] == "hash":
    print(hash_password(sys.argv[2]))
