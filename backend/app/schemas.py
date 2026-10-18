"""
Pydantic schemas for PapLens API request validation and response serialization.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DiagnosticPatchInfo(BaseModel):
    """Spatial bounding box and attention score for a high-attention diagnostic patch."""
    rank: int = Field(..., description="Rank among all patches sorted by attention score")
    attention_score: float = Field(..., description="Normalized attention score [0, 1]")
    raw_attention: float = Field(..., description="Raw softmax attention weight")
    box: Dict[str, int] = Field(..., description="Bounding box in original image coordinates {x, y, width, height}")
    box_display: Dict[str, int] = Field(..., description="Bounding box in display image coordinates {x, y, width, height}")


class PredictionResponse(BaseModel):
    """Detailed prediction payload returned by POST /predict."""
    model_type: str = Field(..., description="Model architecture used: 'triage' (2-Class) or 'severity' (3-Class)")
    predicted_class: str = Field(..., description="Predicted class identifier (e.g., 'Normal', 'Abnormal', 'Low_Grade', 'High_Grade')")
    display_name: str = Field(..., description="Human-readable Bethesda clinical description")
    severity_level: str = Field(..., description="UI badge severity level: 'success', 'warning', 'danger'")
    confidence: float = Field(..., description="Confidence probability of the predicted class (0.0 to 1.0)")
    probabilities: Dict[str, float] = Field(..., description="Per-class probabilities")
    classes: List[str] = Field(..., description="Ordered list of class names")
    num_patches: int = Field(..., description="Total non-background diagnostic patches analyzed")
    inference_time_ms: float = Field(..., description="Total wall-clock inference duration in milliseconds")
    
    # Visualizations
    overlay_base64: str = Field(..., description="Data URI for blended original + heatmap image (PNG)")
    heatmap_only_base64: str = Field(..., description="Data URI for pure colored heatmap (PNG) for dynamic client-side opacity")
    original_display_base64: str = Field(..., description="Data URI for downscaled original image (PNG)")
    display_width: int = Field(..., description="Width of the visualization images")
    display_height: int = Field(..., description="Height of the visualization images")
    top_patches: List[DiagnosticPatchInfo] = Field(default_factory=list, description="Top diagnostic patches")


class HealthResponse(BaseModel):
    """Response returned by GET /health."""
    status: str = Field("ok", description="Server status indicator")
    models_loaded: bool = Field(..., description="True if PyTorch model pipelines are loaded into memory")
    available_models: List[str] = Field(..., description="List of supported model types")
    device: str = Field(..., description="Inference device: 'cpu' or 'cuda'")
    torch_threads: int = Field(..., description="Configured CPU thread count")
    version: str = Field(..., description="Backend API version")


class ErrorResponse(BaseModel):
    """Standardized error response schema."""
    error: str = Field(..., description="Error category or code")
    detail: str = Field(..., description="User-friendly error explanation")
