"""ToolGateway: único punto por el que un agente puede invocar herramientas.

Responsabilidades (controles del orquestador):
  * Autorización por allowlist (principio de mínimo privilegio por agente).
  * Reintentos con backoff exponencial ante fallas transitorias.
  * Trazabilidad: cada invocación queda auditada.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, Callable

from app.core.config import settings
from app.tools import mocks

log = logging.getLogger("tool_gateway")

TOOLS: dict[str, Callable[..., dict[str, Any]]] = {
    "verify_identity": mocks.verify_identity,
    "check_risk_lists": mocks.check_risk_lists,
    "prepare_documentation": mocks.prepare_documentation,
}

# Matriz de permisos agente -> herramientas
PERMISSIONS: dict[str, frozenset[str]] = {
    "identity_agent": frozenset({"verify_identity"}),
    "risk_agent": frozenset({"check_risk_lists"}),
    "documentation_agent": frozenset({"prepare_documentation"}),
    "response_agent": frozenset(),  # solo redacta, no consulta sistemas
}


class ToolPermissionError(PermissionError):
    pass


class ToolUnavailableError(RuntimeError):
    def __init__(self, tool: str, attempts: int, last_error: str):
        super().__init__(f"{tool} no disponible tras {attempts} intentos: {last_error}")
        self.tool, self.attempts, self.last_error = tool, attempts, last_error


@dataclass
class ToolCall:
    output: dict[str, Any]
    attempts: int
    duration_ms: int


class ToolGateway:
    def __init__(self, permissions: dict[str, frozenset[str]] | None = None):
        self.permissions = permissions or PERMISSIONS

    def call(self, agent: str, tool: str, **kwargs: Any) -> ToolCall:
        if tool not in self.permissions.get(agent, frozenset()):
            log.warning("DENIED agent=%s tool=%s", agent, tool)
            raise ToolPermissionError(f"El agente '{agent}' no está autorizado a usar '{tool}'")
        fn = TOOLS[tool]
        start, last = time.perf_counter(), ""
        for attempt in range(1, settings.tool_max_attempts + 1):
            try:
                out = fn(**kwargs)
                ms = int((time.perf_counter() - start) * 1000)
                log.info("OK agent=%s tool=%s attempt=%d", agent, tool, attempt)
                return ToolCall(output=out, attempts=attempt, duration_ms=ms)
            except mocks.ToolTimeoutError as e:
                last = str(e)
                log.warning("RETRY agent=%s tool=%s attempt=%d err=%s", agent, tool, attempt, e)
                time.sleep(settings.tool_backoff_seconds * 2 ** (attempt - 1))
        raise ToolUnavailableError(tool, settings.tool_max_attempts, last)
