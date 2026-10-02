"""Genera un archivo .env local con credenciales aleatorias seguras.

Uso (desde Docker):  docker compose run --rm init
No sobrescribe un .env existente. La contraseña se muestra una sola vez
y solo se guarda su hash.
"""
from __future__ import annotations

import secrets
import string
import sys
from pathlib import Path

from app.core.auth import hash_password


def main(path: str) -> int:
    target = Path(path)
    if target.exists():
        print(f"Ya existe {target}; no se modifica. Bórralo si quieres regenerarlo.")
        return 0
    alphabet = string.ascii_letters + string.digits
    password = "-".join("".join(secrets.choice(alphabet) for _ in range(5)) for _ in range(4))
    target.write_text(
        "# Generado por init_env. NO subir a git.\n"
        "AUTH_USERNAME=evaluador\n"
        f"AUTH_PASSWORD_HASH={hash_password(password)}\n"
        f"AUTH_TOKEN_SECRET={secrets.token_urlsafe(48)}\n"
        "AUTH_TOKEN_TTL_MINUTES=480\n"
        "\n# Opcional: sin key funciona con reglas y plantillas\n"
        "OPENAI_API_KEY=\n"
        "OPENAI_MODEL=gpt-5-mini\n"
        "OPENAI_REASONING_EFFORT=low\n"
        "LLM_TIMEOUT_SECONDS=30\n"
        "LLM_MAX_OUTPUT_TOKENS=2000\n",
        encoding="utf-8",
    )
    print("\n  .env creado. Credenciales para ingresar (guárdalas, no se vuelven a mostrar):")
    print("    usuario:    evaluador")
    print(f"    contraseña: {password}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else ".env"))
