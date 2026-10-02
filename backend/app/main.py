"""Punto de entrada: app factory de FastAPI."""
from __future__ import annotations

import logging
import os

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import public, router
from app.core.config import settings
from app.core.security import SecurityMiddleware


def create_app() -> FastAPI:
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    docs = os.getenv("ENABLE_DOCS", "true").lower() == "true"
    app = FastAPI(title="Onboarding Agéntico", version="1.0.0",
                  description="Orquestador multi-agente para onboarding digital de clientes",
                  docs_url="/docs" if docs else None, redoc_url=None,
                  openapi_url="/openapi.json" if docs else None)
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Authorization"])
    app.add_middleware(SecurityMiddleware)
    app.include_router(public)
    app.include_router(router)
    _mount_frontend(app)
    return app


def _mount_frontend(app: FastAPI) -> None:
    """Sirve el SPA compilado (un solo servicio Cloud Run: UI + API, mismo origen)."""
    static = os.getenv("STATIC_DIR")
    if not static or not Path(static).is_dir():
        return
    root = Path(static).resolve()
    app.mount("/assets", StaticFiles(directory=root / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(404, "No encontrado")
        candidate = (root / path).resolve()
        # Evita path traversal: solo archivos dentro de STATIC_DIR
        if path and candidate.is_file() and root in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(root / "index.html")


app = create_app()
