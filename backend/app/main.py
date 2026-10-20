"""FastAPI application wiring for the PapLens inference service."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_error_handlers
from app.api.routes import router
from app.config import settings
from app.ml.pipeline import ModelManager
from app.services.prediction import PredictionService


logger = logging.getLogger(__name__)


def create_lifespan(
    models: ModelManager,
    prediction_service: PredictionService,
):
    """Create a lifespan bound to one application's dependencies."""

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        logger.info(
            "[%s] Initializing inference models on %s...",
            settings.PROJECT_NAME,
            settings.DEVICE,
        )
        try:
            models.load_all_models()
            prediction_service.start()
            logger.info(
                "[%s] Models successfully loaded and ready for inference.",
                settings.PROJECT_NAME,
            )
            yield
        finally:
            prediction_service.shutdown()
            logger.info("[%s] Model server stopped.", settings.PROJECT_NAME)

    return lifespan


def create_app(
    *,
    models: ModelManager | None = None,
    prediction_service: PredictionService | None = None,
) -> FastAPI:
    """Construct an HTTP application with isolated, replaceable dependencies."""
    app_models = models or ModelManager()
    app_prediction_service = prediction_service or PredictionService(app_models)

    application = FastAPI(
        title="PapLens API",
        description=(
            "Interpretable cervical cytology classification using "
            "Attention-Based Multiple Instance Learning (AB-MIL)."
        ),
        version=settings.VERSION,
        lifespan=create_lifespan(app_models, app_prediction_service),
    )
    application.state.model_manager = app_models
    application.state.prediction_service = app_prediction_service
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
    register_error_handlers(application)
    application.include_router(router)
    return application


app = create_app()
