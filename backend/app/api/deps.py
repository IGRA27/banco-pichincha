"""Composition root: construye las dependencias una sola vez por proceso."""
from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.llm.client import build_llm_client
from app.infrastructure.repository import SessionRepository, SQLiteSessionRepository
from app.orchestration.orchestrator import Orchestrator


@lru_cache
def get_repository() -> SessionRepository:
    return SQLiteSessionRepository(settings.database_path)


@lru_cache
def get_orchestrator() -> Orchestrator:
    return Orchestrator(get_repository(), llm=build_llm_client())
