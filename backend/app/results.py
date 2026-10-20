"""Transport-independent result objects returned by application services."""

from dataclasses import dataclass
from typing import Any

from app.labels import ModelType


@dataclass(frozen=True)
class PredictionResult:
    """Completed inference data before HTTP response serialization."""

    model_type: ModelType
    predicted_class: str
    display_name: str
    severity_level: str
    confidence: float
    probabilities: dict[str, float]
    classes: tuple[str, ...]
    num_patches: int
    inference_time_ms: float
    overlay_base64: str
    heatmap_only_base64: str
    original_display_base64: str
    display_width: int
    display_height: int
    top_patches: list[dict[str, Any]]
