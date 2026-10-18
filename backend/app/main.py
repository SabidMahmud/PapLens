"""
FastAPI Model Serving API for PapLens.
Features:
- Lifespan model loading (loads ResNet-50 + AB-MIL once at startup)
- Configurable strict CORS
- Healthcheck endpoint with model-ready indicator
- POST /predict accepting FOV slide images, returning diagnosis, probabilities, inference time, and base64 attention heatmaps.
"""
import time
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np

from app.config import settings
from app.heatmap import generate_attention_heatmap
from app.labels import (
    CLASS_DISPLAY_NAMES,
    SEVERITY_LEVELS,
    ModelType,
    get_classes_for_model,
)
from app.model import model_manager
from app.preprocess import extract_patches, validate_and_decode_image
from app.schemas import ErrorResponse, HealthResponse, PredictionResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan event handler: loads model weights once during application startup.
    Ensures zero model reloading penalty on subsequent /predict calls.
    """
    print(f"[{settings.PROJECT_NAME}] Initializing inference models on {settings.DEVICE}...")
    try:
        model_manager.load_all_models()
        print(f"[{settings.PROJECT_NAME}] Models successfully loaded and ready for inference.")
    except Exception as e:
        print(f"[{settings.PROJECT_NAME}] WARNING: Failed to load models at startup: {e}")
    yield
    print(f"[{settings.PROJECT_NAME}] Shutting down model server.")


app = FastAPI(
    title="PapLens API",
    description="Interpretable cervical cytology classification using Attention-Based Multiple Instance Learning (AB-MIL).",
    version=settings.VERSION,
    lifespan=lifespan,
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get(
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


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health & Model Status",
    description="Checks service vitality and confirms whether PyTorch models are actively loaded into memory.",
)
async def health():
    return HealthResponse(
        status="ok",
        models_loaded=model_manager.is_loaded,
        available_models=["triage", "severity"],
        device=settings.DEVICE,
        torch_threads=settings.TORCH_THREADS,
        version=settings.VERSION,
    )


@app.post(
    "/predict",
    response_model=PredictionResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid input image or size limit exceeded"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        500: {"model": ErrorResponse, "description": "Internal server inference error"},
    },
    summary="Run Cytological Inference & Attention Heatmap",
    description=(
        "Upload a Pap smear Field-of-View (FOV) image (JPEG or PNG, up to 15MB). "
        "Returns slide-level prediction, class probabilities, and a base64 attention heatmap."
    ),
)
async def predict(
    file: UploadFile = File(..., description="Pap smear microscopy FOV image (JPEG or PNG)"),
    model_type: ModelType = Query("triage", description="Select 'triage' (2-Class) or 'severity' (3-Class)"),
):
    # 1. Validate file extension / mime type
    filename = (file.filename or "").lower()
    content_type = (file.content_type or "").lower()
    valid_exts = (".jpg", ".jpeg", ".png")
    if not (filename.endswith(valid_exts) or "image/jpeg" in content_type or "image/png" in content_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format. Please upload a JPEG or PNG image.",
        )

    # 2. Read image bytes and enforce file size check
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}",
        )

    start_time = time.perf_counter()

    # 3. Validate image integrity and decode to RGB array
    try:
        img_array = validate_and_decode_image(contents)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Corrupted or unreadable image: {str(e)}",
        )

    # 4. Extract sliding window patches & filter out empty background
    try:
        bag_tensor, coords, original_shape = extract_patches(img_array)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Patch extraction failed: {str(e)}",
        )

    # 5. Run AB-MIL Inference
    try:
        pipeline = model_manager.get_pipeline(model_type)
        probs_tensor, attn_tensor, pred_idx, _ = pipeline.predict(bag_tensor)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(e)}",
        )

    # 6. Format probabilities & labels
    classes = get_classes_for_model(model_type)
    probs_np = probs_tensor.squeeze(0).cpu().numpy()
    attn_np = attn_tensor.squeeze(0).cpu().numpy()

    predicted_class = classes[pred_idx]
    confidence = float(probs_np[pred_idx])
    prob_dict = {cls: float(round(float(p), 4)) for cls, p in zip(classes, probs_np)}

    # 7. Generate Attention Heatmap & Blended Overlay
    try:
        heatmap_res = generate_attention_heatmap(
            orig_img_rgb=img_array,
            coords=coords,
            attention_weights=attn_np,
            crop_shape=original_shape,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Attention heatmap generation failed: {str(e)}",
        )

    total_time_ms = round((time.perf_counter() - start_time) * 1000.0, 1)

    return PredictionResponse(
        model_type=model_type,
        predicted_class=predicted_class,
        display_name=CLASS_DISPLAY_NAMES.get(predicted_class, predicted_class),
        severity_level=SEVERITY_LEVELS.get(predicted_class, "primary"),
        confidence=confidence,
        probabilities=prob_dict,
        classes=classes,
        num_patches=int(len(coords)),
        inference_time_ms=total_time_ms,
        overlay_base64=heatmap_res["overlay_base64"],
        heatmap_only_base64=heatmap_res["heatmap_only_base64"],
        original_display_base64=heatmap_res["original_display_base64"],
        display_width=heatmap_res["display_width"],
        display_height=heatmap_res["display_height"],
        top_patches=heatmap_res["top_patches"],
    )
