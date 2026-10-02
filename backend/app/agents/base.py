"""Contrato común de sub-agentes especializados."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional

from app.domain.models import Escalation, OnboardingSession, StepStatus
from app.tools.gateway import ToolGateway


@dataclass
class AgentResult:
    status: StepStatus
    tool: Optional[str] = None
    output: dict[str, Any] = field(default_factory=dict)
    attempts: int = 0
    duration_ms: int = 0
    notes: str = ""
    escalation: Optional[Escalation] = None
    context_updates: dict[str, Any] = field(default_factory=dict)


class SubAgent(ABC):
    name: str
    step: str

    def __init__(self, gateway: ToolGateway):
        # Los agentes no importan herramientas: solo las alcanzan vía gateway
        self.gateway = gateway

    @abstractmethod
    def run(self, session: OnboardingSession) -> AgentResult: ...
