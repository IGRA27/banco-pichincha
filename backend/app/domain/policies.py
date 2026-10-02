"""Políticas del banco (motor de reglas determinista y auditable).

La decisión de aptitud NUNCA la toma el LLM: la toma este motor a partir
de la evidencia que dejan los sub-agentes en el estado de la sesión.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.core.config import settings
from app.domain.models import Decision


@dataclass(frozen=True)
class ProductPolicy:
    allowed_risk: frozenset[str]
    min_identity_confidence: float = settings.identity_min_confidence


POLICIES: dict[str, ProductPolicy] = {
    "cuenta_ahorros": ProductPolicy(allowed_risk=frozenset({"low", "medium"})),
    "cuenta_corriente": ProductPolicy(allowed_risk=frozenset({"low", "medium"})),
    "tarjeta_credito": ProductPolicy(allowed_risk=frozenset({"low"}), min_identity_confidence=0.9),
}


@dataclass
class PolicyOutcome:
    decision: Decision
    reasons: list[str] = field(default_factory=list)


def evaluate(product: str, ctx: dict) -> PolicyOutcome:
    p = POLICIES[product]
    identity, risk = ctx.get("identity"), ctx.get("risk")
    reasons: list[str] = []

    # Reglas duras de rechazo
    if identity and identity.get("verified") is False:
        return PolicyOutcome(Decision.NO_APTO, ["La identidad no pudo ser verificada en el Registro Civil"])

    # Incertidumbre o evidencia faltante -> revisión humana
    if ctx.get("escalated"):
        return PolicyOutcome(Decision.REVISION_MANUAL, ["Existen verificaciones escaladas pendientes"])
    if identity is None or risk is None:
        return PolicyOutcome(Decision.REVISION_MANUAL, ["Evidencia incompleta"])
    if identity["confidence"] < p.min_identity_confidence:
        return PolicyOutcome(Decision.REVISION_MANUAL,
                             [f"Confianza de identidad {identity['confidence']} < {p.min_identity_confidence}"])
    if risk["risk_level"] not in p.allowed_risk:
        return PolicyOutcome(Decision.REVISION_MANUAL,
                             [f"Nivel de riesgo '{risk['risk_level']}' no admitido para {product}"])

    reasons.append("Identidad verificada y riesgo dentro del apetito del producto")
    if risk["risk_level"] == "medium":
        reasons.append("Requiere debida diligencia ampliada (EDD)")
    return PolicyOutcome(Decision.APTO, reasons)
