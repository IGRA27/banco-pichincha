"""Endpoints v1 del onboarding agéntico."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from app.api.deps import get_orchestrator, get_repository
from app.core.auth import authenticate, client_ip, issue_token, require_user
from app.domain.models import OnboardingRequest, OnboardingSession, ResolveRequest
from app.infrastructure.repository import SessionRepository
from app.orchestration.orchestrator import Orchestrator
from app.tools.gateway import PERMISSIONS
from app.tools.mocks import SCENARIOS

# Público: health y login. Todo lo demás exige token (deny by default).
public = APIRouter(prefix="/api/v1")
router = APIRouter(prefix="/api/v1", dependencies=[Depends(require_user)])


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=64)
    password: str = Field(min_length=1, max_length=128)

OrchestratorDep = Annotated[Orchestrator, Depends(get_orchestrator)]
RepoDep = Annotated[SessionRepository, Depends(get_repository)]

# El blackboard interno (context) no se expone al cliente
_PRIVATE_FIELDS = {"context"}


def _public(s: OnboardingSession) -> dict:
    return s.model_dump(mode="json", exclude=_PRIVATE_FIELDS)


@public.get("/health", tags=["ops"])
def health() -> dict:
    return {"status": "ok"}


@public.post("/auth/login", tags=["auth"])
def login(req: LoginRequest, request: Request) -> dict:
    user = authenticate(req.username, req.password, client_ip(request))
    token, ttl = issue_token(user)
    return {"access_token": token, "token_type": "bearer", "expires_in": ttl, "username": user}


@router.get("/auth/me", tags=["auth"])
def me(user: str = Depends(require_user)) -> dict:
    return {"username": user}


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
def resolve(session_id: str, req: ResolveRequest, orchestrator: OrchestratorDep,
            user: str = Depends(require_user)) -> dict:
    # Trazabilidad: el actor real es el usuario autenticado, no solo el texto enviado
    req = req.model_copy(update={"reviewer": f"{req.reviewer} [{user}]"[:80]})
    try:
        return _public(orchestrator.resolve(session_id, req))
    except KeyError:
        raise HTTPException(404, "Sesión no encontrada")
    except ValueError as e:
        raise HTTPException(409, str(e))


@router.get("/agents", tags=["agents"])
def agents() -> dict:
    return {agent: sorted(tools) for agent, tools in PERMISSIONS.items()}
