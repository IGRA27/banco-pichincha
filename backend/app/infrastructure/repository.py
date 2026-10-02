"""Repositorio de estado conversacional.

Interfaz `SessionRepository` + implementación SQLite. Para producción
basta otra implementación (Cloud SQL Postgres / Firestore) sin tocar
al orquestador.
"""
from __future__ import annotations

import sqlite3
import threading
from typing import Optional, Protocol

from app.domain.models import OnboardingSession


class SessionRepository(Protocol):
    def save(self, session: OnboardingSession) -> None: ...
    def get(self, session_id: str) -> Optional[OnboardingSession]: ...
    def list_recent(self, limit: int = 20) -> list[OnboardingSession]: ...


class SQLiteSessionRepository:
    def __init__(self, path: str):
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.execute(
            """CREATE TABLE IF NOT EXISTS sessions (
                   session_id TEXT PRIMARY KEY,
                   status     TEXT NOT NULL,
                   document_id TEXT NOT NULL,
                   payload    TEXT NOT NULL,
                   created_at TEXT NOT NULL,
                   updated_at TEXT NOT NULL)"""
        )
        self._conn.commit()

    def save(self, s: OnboardingSession) -> None:
        with self._lock:
            self._conn.execute(
                """INSERT INTO sessions VALUES (?,?,?,?,?,?)
                   ON CONFLICT(session_id) DO UPDATE SET
                     status=excluded.status, payload=excluded.payload,
                     updated_at=excluded.updated_at""",
                (s.session_id, s.status.value, s.prospect.document_id,
                 s.model_dump_json(), s.created_at, s.updated_at),
            )
            self._conn.commit()

    def get(self, session_id: str) -> Optional[OnboardingSession]:
        with self._lock:
            row = self._conn.execute(
                "SELECT payload FROM sessions WHERE session_id=?", (session_id,)
            ).fetchone()
        return OnboardingSession.model_validate_json(row[0]) if row else None

    def list_recent(self, limit: int = 20) -> list[OnboardingSession]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT payload FROM sessions ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [OnboardingSession.model_validate_json(r[0]) for r in rows]
