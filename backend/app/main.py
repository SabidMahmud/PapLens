"""
FastAPI Model Serving API for PapLens.
Features:
- Lifespan model loading (loads ResNet-50 + AB-MIL once at startup)
- Configurable strict CORS
- Healthcheck endpoint with model-ready indicator
- POST /predict accepting FOV slide images, returning diagnosis, probabilities, inference time, and base64 attention heatmaps.
"""
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.heatmap import generate_attention_heatmap
from app.inference_gate import InferenceCapacityError, InferenceGate
from app.labels import (
    CLASS_DISPLAY_NAMES,
    SEVERITY_LEVELS,
    ModelType,
    get_classes_for_model,
)
from app.model import model_manager
from app.preprocess import (
    ImageDimensionsExceeded,
    extract_patches,
    validate_and_decode_image,
)
from app.schemas import ErrorResponse, HealthResponse, PredictionResponse


UPLOAD_READ_CHUNK_BYTES = 1024 * 1024
inference_executor = ThreadPoolExecutor(
    max_workers=settings.MAX_CONCURRENT_INFERENCES,
    thread_name_prefix="paplens-inference",
)
inference_gate = InferenceGate(
    max_concurrent=settings.MAX_CONCURRENT_INFERENCES,
    max_queued=settings.MAX_QUEUED_INFERENCES,
    queue_timeout_seconds=settings.INFERENCE_QUEUE_TIMEOUT_SECONDS,
)


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
        413: {"model": ErrorResponse, "description": "Upload exceeds the configured size limit"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        503: {"model": ErrorResponse, "description": "Inference capacity is temporarily full"},
        500: {"model": ErrorResponse, "description": "Internal server inference error"},
    },
    summary="Run Cytological Inference & Attention Heatmap",
    description=(
        "Upload a Pap smear Field-of-View (FOV) image (JPEG or PNG, up to 50 MiB, "
        "with a maximum 4000x3000 resolution in either orientation). "
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

    # 2. Stream image bytes into memory with an enforced upper bound.
    contents = await read_upload_with_limit(file)

    try:
        async with inference_gate.slot():
            return await run_prediction_off_event_loop(contents, model_type)
    except InferenceCapacityError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
            headers={"Retry-After": "5"},
        )


async def run_prediction_off_event_loop(
    contents: bytes, model_type: ModelType
) -> PredictionResponse:
    """Keeps the capacity slot until worker-thread inference has actually stopped."""
    inference_future = inference_executor.submit(run_prediction, contents, model_type)
    request_cancelled = False

    while not inference_future.done():
        try:
            await asyncio.sleep(0.05)
        except asyncio.CancelledError:
            # A running Python thread cannot be forcefully stopped. Keep the capacity
            # slot reserved until it really finishes, then propagate cancellation.
            request_cancelled = True

    if request_cancelled:
        try:
            inference_future.result()
        except Exception:
            # Retrieve a worker exception, but preserve the client cancellation.
            pass
        raise asyncio.CancelledError

    return inference_future.result()


async def read_upload_with_limit(file: UploadFile) -> bytes:
    """Reads an upload incrementally and rejects it as soon as it exceeds the limit."""
    max_bytes = int(settings.MAX_UPLOAD_MB * 1024 * 1024)

    if file.size is not None and file.size > max_bytes:
        await file.close()
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_MB} MB.",
        )

    contents = bytearray()
    try:
        while chunk := await file.read(UPLOAD_READ_CHUNK_BYTES):
            if len(contents) + len(chunk) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                    detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_MB} MB.",
                )
            contents.extend(chunk)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}",
        )
    finally:
        await file.close()

    return bytes(contents)


def run_prediction(contents: bytes, model_type: ModelType) -> PredictionResponse:
    """Runs the existing CPU-bound inference pipeline outside the event loop."""

    start_time = time.perf_counter()

    # 3. Validate image integrity and decode to RGB array
    try:
        img_array = validate_and_decode_image(contents)
    except ImageDimensionsExceeded as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(e),
        )
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
