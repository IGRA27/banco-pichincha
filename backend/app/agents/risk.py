from app.agents.base import AgentResult, SubAgent
from app.models import Escalation, OnboardingSession, StepStatus
from app.tools.gateway import ToolUnavailableError


class RiskAgent(SubAgent):
    name, step = "risk_agent", "RISK_SCREENING"

    def run(self, session: OnboardingSession) -> AgentResult:
        p = session.prospect
        try:
            call = self.gateway.call(self.name, "check_risk_lists",
                                     name=p.prospect_name, document_id=p.document_id)
        except ToolUnavailableError as e:
            return AgentResult(
                status=StepStatus.FAILED, tool="check_risk_lists", attempts=e.attempts, notes=str(e),
                escalation=Escalation(
                    reason="Servicio de listas de riesgo no disponible", source_agent=self.name,
                    severity="high",
                    proposed_solution="No abrir el producto sin screening. Reintentar por lote "
                                      "y notificar a Cumplimiento si excede el SLA.",
                ),
            )
        out = call.output
        base = dict(tool="check_risk_lists", output=out, attempts=call.attempts,
                    duration_ms=call.duration_ms, context_updates={"risk": out})
        if out["risk_level"] == "high":
            lists = ", ".join(m["list"] for m in out["matches"]) or "N/D"
            return AgentResult(
                status=StepStatus.ESCALATED, notes=f"Riesgo alto ({lists})",
                escalation=Escalation(
                    reason=f"Coincidencia de riesgo alto en {lists}", source_agent=self.name,
                    severity="high",
                    proposed_solution="Derivar al Oficial de Cumplimiento para descartar "
                                      "homonimia (fecha de nacimiento, nacionalidad) antes "
                                      "de cualquier vinculación. Congelar el proceso.",
                ),
                **base,
            )
        note = "Riesgo medio: aplicar debida diligencia ampliada" if out["risk_level"] == "medium" else "Sin coincidencias relevantes"
        return AgentResult(status=StepStatus.OK, notes=note, **base)
