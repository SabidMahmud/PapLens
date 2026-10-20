"""Tests for dependency ownership, lifecycle, readiness, and API contracts."""

import asyncio

import httpx
import pytest

from app.errors import InferenceExecutionError
from app.main import create_app
from app.ml.pipeline import ModelManager
from app.services.prediction import PredictionService


def run_request(app, method: str, path: str, **kwargs) -> httpx.Response:
    async def request() -> httpx.Response:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://test",
        ) as client:
            return await client.request(method, path, **kwargs)

    return asyncio.run(request())


def test_prediction_service_can_restart_after_shutdown(monkeypatch):
    service = PredictionService(ModelManager())
    monkeypatch.setattr(service, "run_prediction", lambda *_: "ok")

    service.start()
    assert asyncio.run(service.run_off_event_loop(b"image", "triage")) == "ok"
    service.shutdown()

    service.start()
    assert asyncio.run(service.run_off_event_loop(b"image", "triage")) == "ok"
    service.shutdown()


def test_applications_own_independent_dependencies():
    first = create_app()
    second = create_app()

    assert first.state.model_manager is not second.state.model_manager
    assert first.state.prediction_service is not second.state.prediction_service


def test_health_is_unavailable_before_models_are_loaded():
    app = create_app()

    response = run_request(app, "GET", "/health")

    assert response.status_code == 503
    assert response.json() == {
        "error": "models_not_ready",
        "detail": "Inference models are not ready.",
    }


def test_error_response_matches_openapi_schema():
    app = create_app()

    response = run_request(
        app,
        "POST",
        "/predict",
        files={"file": ("document.pdf", b"%PDF", "application/pdf")},
    )

    assert response.status_code == 400
    assert set(response.json()) == {"error", "detail"}
    schema = app.openapi()["paths"]["/predict"]["post"]["responses"]["400"]
    assert schema["content"]["application/json"]["schema"] == {
        "$ref": "#/components/schemas/ErrorResponse"
    }


def test_framework_errors_use_the_standard_error_contract():
    app = create_app()

    validation_response = run_request(
        app,
        "POST",
        "/predict?model_type=unknown",
        files={"file": ("image.png", b"not-used", "image/png")},
    )
    missing_response = run_request(app, "GET", "/missing")

    assert validation_response.status_code == 422
    assert validation_response.json()["error"] == "request_validation_error"
    assert missing_response.status_code == 404
    assert missing_response.json() == {
        "error": "http_404",
        "detail": "Not Found",
    }


def test_internal_inference_error_does_not_leak_details():
    class FailingService:
        async def predict(self, contents, model_type):
            raise InferenceExecutionError("secret checkpoint path")

    app = create_app(prediction_service=FailingService())
    response = run_request(
        app,
        "POST",
        "/predict",
        files={"file": ("image.png", b"not-used", "image/png")},
    )

    assert response.status_code == 500
    assert response.json() == {
        "error": "internal_inference_error",
        "detail": "Inference could not be completed.",
    }
    assert "secret" not in response.text


def test_startup_failure_is_not_suppressed():
    class FailingModels(ModelManager):
        def load_all_models(self):
            raise RuntimeError("weights unavailable")

    app = create_app(models=FailingModels())

    async def enter_lifespan():
        async with app.router.lifespan_context(app):
            pass

    with pytest.raises(RuntimeError, match="weights unavailable"):
        asyncio.run(enter_lifespan())
