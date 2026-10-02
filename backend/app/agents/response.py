"""Agente de respuesta al cliente.

Redacta el mensaje final. Puede usar Claude para un tono natural, pero
con guardrails: no tiene herramientas, recibe solo la decisión ya tomada
por el motor de políticas y, ante cualquier falla, usa plantillas.
"""
from __future__ import annotations

import logging
import os

from app.agents.base import AgentResult, SubAgent
from app.core.config import settings
from app.domain.models import Decision, OnboardingSession, StepStatus

log = logging.getLogger("response_agent")

SYSTEM_PROMPT = (
    "Eres el asistente de onboarding digital de un banco ecuatoriano. Redacta un mensaje "
    "breve (máximo 90 palabras), cordial y en español para el prospecto. Comunica "
    "EXACTAMENTE la decisión indicada; no la cambies, no prometas plazos ni montos, no "
    "reveles listas de riesgo, puntajes ni motivos de cumplimiento. Si la decisión es "
    "REVISION_MANUAL di que un asesor revisará la solicitud. Si es APTO, lista los "
    "documentos a cargar. Responde solo con el mensaje."
)


PRODUCT_NAMES = {
    "cuenta_ahorros": "cuenta de ahorros",
    "cuenta_corriente": "cuenta corriente",
    "tarjeta_credito": "tarjeta de crédito",
}


def _template(s: OnboardingSession, decision: Decision) -> str:
    first = s.prospect.prospect_name.split()[0]
    product = PRODUCT_NAMES[s.prospect.product.value]
    if decision == Decision.APTO:
        docs = "\n".join(f"• {d.name}" for d in s.required_documents)
        return (f"¡Hola {first}! Tu solicitud de {product} fue pre-aprobada. "
                f"Para continuar, carga los siguientes documentos:\n{docs}")
    if decision == Decision.NO_APTO:
        return (f"Hola {first}, por ahora no podemos continuar con tu solicitud de {product} "
                "por canales digitales. Te invitamos a acercarte a una de nuestras agencias "
                "con tu cédula para ayudarte personalmente.")
    return (f"Hola {first}, recibimos tu solicitud de {product}. Necesitamos una validación "
            "adicional; un asesor la revisará y te contactará por tus canales registrados.")


class ResponseAgent(SubAgent):
    name, step = "response_agent", "CUSTOMER_RESPONSE"

    def __init__(self, gateway, client=None):
        super().__init__(gateway)
        self._client = client
        if self._client is None and settings.llm_enabled and os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                self._client = anthropic.Anthropic(timeout=20.0, max_retries=1)
            except Exception:  # pragma: no cover
                log.exception("No se pudo inicializar Anthropic; se usarán plantillas")

    def _llm(self, s: OnboardingSession, decision: Decision) -> str | None:
        if self._client is None:
            return None
        facts = {
            "nombre": s.prospect.prospect_name,
            "producto": s.prospect.product.value,
            "decision": decision.value,
            "documentos": [d.name for d in s.required_documents] if decision == Decision.APTO else [],
        }
        try:
            resp = self._client.beta.messages.create(
                model=settings.llm_model,
                max_tokens=1024,
                system=SYSTEM_PROMPT,
                output_config={"effort": "low"},
                betas=["server-side-fallback-2026-07-01"],
                extra_body={"fallbacks": "default"},
                messages=[{"role": "user", "content": f"Datos: {facts}"}],
            )
            if resp.stop_reason == "refusal":
                return None
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
            return text or None
        except Exception:
            log.exception("LLM falló; usando plantilla")
            return None

    def run(self, session: OnboardingSession) -> AgentResult:
        decision = session.decision or Decision.REVISION_MANUAL
        text = self._llm(session, decision)
        source = "llm" if text else "template"
        return AgentResult(
            status=StepStatus.OK, output={"source": source},
            notes=f"Mensaje generado ({source})",
            context_updates={"customer_message": text or _template(session, decision)},
        )
