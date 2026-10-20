"""FastAPI route definitions for the PapLens inference API."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.api.upload import read_upload_with_limit, validate_upload_format
from app.config import settings
from app.dependencies import get_model_manager, get_prediction_service
from app.errors import ModelNotReadyError
from app.labels import ModelType
from app.ml.pipeline import ModelManager
from app.schemas import ErrorResponse, HealthResponse, PredictionResponse
from app.services.prediction import PredictionService


router = APIRouter()
ModelManagerDependency = Annotated[ModelManager, Depends(get_model_manager)]
PredictionServiceDependency = Annotated[
    PredictionService, Depends(get_prediction_service)
]


@router.get(
    "/",
    summary="Root Status",
    description="Returns service metadata and interactive API documentation link.",
)
async def root():
    return {
        "service": "PapLens Inference API",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_url": "/health",
        "disclaimer": "Research demo only. Not a medical device. Not for clinical diagnosis.",
    }


@router.get(
    "/health",
    response_model=HealthResponse,
    responses={
        503: {
            "model": ErrorResponse,
            "description": "Inference models are not ready",
        }
    },
    summary="Health & Model Status",
    description=(
        "Checks service readiness and confirms whether PyTorch models are "
        "loaded into memory."
    ),
)
async def health(models: ModelManagerDependency) -> HealthResponse:
    if not models.is_loaded:
        raise ModelNotReadyError("Inference models are not ready.")
    return HealthResponse(
        status="ok",
        models_loaded=models.is_loaded,
        available_models=models.available_models,
        device=settings.DEVICE,
        torch_threads=settings.TORCH_THREADS,
        version=settings.VERSION,
    )


@router.post(
    "/predict",
    response_model=PredictionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid input image"},
        413: {
            "model": ErrorResponse,
            "description": "Upload exceeds the configured size limit",
        },
        422: {"model": ErrorResponse, "description": "Validation error"},
        503: {
            "model": ErrorResponse,
            "description": "Inference is unavailable or temporarily full",
        },
        500: {
            "model": ErrorResponse,
            "description": "Internal server inference error",
        },
    },
    summary="Run Cytological Inference & Attention Heatmap",
    description=(
        "Upload a Pap smear Field-of-View (FOV) image (JPEG or PNG, up to "
        f"{settings.MAX_UPLOAD_MB} MiB, with a maximum "
        f"{settings.MAX_LONG_SIDE}x{settings.MAX_SHORT_SIDE} resolution in either "
        "orientation). "
        "Returns slide-level prediction, class probabilities, and a base64 attention heatmap."
    ),
)
async def predict(
    file: Annotated[
        UploadFile,
        File(description="Pap smear microscopy FOV image (JPEG or PNG)"),
    ],
    service: PredictionServiceDependency,
    model_type: Annotated[
        ModelType,
        Query(description="Select 'triage' (2-Class) or 'severity' (3-Class)"),
    ] = "triage",
) -> PredictionResponse:
    await validate_upload_format(file)
    contents = await read_upload_with_limit(file)
    result = await service.predict(contents, model_type)
    return PredictionResponse.model_validate(result, from_attributes=True)
