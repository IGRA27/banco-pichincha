"""Orquestador principal.

Patrón: supervisor determinista + máquina de estados.
  RECEIVED -> IDENTITY_VERIFICATION -> RISK_SCREENING -> POLICY_DECISION
           -> DOCUMENTATION (solo si APTO) -> CUSTOMER_RESPONSE -> FIN

* Controla qué herramientas usa cada agente (ToolGateway + allowlist).
* Maneja el estado entre pasos (session.context = blackboard) y lo
  persiste tras cada paso (recuperable ante caídas).
* Mitiga incertidumbre: reintentos, umbrales de confianza y escalamiento
  human-in-the-loop con solución propuesta.
"""
from __future__ import annotations

import logging

from app.domain import policies
from app.agents.base import AgentResult, SubAgent
from app.agents.documentation import DocumentationAgent
from app.agents.identity import IdentityAgent
from app.agents.response import ResponseAgent
from app.agents.risk import RiskAgent
from app.domain.models import (Decision, OnboardingRequest, OnboardingSession, RequiredDocument,
                        ResolveRequest, SessionStatus, StepResult, StepStatus)
from app.infrastructure.repository import SessionRepository
from app.tools.gateway import ToolGateway

log = logging.getLogger("orchestrator")

_STATUS_BY_DECISION = {
    Decision.APTO: SessionStatus.APPROVED,
    Decision.NO_APTO: SessionStatus.REJECTED,
    Decision.REVISION_MANUAL: SessionStatus.ESCALATED,
}


class Orchestrator:
    def __init__(self, repo: SessionRepository, gateway: ToolGateway | None = None,
                 response_agent: ResponseAgent | None = None):
        self.repo = repo
        gw = gateway or ToolGateway()
        self.identity = IdentityAgent(gw)
        self.risk = RiskAgent(gw)
        self.documentation = DocumentationAgent(gw)
        self.response = response_agent or ResponseAgent(gw)

    # ---------- helpers ----------
    def _apply(self, s: OnboardingSession, agent: SubAgent, r: AgentResult) -> None:
        s.steps.append(StepResult(agent=agent.name, step=agent.step, status=r.status, tool=r.tool,
                                  output=r.output, attempts=r.attempts,
                                  duration_ms=r.duration_ms, notes=r.notes))
        s.context.update(r.context_updates)
        if r.escalation:
            s.escalations.append(r.escalation)
            s.context["escalated"] = True
        s.log("system", f"[{agent.step}] {r.status.value}: {r.notes}", agent=agent.name)
        self.repo.save(s)  # checkpoint por paso

    def _run(self, s: OnboardingSession, agent: SubAgent) -> AgentResult:
        r = agent.run(s)
        self._apply(s, agent, r)
        return r

    def _skip(self, s: OnboardingSession, agent: SubAgent, why: str) -> None:
        self._apply(s, agent, AgentResult(status=StepStatus.SKIPPED, notes=why))

    def _decide(self, s: OnboardingSession) -> None:
        outcome = policies.evaluate(s.prospect.product.value, s.context)
        s.decision = outcome.decision
        s.context["policy_reasons"] = outcome.reasons
        s.steps.append(StepResult(agent="orchestrator", step="POLICY_DECISION", status=StepStatus.OK,
                                  output={"decision": outcome.decision.value, "reasons": outcome.reasons},
                                  notes="; ".join(outcome.reasons)))
        s.log("system", f"Decisión de política: {outcome.decision.value}")

    def _finish(self, s: OnboardingSession) -> OnboardingSession:
        if s.decision == Decision.APTO:
            self._run(s, self.documentation)
            s.required_documents = [RequiredDocument(**d) for d in s.context.get("documents", [])]
        else:
            self._skip(s, self.documentation, "Solo aplica a prospectos APTO")
        self._run(s, self.response)
        s.customer_message = s.context["customer_message"]
        s.status = _STATUS_BY_DECISION[s.decision]
        s.log("assistant", s.customer_message, agent=self.response.name)
        self.repo.save(s)
        return s

    # ---------- API pública ----------
    def start(self, req: OnboardingRequest) -> OnboardingSession:
        s = OnboardingSession(prospect=req)
        s.log("user", f"Solicitud de onboarding: {req.prospect_name} / {req.product.value}")
        self.repo.save(s)

        idr = self._run(s, self.identity)
        if idr.status == StepStatus.OK and idr.output.get("verified") is False:
            self._skip(s, self.risk, "Identidad no verificada: no se consulta riesgo")
        else:
            # Aun si identidad escaló, el screening se ejecuta: el revisor humano
            # necesita la evidencia completa para resolver.
            self._run(s, self.risk)

        self._decide(s)
        return self._finish(s)

    def resolve(self, session_id: str, req: ResolveRequest) -> OnboardingSession:
        s = self.repo.get(session_id)
        if s is None:
            raise KeyError(session_id)
        if s.status != SessionStatus.ESCALATED:
            raise ValueError(f"La sesión está en estado {s.status.value}; solo se resuelven ESCALATED")
        s.log("user", f"Revisión humana por {req.reviewer}: {req.decision}. {req.notes}".strip(),
              agent="human_reviewer")
        s.context["escalated"] = False
        s.context["human_review"] = req.model_dump()
        s.decision = Decision.APTO if req.decision == "approve" else Decision.NO_APTO
        s.steps.append(StepResult(agent="human_reviewer", step="HUMAN_REVIEW", status=StepStatus.OK,
                                  output=req.model_dump(), notes=f"Resuelto por {req.reviewer}"))
        return self._finish(s)
