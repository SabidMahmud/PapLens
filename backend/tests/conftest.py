"""
Pytest fixtures for PapLens backend testing.
Uses synthetic images only (never patient or clinical dataset files).
"""
import io
from pathlib import Path
import sys
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

# Add backend directory to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.model import model_manager


@pytest.fixture(scope="session")
def client():
    """TestClient that initializes the FastAPI lifespan once."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def synthetic_fov_image_bytes() -> bytes:
    """
    Creates a synthetic 1500x1500 RGB JPEG image with random cell-like clusters
    so that patches pass the background filter.
    """
    # Create an image with mostly light background and some darker cell-like spots
    img = np.full((1500, 1500, 3), 245, dtype=np.uint8)

    # Draw simulated nuclei/cells (dark circular clusters)
    for _ in range(50):
        cx = np.random.randint(100, 1400)
        cy = np.random.randint(100, 1400)
        radius = np.random.randint(20, 80)
        color = np.random.randint(50, 150, size=3).tolist()
        y, x = np.ogrid[:1500, :1500]
        dist_sq = (x - cx) ** 2 + (y - cy) ** 2
        mask = dist_sq <= radius ** 2
        img[mask] = color

    pil_img = Image.fromarray(img)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


@pytest.fixture(scope="session")
def synthetic_small_image_bytes() -> bytes:
    """Creates a small 800x600 synthetic PNG image."""
    img = np.full((600, 800, 3), 200, dtype=np.uint8)
    pil_img = Image.fromarray(img)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return buf.getvalue()
