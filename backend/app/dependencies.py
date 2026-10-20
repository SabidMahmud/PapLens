"""FastAPI dependency providers for application-owned backend services."""

from fastapi import Request

from app.ml.pipeline import ModelManager
from app.services.prediction import PredictionService


async def get_model_manager(request: Request) -> ModelManager:
    """Return the model manager owned by the current application instance."""
    return request.app.state.model_manager


async def get_prediction_service(request: Request) -> PredictionService:
    """Return the prediction service owned by the current application instance."""
    return request.app.state.prediction_service
