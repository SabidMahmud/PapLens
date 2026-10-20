"""Pydantic schemas for API response serialization."""

from typing import Literal

from pydantic import BaseModel, Field

from app.labels import ModelType


class DiagnosticPatchInfo(BaseModel):
    """Spatial bounding box and attention score for a high-attention diagnostic patch."""

    rank: int = Field(..., description="Rank among all patches sorted by attention score")
    attention_score: float = Field(
        ..., description="Normalized attention score [0, 1]"
    )
    raw_attention: float = Field(..., description="Raw softmax attention weight")
    box: dict[str, int] = Field(
        ..., description="Bounding box in original image coordinates"
    )
    box_display: dict[str, int] = Field(
        ..., description="Bounding box in display image coordinates"
    )


class PredictionResponse(BaseModel):
    """Detailed prediction payload returned by POST /predict."""

    model_type: ModelType = Field(..., description="Inference pipeline used")
    predicted_class: str = Field(..., description="Predicted class identifier")
    display_name: str = Field(
        ..., description="Human-readable Bethesda clinical description"
    )
    severity_level: str = Field(..., description="UI badge severity level")
    confidence: float = Field(
        ..., description="Predicted-class probability between 0 and 1"
    )
    probabilities: dict[str, float] = Field(
        ..., description="Per-class probabilities"
    )
    classes: list[str] = Field(..., description="Ordered list of class names")
    num_patches: int = Field(
        ..., description="Total non-background diagnostic patches analyzed"
    )
    inference_time_ms: float = Field(
        ..., description="Total wall-clock inference duration in milliseconds"
    )

    # Visualizations
    overlay_base64: str = Field(
        ..., description="Data URI for blended original and heatmap PNG"
    )
    heatmap_only_base64: str = Field(
        ..., description="Data URI for the colored heatmap PNG"
    )
    original_display_base64: str = Field(
        ..., description="Data URI for the downscaled original PNG"
    )
    display_width: int = Field(..., description="Width of the visualization images")
    display_height: int = Field(..., description="Height of the visualization images")
    top_patches: list[DiagnosticPatchInfo] = Field(
        default_factory=list, description="Top diagnostic patches"
    )


class HealthResponse(BaseModel):
    """Response returned by GET /health."""

    status: Literal["ok"] = Field("ok", description="Server status indicator")
    models_loaded: bool = Field(
        ..., description="Whether all model pipelines are loaded"
    )
    available_models: list[ModelType] = Field(
        ..., description="List of supported model types"
    )
    device: str = Field(..., description="Inference device: 'cpu' or 'cuda'")
    torch_threads: int = Field(..., description="Configured CPU thread count")
    version: str = Field(..., description="Backend API version")


class ErrorResponse(BaseModel):
    """Standardized error response schema."""

    error: str = Field(..., description="Error category or code")
    detail: str = Field(..., description="User-friendly error explanation")
