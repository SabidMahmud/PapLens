"""Prediction orchestration independent of FastAPI request handling."""

import asyncio
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Protocol

from app.config import settings
from app.errors import (
    HeatmapGenerationError,
    ImageDimensionsExceeded,
    InferenceExecutionError,
    InvalidImageError,
    ModelNotReadyError,
    PatchExtractionError,
)
from app.heatmap import generate_attention_heatmap
from app.inference_gate import InferenceGate
from app.labels import (
    CLASS_DISPLAY_NAMES,
    SEVERITY_LEVELS,
    ModelType,
)
from app.ml.pipeline import ModelPipeline
from app.preprocess import (
    extract_patches,
    validate_and_decode_image,
)
from app.results import PredictionResult


class ModelProvider(Protocol):
    """Minimum model dependency required by the prediction service."""

    def get_pipeline(self, model_type: ModelType) -> ModelPipeline: ...


class PredictionService:
    """Coordinates bounded, off-event-loop model inference."""

    def __init__(self, models: ModelProvider) -> None:
        self.models = models
        self._lifecycle_lock = threading.Lock()
        self._executor: ThreadPoolExecutor | None = None
        self._gate: InferenceGate | None = None

    def start(self) -> None:
        """Create event-loop-bound resources for the current app lifespan."""
        with self._lifecycle_lock:
            if self._executor is not None:
                return
            self._executor = ThreadPoolExecutor(
                max_workers=settings.MAX_CONCURRENT_INFERENCES,
                thread_name_prefix="paplens-inference",
            )
            self._gate = InferenceGate(
                max_concurrent=settings.MAX_CONCURRENT_INFERENCES,
                max_queued=settings.MAX_QUEUED_INFERENCES,
                queue_timeout_seconds=settings.INFERENCE_QUEUE_TIMEOUT_SECONDS,
            )

    async def predict(
        self, contents: bytes, model_type: ModelType
    ) -> PredictionResult:
        """Wait for bounded capacity and execute the synchronous pipeline."""
        gate = self._gate
        if gate is None:
            raise ModelNotReadyError("Inference service is not ready.")
        async with gate.slot():
            return await self.run_off_event_loop(contents, model_type)

    async def run_off_event_loop(
        self, contents: bytes, model_type: ModelType
    ) -> PredictionResult:
        """Reserve capacity until worker-thread inference has actually stopped."""
        executor = self._executor
        if executor is None:
            raise ModelNotReadyError("Inference service is not ready.")
        inference_future = executor.submit(
            self.run_prediction, contents, model_type
        )
        request_cancelled = False

        while not inference_future.done():
            try:
                await asyncio.sleep(0.05)
            except asyncio.CancelledError:
                # Python cannot forcefully stop a running worker thread. Keep its
                # capacity reserved until completion, then propagate cancellation.
                request_cancelled = True

        if request_cancelled:
            try:
                inference_future.result()
            except Exception:
                # Retrieve worker errors while preserving the client cancellation.
                pass
            raise asyncio.CancelledError

        return inference_future.result()

    def run_prediction(
        self, contents: bytes, model_type: ModelType
    ) -> PredictionResult:
        """Run decode, patch extraction, inference, and visualization."""
        start_time = time.perf_counter()

        try:
            img_array = validate_and_decode_image(contents)
        except ImageDimensionsExceeded:
            raise
        except ValueError as exc:
            raise InvalidImageError(str(exc)) from exc
        except Exception as exc:
            raise InvalidImageError("Corrupted or unreadable image.") from exc

        try:
            bag_tensor, coords, original_shape = extract_patches(img_array)
        except Exception as exc:
            raise PatchExtractionError("Patch extraction failed.") from exc

        try:
            pipeline = self.models.get_pipeline(model_type)
            probs_tensor, attn_tensor, pred_idx, _ = pipeline.predict(bag_tensor)
        except ModelNotReadyError:
            raise
        except Exception as exc:
            raise InferenceExecutionError("Inference execution failed.") from exc

        classes = pipeline.classes
        probs_np = probs_tensor.squeeze(0).cpu().numpy()
        attn_np = attn_tensor.squeeze(0).cpu().numpy()
        predicted_class = classes[pred_idx]
        confidence = float(probs_np[pred_idx])
        probabilities = {
            class_name: float(round(float(probability), 4))
            for class_name, probability in zip(classes, probs_np)
        }

        try:
            heatmap = generate_attention_heatmap(
                orig_img_rgb=img_array,
                coords=coords,
                attention_weights=attn_np,
                crop_shape=original_shape,
            )
        except Exception as exc:
            raise HeatmapGenerationError(
                "Attention heatmap generation failed."
            ) from exc

        inference_time_ms = round(
            (time.perf_counter() - start_time) * 1000.0, 1
        )
        return PredictionResult(
            model_type=model_type,
            predicted_class=predicted_class,
            display_name=CLASS_DISPLAY_NAMES.get(predicted_class, predicted_class),
            severity_level=SEVERITY_LEVELS.get(predicted_class, "primary"),
            confidence=confidence,
            probabilities=probabilities,
            classes=tuple(classes),
            num_patches=int(len(coords)),
            inference_time_ms=inference_time_ms,
            overlay_base64=heatmap["overlay_base64"],
            heatmap_only_base64=heatmap["heatmap_only_base64"],
            original_display_base64=heatmap["original_display_base64"],
            display_width=heatmap["display_width"],
            display_height=heatmap["display_height"],
            top_patches=heatmap["top_patches"],
        )

    def shutdown(self) -> None:
        """Wait for active inference and close worker threads."""
        with self._lifecycle_lock:
            executor = self._executor
            self._executor = None
            self._gate = None
        if executor is not None:
            executor.shutdown(wait=True, cancel_futures=False)
