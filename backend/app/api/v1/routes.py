"""Endpoints v1 del onboarding agéntico."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_orchestrator, get_repository
from app.domain.models import OnboardingRequest, OnboardingSession, ResolveRequest
from app.infrastructure.repository import SessionRepository
from app.orchestration.orchestrator import Orchestrator
from app.tools.gateway import PERMISSIONS
from app.tools.mocks import SCENARIOS

router = APIRouter(prefix="/api/v1")

OrchestratorDep = Annotated[Orchestrator, Depends(get_orchestrator)]
RepoDep = Annotated[SessionRepository, Depends(get_repository)]

# El blackboard interno (context) no se expone al cliente
_PRIVATE_FIELDS = {"context"}


def _public(s: OnboardingSession) -> dict:
    return s.model_dump(mode="json", exclude=_PRIVATE_FIELDS)


@router.get("/health", tags=["ops"])
def health() -> dict:
    return {"status": "ok"}


@router.post("/onboarding/start", tags=["onboarding"])
def start(req: OnboardingRequest, orchestrator: OrchestratorDep) -> dict:
    return _public(orchestrator.start(req))


@router.get("/onboarding/scenarios", tags=["demo"])
def scenarios() -> list[dict]:
    return [{"document_id": k, "prospect_name": v["name"], "label": v["label"],
             "expected": v["expected"]} for k, v in SCENARIOS.items()]


@router.get("/onboarding", tags=["onboarding"])
def list_sessions(repo: RepoDep, limit: int = Query(20, ge=1, le=100)) -> list[dict]:
    return [_public(s) for s in repo.list_recent(limit)]


@router.get("/onboarding/{session_id}", tags=["onboarding"])
def get_session(session_id: str, repo: RepoDep) -> dict:
    s = repo.get(session_id)
    if s is None:
        raise HTTPException(404, "Sesión no encontrada")
    return _public(s)


@router.post("/onboarding/{session_id}/resolve", tags=["onboarding"])
def resolve(session_id: str, req: ResolveRequest, orchestrator: OrchestratorDep) -> dict:
    try:
        return _public(orchestrator.resolve(session_id, req))
    except KeyError:
        raise HTTPException(404, "Sesión no encontrada")
    except ValueError as e:
        raise HTTPException(409, str(e))


@router.get("/agents", tags=["agents"])
def agents() -> dict:
    return {agent: sorted(tools) for agent, tools in PERMISSIONS.items()}
