from app.agents.base import AgentResult, SubAgent
from app.config import settings
from app.models import Escalation, OnboardingSession, StepStatus
from app.tools.gateway import ToolUnavailableError


class IdentityAgent(SubAgent):
    name, step = "identity_agent", "IDENTITY_VERIFICATION"

    def run(self, session: OnboardingSession) -> AgentResult:
        doc = session.prospect.document_id
        try:
            call = self.gateway.call(self.name, "verify_identity", document_id=doc)
        except ToolUnavailableError as e:
            return AgentResult(
                status=StepStatus.FAILED, tool="verify_identity", attempts=e.attempts,
                notes=str(e),
                escalation=Escalation(
                    reason="Servicio de verificación de identidad no disponible",
                    source_agent=self.name, severity="medium",
                    proposed_solution="Reencolar la verificación en 15 min y, si persiste, "
                                      "agendar videollamada de validación con un asesor.",
                ),
            )
        out = call.output
        base = dict(tool="verify_identity", output=out, attempts=call.attempts,
                    duration_ms=call.duration_ms, context_updates={"identity": out})
        if not out["verified"]:
            return AgentResult(status=StepStatus.OK, notes="Identidad NO verificada", **base)
        if out["confidence"] < settings.identity_min_confidence:
            return AgentResult(
                status=StepStatus.ESCALATED,
                notes=f"Confianza {out['confidence']} < umbral {settings.identity_min_confidence}",
                escalation=Escalation(
                    reason=f"Confianza de identidad baja ({out['confidence']})",
                    source_agent=self.name, severity="medium",
                    proposed_solution="Solicitar prueba de vida biométrica (selfie + "
                                      "liveness) y validación de huella dactilar; si no "
                                      "supera, verificación presencial en agencia.",
                ),
                **base,
            )
        return AgentResult(status=StepStatus.OK, notes="Identidad verificada", **base)
