"""API HTTP (FastAPI) del orquestador de onboarding."""
from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import OnboardingRequest, OnboardingSession, ResolveRequest
from app.orchestrator import Orchestrator
from app.state import SQLiteSessionRepository
from app.tools.gateway import PERMISSIONS
from app.tools.mocks import SCENARIOS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="Onboarding Agéntico", version="1.0.0",
              description="Orquestador multi-agente para onboarding digital de clientes")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                   allow_methods=["GET", "POST"], allow_headers=["*"])

repo = SQLiteSessionRepository(settings.database_path)
orchestrator = Orchestrator(repo)

# Respuesta pública: el blackboard interno (context) no se expone
PUBLIC = {"context"}


def _public(s: OnboardingSession) -> dict:
    return s.model_dump(mode="json", exclude=PUBLIC)


@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/api/v1/onboarding/start")
def start(req: OnboardingRequest) -> dict:
    return _public(orchestrator.start(req))


@app.get("/api/v1/onboarding/scenarios")
def scenarios() -> list[dict]:
    return [{"document_id": k, "prospect_name": v["name"], "label": v["label"],
             "expected": v["expected"]} for k, v in SCENARIOS.items()]


@app.get("/api/v1/onboarding")
def list_sessions(limit: int = 20) -> list[dict]:
    return [_public(s) for s in repo.list_recent(min(limit, 100))]


@app.get("/api/v1/onboarding/{session_id}")
def get_session(session_id: str) -> dict:
    s = repo.get(session_id)
    if s is None:
        raise HTTPException(404, "Sesión no encontrada")
    return _public(s)


@app.post("/api/v1/onboarding/{session_id}/resolve")
def resolve(session_id: str, req: ResolveRequest) -> dict:
    try:
        return _public(orchestrator.resolve(session_id, req))
    except KeyError:
        raise HTTPException(404, "Sesión no encontrada")
    except ValueError as e:
        raise HTTPException(409, str(e))


@app.get("/api/v1/agents")
def agents() -> dict:
    return {agent: sorted(tools) for agent, tools in PERMISSIONS.items()}
