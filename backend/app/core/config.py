"""Configuración centralizada (12-factor: todo por variables de entorno).

En local se cargan desde `backend/.env` (nunca se versiona). En GCP los
secretos llegan desde Secret Manager como variables de entorno.
"""
import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env", override=False)


@dataclass(frozen=True)
class Settings:
    # Umbrales de negocio (requisitos técnicos del caso)
    identity_min_confidence: float = float(os.getenv("IDENTITY_MIN_CONFIDENCE", "0.8"))
    # Resiliencia de herramientas
    tool_max_attempts: int = int(os.getenv("TOOL_MAX_ATTEMPTS", "3"))
    tool_backoff_seconds: float = float(os.getenv("TOOL_BACKOFF_SECONDS", "0.05"))
    # Estado conversacional persistido en SQLite (en Cloud Run usar /tmp)
    database_path: str = os.getenv("DATABASE_PATH", "onboarding.db")
    # LLM (OpenAI). Sin OPENAI_API_KEY el sistema funciona con plantillas/reglas.
    llm_enabled: bool = os.getenv("LLM_ENABLED", "true").lower() != "false"
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    llm_timeout_seconds: float = float(os.getenv("LLM_TIMEOUT_SECONDS", "15"))
    llm_max_output_tokens: int = int(os.getenv("LLM_MAX_OUTPUT_TOKENS", "400"))
    # Seguridad HTTP
    cors_origins: list[str] = field(
        default_factory=lambda: os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    )
    rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))

    @property
    def openai_api_key(self) -> str | None:
        # Se lee bajo demanda y nunca se serializa ni se loguea
        return os.getenv("OPENAI_API_KEY") or None


settings = Settings()
