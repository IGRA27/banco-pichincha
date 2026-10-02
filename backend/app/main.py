"""Punto de entrada: app factory de FastAPI."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes import router
from app.core.config import settings
from app.core.security import SecurityMiddleware


def create_app() -> FastAPI:
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s %(levelname)s %(name)s %(message)s")
    app = FastAPI(title="Onboarding Agéntico", version="1.0.0",
                  description="Orquestador multi-agente para onboarding digital de clientes")
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
    app.add_middleware(SecurityMiddleware)
    app.include_router(router)
    return app


app = create_app()
