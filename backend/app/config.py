"""
Backend application configuration using environment variables.
"""
import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

# Absolute path to backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "paplens-backend"
    VERSION: str = "1.0.0"

    # CORS Configuration
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # Upload & Image Constraints
    MAX_UPLOAD_MB: int = 15
    MAX_IMAGE_PIXELS: int = 50_000_000  # Cap on raw image size (e.g. 50 MP; 4000x3000 is 12 MP)
    MAX_DIMENSION: int = 6000  # Max width/height to protect memory

    # Patch Extraction Hyperparameters (matching research evaluation exactly)
    PATCH_SIZE: int = 1280
    STRIDE: int = 640
    BG_THRESHOLD: float = 0.85
    BACKBONE_INPUT_SIZE: int = 224

    # Weights paths
    WEIGHTS_DIR: str = str(BACKEND_DIR / "weights")

    # Hugging Face fallback configuration
    HF_REPO_ID: str = ""  # e.g., "username/paplens-weights"
    HF_TOKEN: str = ""

    # PyTorch CPU Runtime Settings
    DEVICE: str = "cpu"
    TORCH_THREADS: int = 4

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()
