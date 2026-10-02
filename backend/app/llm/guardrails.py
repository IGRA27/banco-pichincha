"""Guardrails de entrada y salida para los agentes con LLM.

Entrada:
  * Minimización de PII: al LLM solo llega el primer nombre; nunca la
    cédula, listas de riesgo ni puntajes.
  * Datos del usuario delimitados y saneados (anti prompt-injection).
Salida:
  * Longitud máxima, sin URLs, sin datos sensibles de cumplimiento.
  * Coherencia con la decisión tomada por el motor de políticas.
"""
from __future__ import annotations

import re
import unicodedata

from app.domain.models import Decision

MAX_MESSAGE_CHARS = 900

_INJECTION = re.compile(
    r"(ignore|ignora|olvida|disregard).{0,40}(instrucc|instruction|reglas|rules)"
    r"|system\s*prompt|</?\s*(system|assistant)\s*>|\bjailbreak\b",
    re.IGNORECASE,
)
_FORBIDDEN_OUT = re.compile(
    r"\bOFAC\b|\bPEP\b|\bUAFE\b|lista[s]? (de )?(riesgo|restrictiva|negra)|sanci[oó]n|"
    r"confianza|score|puntaje|\b\d{10}\b|https?://|www\.",
    re.IGNORECASE,
)
_CONTRADICTIONS: dict[Decision, re.Pattern] = {
    Decision.APTO: re.compile(r"rechaz|no (es|eres) apto|no podemos continuar", re.IGNORECASE),
    Decision.NO_APTO: re.compile(r"aprobad|pre-?aprob|felicitaciones|bienvenid", re.IGNORECASE),
    Decision.REVISION_MANUAL: re.compile(r"aprobad|rechazad|felicitaciones", re.IGNORECASE),
}


def sanitize_text(value: str, max_len: int = 80) -> str:
    """Normaliza, elimina caracteres de control y trunca."""
    value = unicodedata.normalize("NFKC", value)
    value = "".join(c for c in value if c.isprintable())
    return value.replace("<", "").replace(">", "")[:max_len].strip()


def looks_like_injection(value: str) -> bool:
    return bool(_INJECTION.search(value))


def safe_first_name(full_name: str) -> str:
    name = sanitize_text(full_name).split()
    first = name[0] if name else "cliente"
    return "cliente" if looks_like_injection(full_name) else first


def validate_customer_message(text: str, decision: Decision) -> tuple[bool, str]:
    if not text or len(text) > MAX_MESSAGE_CHARS:
        return False, "longitud fuera de rango"
    if _FORBIDDEN_OUT.search(text):
        return False, "contiene información sensible o enlaces"
    if _CONTRADICTIONS[decision].search(text):
        return False, "contradice la decisión de la política"
    return True, "ok"
