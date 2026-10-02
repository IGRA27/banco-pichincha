"""Punto de entrada: app factory de FastAPI."""
from __future__ import annotations

import logging
import os

from fastapi import FastAPI
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
    return app


app = create_app()
