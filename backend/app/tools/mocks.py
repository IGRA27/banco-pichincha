"""Herramientas mock (Tool 1, 2, 3 del caso).

Son deterministas por `document_id` para que los escenarios de la demo
sean reproducibles. En producción se reemplazan por adaptadores al
Registro Civil, listas OFAC/ONU/UAFE y al motor documental del banco.
"""
from __future__ import annotations

import hashlib
from typing import Any


class ToolTimeoutError(Exception):
    """Falla transitoria del proveedor externo (reintentable)."""


# Escenarios de demo: document_id -> comportamiento
SCENARIOS: dict[str, dict[str, Any]] = {
    "1712345678": {"label": "Camino feliz", "name": "Juan Perez", "expected": "APTO"},
    "0912345678": {"label": "Identidad ambigua (confianza 0.62)", "name": "Maria Lopez", "expected": "REVISION_MANUAL",
                   "identity": {"verified": True, "confidence": 0.62}},
    "1799999999": {"label": "Coincidencia en lista de riesgo (high)", "name": "Carlos Ruiz", "expected": "REVISION_MANUAL",
                   "risk": {"risk_level": "high", "matches": [{"list": "OFAC-SDN", "score": 0.93, "entry": "RUIZ, Carlos A."}]}},
    "1755555555": {"label": "Riesgo medio (debida diligencia ampliada)", "name": "Ana Torres", "expected": "APTO",
                   "risk": {"risk_level": "medium", "matches": [{"list": "PEP-EC", "score": 0.71, "entry": "TORRES, Ana"}]}},
    "0000000000": {"label": "Identidad no verificada", "name": "Pedro Gomez", "expected": "NO_APTO",
                   "identity": {"verified": False, "confidence": 0.97}},
    "1700000500": {"label": "Proveedor de identidad caído", "name": "Luis Vera", "expected": "REVISION_MANUAL",
                   "identity_error": "always"},
    "1700000501": {"label": "Falla transitoria + reintento OK", "name": "Sofia Mena", "expected": "APTO",
                   "identity_error": "once"},
}

_flaky_calls: dict[str, int] = {}


def _stable_ratio(seed: str) -> float:
    return int(hashlib.sha256(seed.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def verify_identity(document_id: str) -> dict[str, Any]:
    """Tool 1 -> {"verified": bool, "confidence": 0.0-1.0}"""
    sc = SCENARIOS.get(document_id, {})
    err = sc.get("identity_error")
    if err == "always":
        raise ToolTimeoutError("Registro Civil no responde (timeout 5s)")
    if err == "once":
        n = _flaky_calls.get(document_id, 0)
        _flaky_calls[document_id] = n + 1
        if n % 2 == 0:
            raise ToolTimeoutError("Registro Civil: 503 Service Unavailable")
    if "identity" in sc:
        return dict(sc["identity"])
    # Fuera de escenarios: confianza alta y estable por documento
    return {"verified": True, "confidence": round(0.85 + 0.15 * _stable_ratio(document_id), 2)}


def check_risk_lists(name: str, document_id: str) -> dict[str, Any]:
    """Tool 2 -> {"risk_level": "low|medium|high", "matches": []}"""
    sc = SCENARIOS.get(document_id, {})
    if "risk" in sc:
        return {"risk_level": sc["risk"]["risk_level"], "matches": list(sc["risk"]["matches"])}
    return {"risk_level": "low", "matches": []}


_DOCS: dict[str, list[dict[str, Any]]] = {
    "cuenta_ahorros": [
        {"code": "CED", "name": "Cédula de identidad (anverso y reverso)", "mandatory": True},
        {"code": "SELFIE", "name": "Selfie con prueba de vida", "mandatory": True},
        {"code": "SERV", "name": "Planilla de servicio básico (domicilio)", "mandatory": True},
        {"code": "CONTR_AH", "name": "Contrato de cuenta de ahorros (firma electrónica)", "mandatory": True},
    ],
    "cuenta_corriente": [
        {"code": "CED", "name": "Cédula de identidad (anverso y reverso)", "mandatory": True},
        {"code": "SELFIE", "name": "Selfie con prueba de vida", "mandatory": True},
        {"code": "ING", "name": "Certificado de ingresos o RUC", "mandatory": True},
        {"code": "REF_BAN", "name": "Referencia bancaria", "mandatory": True},
        {"code": "CONTR_CC", "name": "Contrato de cuenta corriente", "mandatory": True},
    ],
    "tarjeta_credito": [
        {"code": "CED", "name": "Cédula de identidad (anverso y reverso)", "mandatory": True},
        {"code": "ING", "name": "Roles de pago de los últimos 3 meses", "mandatory": True},
        {"code": "BURO", "name": "Autorización de consulta a buró de crédito", "mandatory": True},
        {"code": "CONTR_TC", "name": "Contrato de tarjeta de crédito", "mandatory": True},
    ],
}


def prepare_documentation(product: str, client_data: dict[str, Any]) -> dict[str, Any]:
    """Tool 3 -> documentos requeridos según política del producto."""
    docs = [dict(d) for d in _DOCS.get(product, [])]
    if client_data.get("risk_level") == "medium":
        docs.append({"code": "EDD", "name": "Formulario de debida diligencia ampliada y origen de fondos", "mandatory": True})
    return {"product": product, "documents": docs}
