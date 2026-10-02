from app.agents.base import AgentResult, SubAgent
from app.domain.models import OnboardingSession, StepStatus


class DocumentationAgent(SubAgent):
    name, step = "documentation_agent", "DOCUMENTATION"

    def run(self, session: OnboardingSession) -> AgentResult:
        client_data = {
            "prospect_name": session.prospect.prospect_name,
            "document_id": session.prospect.document_id,
            "risk_level": (session.context.get("risk") or {}).get("risk_level"),
        }
        call = self.gateway.call(self.name, "prepare_documentation",
                                 product=session.prospect.product.value, client_data=client_data)
        return AgentResult(
            status=StepStatus.OK, tool="prepare_documentation", output=call.output,
            attempts=call.attempts, duration_ms=call.duration_ms,
            notes=f"{len(call.output['documents'])} documentos requeridos",
            context_updates={"documents": call.output["documents"]},
        )
