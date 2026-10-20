"""Focused tests for upload, image-dimension, patch, and inference limits."""

import asyncio
import io
import tempfile
import threading

import numpy as np
import pytest
from fastapi import UploadFile
from PIL import Image

from app.api.upload import read_upload_with_limit
from app.config import settings
from app.errors import UploadTooLargeError
from app.inference_gate import InferenceGate
from app.ml.pipeline import ModelManager
from app.preprocess import (
    ImageDimensionsExceeded,
    extract_patches,
    validate_and_decode_image,
)
from app.services.prediction import PredictionService


@pytest.fixture
def prediction_service():
    service = PredictionService(ModelManager())
    service.start()
    try:
        yield service
    finally:
        service.shutdown()


def png_bytes(width: int, height: int) -> bytes:
    image = Image.new("RGB", (width, height), color=(128, 128, 128))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_default_resource_limits():
    assert settings.MAX_UPLOAD_MB == 50
    assert settings.MAX_LONG_SIDE == 4000
    assert settings.MAX_SHORT_SIDE == 3000
    assert settings.MAX_IMAGE_PIXELS == 12_000_000


def test_accepts_landscape_and_portrait_at_dimension_limits(monkeypatch):
    monkeypatch.setattr(settings, "MAX_LONG_SIDE", 40)
    monkeypatch.setattr(settings, "MAX_SHORT_SIDE", 30)
    monkeypatch.setattr(settings, "MAX_IMAGE_PIXELS", 1_200)

    assert validate_and_decode_image(png_bytes(40, 30)).shape == (30, 40, 3)
    assert validate_and_decode_image(png_bytes(30, 40)).shape == (40, 30, 3)


@pytest.mark.parametrize("width,height", [(41, 30), (30, 41), (40, 31), (31, 40)])
def test_rejects_images_over_either_dimension(monkeypatch, width, height):
    monkeypatch.setattr(settings, "MAX_LONG_SIDE", 40)
    monkeypatch.setattr(settings, "MAX_SHORT_SIDE", 30)
    monkeypatch.setattr(settings, "MAX_IMAGE_PIXELS", 10_000)

    with pytest.raises(ValueError, match="exceeds the maximum allowed dimensions"):
        validate_and_decode_image(png_bytes(width, height))


def test_rejects_images_over_total_pixel_limit(monkeypatch):
    monkeypatch.setattr(settings, "MAX_LONG_SIDE", 40)
    monkeypatch.setattr(settings, "MAX_SHORT_SIDE", 30)
    monkeypatch.setattr(settings, "MAX_IMAGE_PIXELS", 1_199)

    with pytest.raises(ValueError, match="exceeds the maximum allowed dimensions"):
        validate_and_decode_image(png_bytes(40, 30))


def test_prediction_service_preserves_dimension_error(
    monkeypatch, prediction_service
):
    monkeypatch.setattr(settings, "MAX_LONG_SIDE", 40)
    monkeypatch.setattr(settings, "MAX_SHORT_SIDE", 30)
    monkeypatch.setattr(settings, "MAX_IMAGE_PIXELS", 10_000)

    with pytest.raises(ImageDimensionsExceeded):
        prediction_service.run_prediction(png_bytes(41, 30), "triage")


def test_maximum_dimensions_imply_24_patches_without_an_explicit_cap():
    image = np.full((300, 400, 3), 128, dtype=np.uint8)
    bag, coords, _ = extract_patches(image, patch_size=128, stride=64)

    assert len(coords) == 24
    assert bag.shape[0] == 24


def test_streamed_upload_rejects_payload_over_limit(monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 0.001)
    upload_file = tempfile.SpooledTemporaryFile()
    upload_file.write(b"x" * 2_000)
    upload_file.seek(0)
    upload = UploadFile(
        file=upload_file,
        filename="large.jpg",
        size=None,
    )

    with pytest.raises(UploadTooLargeError):
        asyncio.run(read_upload_with_limit(upload))


def test_streamed_upload_accepts_payload_at_limit(monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 0.001)
    max_bytes = int(settings.MAX_UPLOAD_MB * 1024 * 1024)
    upload_file = tempfile.SpooledTemporaryFile()
    upload_file.write(b"x" * max_bytes)
    upload_file.seek(0)
    upload = UploadFile(
        file=upload_file,
        filename="at-limit.jpg",
        size=None,
    )

    contents = asyncio.run(read_upload_with_limit(upload))

    assert len(contents) == max_bytes


def test_inference_gate_rejects_when_active_and_queue_are_full():
    async def scenario() -> None:
        gate = InferenceGate(
            max_concurrent=1,
            max_queued=1,
            queue_timeout_seconds=1,
        )
        assert await gate.acquire() is True

        queued_request = asyncio.create_task(gate.acquire())
        await asyncio.sleep(0)
        assert await gate.acquire() is False

        await gate.release()
        assert await queued_request is True
        await gate.release()

    asyncio.run(scenario())


def test_cancelled_request_keeps_capacity_until_worker_finishes(
    monkeypatch, prediction_service
):
    worker_started = threading.Event()
    allow_worker_to_finish = threading.Event()

    def fake_prediction(contents, model_type):
        worker_started.set()
        allow_worker_to_finish.wait(timeout=1)
        return object()

    monkeypatch.setattr(prediction_service, "run_prediction", fake_prediction)

    async def scenario() -> None:
        task = asyncio.create_task(
            prediction_service.run_off_event_loop(b"image", "triage")
        )
        while not worker_started.is_set():
            await asyncio.sleep(0)

        task.cancel()
        await asyncio.sleep(0.01)
        assert task.done() is False

        allow_worker_to_finish.set()
        with pytest.raises(asyncio.CancelledError):
            await task

    asyncio.run(scenario())
