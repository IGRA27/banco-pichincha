"""Cliente LLM (OpenAI) detrás de una interfaz mínima.

Principios:
  * Salida estructurada con JSON Schema estricto: el modelo no puede
    devolver campos ni valores fuera del contrato.
  * Sin herramientas (no function calling): el LLM no actúa sobre sistemas.
  * Timeout y tope de tokens; cualquier error devuelve None y el llamador
    usa su fallback determinista (fail-safe, nunca fail-open).
"""
from __future__ import annotations

import json
import logging
from typing import Any, Protocol

from app.core.config import settings

log = logging.getLogger("llm")


class LLMClient(Protocol):
    def structured(self, system: str, user: str, schema_name: str,
                   schema: dict[str, Any]) -> dict[str, Any] | None: ...


class OpenAIClient:
    def __init__(self, api_key: str, model: str):
        from openai import OpenAI

        self._client = OpenAI(api_key=api_key, timeout=settings.llm_timeout_seconds, max_retries=1)
        self._model = model

    def structured(self, system: str, user: str, schema_name: str,
                   schema: dict[str, Any]) -> dict[str, Any] | None:
        try:
            resp = self._client.chat.completions.create(
                model=self._model,
                max_completion_tokens=settings.llm_max_output_tokens,
                messages=[{"role": "system", "content": system},
                          {"role": "user", "content": user}],
                response_format={"type": "json_schema", "json_schema": {
                    "name": schema_name, "schema": schema, "strict": True}},
            )
            choice = resp.choices[0]
            if choice.finish_reason != "stop" or getattr(choice.message, "refusal", None):
                log.warning("LLM sin respuesta válida: finish=%s", choice.finish_reason)
                return None
            return json.loads(choice.message.content or "")
        except Exception as e:  # red, auth, rate limit, JSON inválido...
            # Solo el tipo de error: nunca el payload (puede contener PII) ni la key
            log.warning("LLM falló (%s); se usa fallback determinista", type(e).__name__)
            return None


def build_llm_client() -> LLMClient | None:
    if not settings.llm_enabled or not settings.openai_api_key:
        log.info("LLM deshabilitado: se usan plantillas y reglas")
        return None
    log.info("LLM habilitado: OpenAI model=%s", settings.openai_model)
    return OpenAIClient(settings.openai_api_key, settings.openai_model)
