"""
Prediction endpoint tests using synthetic images.
Verifies schema, both triage and severity modes, and inference determinism.
"""
import numpy as np


def test_predict_triage(client, synthetic_fov_image_bytes):
    response = client.post(
        "/predict?model_type=triage",
        files={"file": ("sample_fov.jpg", synthetic_fov_image_bytes, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["model_type"] == "triage"
    assert data["predicted_class"] in ["Normal", "Abnormal"]
    assert "Normal (NILM)" in data["display_name"] or "Abnormal" in data["display_name"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert len(data["probabilities"]) == 2
    assert "Normal" in data["probabilities"]
    assert "Abnormal" in data["probabilities"]
    assert data["num_patches"] > 0
    assert data["inference_time_ms"] > 0
    assert data["overlay_base64"].startswith("data:image/png;base64,")
    assert data["heatmap_only_base64"].startswith("data:image/png;base64,")
    assert data["original_display_base64"].startswith("data:image/png;base64,")
    assert data["display_width"] > 0
    assert data["display_height"] > 0


def test_predict_severity(client, synthetic_fov_image_bytes):
    response = client.post(
        "/predict?model_type=severity",
        files={"file": ("sample_fov.jpg", synthetic_fov_image_bytes, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()

    assert data["model_type"] == "severity"
    assert data["predicted_class"] in ["Normal", "Low_Grade", "High_Grade"]
    assert len(data["probabilities"]) == 3
    assert "Normal" in data["probabilities"]
    assert "Low_Grade" in data["probabilities"]
    assert "High_Grade" in data["probabilities"]


def test_predict_small_image_padding(client, synthetic_small_image_bytes):
    """Verifies that images smaller than 1280x1280 are safely handled without crashes."""
    response = client.post(
        "/predict?model_type=triage",
        files={"file": ("small.png", synthetic_small_image_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["num_patches"] >= 1


def test_predict_determinism(client, synthetic_fov_image_bytes):
    """Verifies that identical inputs yield identical outputs (determinism)."""
    resp1 = client.post(
        "/predict?model_type=triage",
        files={"file": ("sample.jpg", synthetic_fov_image_bytes, "image/jpeg")},
    )
    resp2 = client.post(
        "/predict?model_type=triage",
        files={"file": ("sample.jpg", synthetic_fov_image_bytes, "image/jpeg")},
    )
    assert resp1.status_code == 200
    assert resp2.status_code == 200

    d1 = resp1.json()
    d2 = resp2.json()

    assert d1["predicted_class"] == d2["predicted_class"]
    for k in d1["probabilities"]:
        np.testing.assert_allclose(d1["probabilities"][k], d2["probabilities"][k], atol=1e-5)
