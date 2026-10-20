"""
Health and Root endpoint tests.
"""
import pytest


pytestmark = pytest.mark.anyio


async def test_root_endpoint(client):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "version" in data
    assert "disclaimer" in data


async def test_health_endpoint(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["models_loaded"] is True
    assert "triage" in data["available_models"]
    assert "severity" in data["available_models"]
    assert data["device"] == "cpu"
