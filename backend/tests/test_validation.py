"""
Input validation, size rejection, and CORS header tests.
"""
import pytest


pytestmark = pytest.mark.anyio


async def test_reject_corrupt_file(client):
    response = await client.post(
        "/predict",
        files={"file": ("corrupted.jpg", b"not a valid image byte stream", "image/jpeg")},
    )
    assert response.status_code == 400
    assert "detail" in response.json()


async def test_reject_invalid_extension(client):
    response = await client.post(
        "/predict",
        files={"file": ("document.pdf", b"%PDF-1.4...", "application/pdf")},
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


async def test_reject_oversized_file(client, monkeypatch):
    from app.config import settings
    # Temporarily set max upload to 0.001 MB (1 KB) to test rejection
    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 0.001)

    big_payload = b"x" * 2000  # 2 KB > 1 KB
    response = await client.post(
        "/predict",
        files={"file": ("large.jpg", big_payload, "image/jpeg")},
    )
    assert response.status_code == 413
    assert "exceeds maximum upload size" in response.json()["detail"]


async def test_cors_headers_allowed_origin(client):
    response = await client.options(
        "/predict",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


async def test_cors_disallow_untrusted_origin(client):
    response = await client.options(
        "/predict",
        headers={
            "Origin": "http://malicious-site.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    # The header should NOT allow malicious-site.com
    assert response.headers.get("access-control-allow-origin") != "http://malicious-site.com"
