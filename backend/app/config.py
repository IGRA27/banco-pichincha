"""Configuración centralizada (12-factor: todo por variables de entorno)."""
import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class Settings:
    # Umbrales de negocio (requisitos técnicos del caso)
    identity_min_confidence: float = float(os.getenv("IDENTITY_MIN_CONFIDENCE", "0.8"))
    # Resiliencia de herramientas
    tool_max_attempts: int = int(os.getenv("TOOL_MAX_ATTEMPTS", "3"))
    tool_backoff_seconds: float = float(os.getenv("TOOL_BACKOFF_SECONDS", "0.05"))
    # Estado conversacional persistido en SQLite (en Cloud Run usar /tmp)
    database_path: str = os.getenv("DATABASE_PATH", "onboarding.db")
    # LLM opcional para el agente de respuesta (si no hay credenciales usa plantillas)
    llm_enabled: bool = os.getenv("LLM_ENABLED", "auto") != "false"
    llm_model: str = os.getenv("LLM_MODEL", "claude-opus-5")
    cors_origins: list[str] = field(
        default_factory=lambda: os.getenv("CORS_ORIGINS", "*").split(",")
    )


settings = Settings()
