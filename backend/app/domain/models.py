"""Contratos de datos (API + estado de la sesión)."""
from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Product(str, Enum):
    CUENTA_AHORROS = "cuenta_ahorros"
    CUENTA_CORRIENTE = "cuenta_corriente"
    TARJETA_CREDITO = "tarjeta_credito"


class SessionStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    ESCALATED = "ESCALATED"


class Decision(str, Enum):
    APTO = "APTO"
    NO_APTO = "NO_APTO"
    REVISION_MANUAL = "REVISION_MANUAL"


class StepStatus(str, Enum):
    OK = "OK"
    ESCALATED = "ESCALATED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class OnboardingRequest(BaseModel):
    prospect_name: str = Field(min_length=3, max_length=120, examples=["Juan Perez"])
    document_id: str = Field(min_length=10, max_length=13, examples=["1712345678"])
    product: Product = Field(examples=["cuenta_ahorros"])

    @field_validator("prospect_name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = " ".join(v.split())
        if not all(c.isalpha() or c in " '-." for c in v):
            raise ValueError("El nombre solo puede contener letras y espacios")
        if len(v.split()) > 6:
            raise ValueError("El nombre tiene demasiadas palabras")
        # Guardrail de entrada: texto con forma de instrucción no es un nombre
        from app.llm.guardrails import looks_like_injection
        if looks_like_injection(v):
            raise ValueError("El nombre contiene texto no permitido")
        return v

    @field_validator("document_id")
    @classmethod
    def _doc(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit():
            raise ValueError("El documento debe ser numérico")
        return v


class ResolveRequest(BaseModel):
    decision: Literal["approve", "reject"]
    reviewer: str = Field(min_length=2, max_length=80)
    notes: str = Field(default="", max_length=500)

    @field_validator("reviewer", "notes")
    @classmethod
    def _clean(cls, v: str) -> str:
        return "".join(c for c in v if c.isprintable()).strip()


class StepResult(BaseModel):
    agent: str
    step: str
    status: StepStatus
    tool: Optional[str] = None
    output: dict[str, Any] = Field(default_factory=dict)
    attempts: int = 0
    duration_ms: int = 0
    notes: str = ""


class Escalation(BaseModel):
    reason: str
    source_agent: str
    proposed_solution: str
    severity: Literal["low", "medium", "high"] = "medium"
    # Recomendación del advisor_agent (LLM o regla); la decide un humano
    ai_recommendation: Optional[dict[str, Any]] = None


class RequiredDocument(BaseModel):
    code: str
    name: str
    mandatory: bool = True


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    agent: str = "orchestrator"
    content: str
    ts: str = Field(default_factory=now_iso)


class OnboardingSession(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid4()))
    status: SessionStatus = SessionStatus.IN_PROGRESS
    decision: Optional[Decision] = None
    prospect: OnboardingRequest
    steps: list[StepResult] = Field(default_factory=list)
    escalations: list[Escalation] = Field(default_factory=list)
    required_documents: list[RequiredDocument] = Field(default_factory=list)
    customer_message: str = ""
    conversation: list[Message] = Field(default_factory=list)
    # Memoria de trabajo compartida entre pasos (blackboard)
    context: dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)

    def log(self, role: str, content: str, agent: str = "orchestrator") -> None:
        self.conversation.append(Message(role=role, agent=agent, content=content))
        self.updated_at = now_iso()
