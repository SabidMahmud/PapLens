"""
PyTorch model architecture, checkpoint loader, and inference wrapper for PapLens AB-MIL.
Implements the hybrid weights strategy (local weights first, Hugging Face Hub fallback).
"""
import os
from pathlib import Path
from typing import Dict, Optional, Tuple
import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models

from app.config import settings
from app.labels import (
    ModelType,
    TRIAGE_CLASSES,
    SEVERITY_CLASSES,
    get_classes_for_model,
)


class AttentionMIL(nn.Module):
    """
    Gated Attention Deep MIL aggregator (Ilse et al.).
    Exact architecture used in the thesis research evaluation.
    """

    def __init__(self, feature_dim: int = 2048, num_classes: int = 2):
        super().__init__()
        self.L = 512
        self.D = 128
        self.K = 1

        self.feature_extractor_part2 = nn.Sequential(
            nn.Linear(feature_dim, self.L),
            nn.ReLU(),
            nn.Dropout(0.2),
        )
        self.attention_V = nn.Sequential(nn.Linear(self.L, self.D), nn.Tanh())
        self.attention_U = nn.Sequential(nn.Linear(self.L, self.D), nn.Sigmoid())
        self.attention_weights = nn.Linear(self.D, self.K)
        self.classifier = nn.Sequential(nn.Linear(self.L * self.K, num_classes))

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        Forward pass.
        Args:
            x: Tensor of shape (N, feature_dim) or (1, N, feature_dim)
        Returns:
            logits: (1, num_classes)
            A: (1, N) attention weights normalized by softmax across instances
        """
        if x.dim() == 3:
            x = x.squeeze(0)
        x = x.view(x.size(0), -1)
        H = self.feature_extractor_part2(x)                     # (N, 512)
        A_V = self.attention_V(H)                               # (N, 128)
        A_U = self.attention_U(H)                               # (N, 128)
        A = self.attention_weights(A_V * A_U)                   # (N, 1)
        A = torch.transpose(A, 1, 0)                            # (1, N)
        A = F.softmax(A, dim=1)                                 # (1, N)
        M = torch.mm(A, H)                                      # (1, 512)
        logits = self.classifier(M)                             # (1, num_classes)
        return logits, A


def resolve_weight_path(pipeline_folder: str, filename: str) -> str:
    """
    Hybrid weight resolver:
    1. Checks local path in settings.WEIGHTS_DIR/pipeline_folder/filename
    2. If not found locally, falls back to downloading from Hugging Face Hub (if HF_REPO_ID is set).
    """
    local_path = Path(settings.WEIGHTS_DIR) / pipeline_folder / filename
    if local_path.is_file():
        return str(local_path)

    # Attempt Hugging Face Hub fallback download
    if settings.HF_REPO_ID:
        try:
            from huggingface_hub import hf_hub_download

            print(
                f"[Hybrid Model Loader] Local file {local_path} not found. "
                f"Downloading from Hugging Face repo '{settings.HF_REPO_ID}': {pipeline_folder}/{filename}..."
            )
            downloaded_path = hf_hub_download(
                repo_id=settings.HF_REPO_ID,
                filename=f"{pipeline_folder}/{filename}",
                token=settings.HF_TOKEN if settings.HF_TOKEN else None,
                local_dir=settings.WEIGHTS_DIR,
            )
            return downloaded_path
        except Exception as e:
            raise FileNotFoundError(
                f"Weight file '{filename}' was not found locally at {local_path} and "
                f"Hugging Face download failed: {str(e)}"
            )

    raise FileNotFoundError(
        f"Weight file '{filename}' was not found locally at {local_path}. "
        f"Please place checkpoint files in backend/weights/{pipeline_folder}/ or set HF_REPO_ID."
    )


def load_feature_extractor(weights_path: str, device: str = settings.DEVICE) -> nn.Module:
    """Instantiates and loads the ResNet-50 feature extractor backbone (318 layers)."""
    base = models.resnet50(weights=None)
    extractor = nn.Sequential(*list(base.children())[:-1])
    state_dict = torch.load(weights_path, map_location=device, weights_only=True)
    extractor.load_state_dict(state_dict)
    extractor.to(device)
    extractor.eval()
    return extractor


def load_abmil_aggregator(
    weights_path: str, num_classes: int, device: str = settings.DEVICE
) -> AttentionMIL:
    """Instantiates and loads the Gated Attention-MIL aggregator."""
    model = AttentionMIL(feature_dim=2048, num_classes=num_classes)
    state_dict = torch.load(weights_path, map_location=device, weights_only=True)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model


class ModelPipeline:
    """Encapsulates a matched feature extractor + AttentionMIL pair for a specific task."""

    def __init__(self, extractor: nn.Module, aggregator: AttentionMIL, classes: list):
        self.extractor = extractor
        self.aggregator = aggregator
        self.classes = classes

    @torch.no_grad()
    def predict(
        self, bag_tensor: torch.Tensor
    ) -> Tuple[torch.Tensor, torch.Tensor, int, torch.Tensor]:
        """
        Runs full inference on a bag of patches.
        Args:
            bag_tensor: (N, 3, 224, 224)
        Returns:
            probs: (1, num_classes)
            attention_weights: (1, N)
            pred_idx: int
            logits: (1, num_classes)
        """
        device = next(self.extractor.parameters()).device
        bag_tensor = bag_tensor.to(device)

        # 1. Extract 2048-dim feature embeddings for all patches
        features = self.extractor(bag_tensor)                   # (N, 2048, 1, 1)
        features = features.view(features.size(0), -1)          # (N, 2048)
        features = features.unsqueeze(0)                        # (1, N, 2048)

        # 2. Run Attention-MIL prediction
        logits, attention_weights = self.aggregator(features)   # logits: (1, C), A: (1, N)
        probs = F.softmax(logits, dim=1)
        pred_idx = torch.argmax(probs, dim=1).item()

        return probs, attention_weights, pred_idx, logits


class ModelManager:
    """
    Singleton manager holding active model pipelines. Loaded once during application startup.
    """

    def __init__(self):
        self.pipelines: Dict[str, ModelPipeline] = {}
        self.is_loaded: bool = False

    def load_all_models(self):
        """Loads both 2-Class Triage and 3-Class Severity pipelines into memory."""
        if self.is_loaded:
            return

        # Configure CPU threading
        if settings.DEVICE == "cpu" and settings.TORCH_THREADS > 0:
            torch.set_num_threads(settings.TORCH_THREADS)

        # 1. Load 2-Class Clinical Triage pipeline
        triage_extractor_path = resolve_weight_path("04_2Class_Triage", "best_cnn_extractor.pth")
        triage_abmil_path = resolve_weight_path("04_2Class_Triage", "best_abmil_focal.pth")
        triage_extractor = load_feature_extractor(triage_extractor_path, settings.DEVICE)
        triage_abmil = load_abmil_aggregator(triage_abmil_path, num_classes=2, device=settings.DEVICE)
        self.pipelines["triage"] = ModelPipeline(triage_extractor, triage_abmil, TRIAGE_CLASSES)

        # 2. Load 3-Class Severity Grading pipeline
        severity_extractor_path = resolve_weight_path("05_3Class_Severity", "best_cnn_extractor.pth")
        severity_abmil_path = resolve_weight_path("05_3Class_Severity", "best_abmil_focal.pth")
        severity_extractor = load_feature_extractor(severity_extractor_path, settings.DEVICE)
        severity_abmil = load_abmil_aggregator(severity_abmil_path, num_classes=3, device=settings.DEVICE)
        self.pipelines["severity"] = ModelPipeline(severity_extractor, severity_abmil, SEVERITY_CLASSES)

        self.is_loaded = True
        print("[ModelManager] Successfully loaded 2-Class Triage and 3-Class Severity pipelines.")

    def get_pipeline(self, model_type: ModelType = "triage") -> ModelPipeline:
        """Retrieves the requested pipeline."""
        if not self.is_loaded:
            self.load_all_models()
        if model_type not in self.pipelines:
            raise ValueError(f"Unknown model_type '{model_type}'. Choose 'triage' or 'severity'.")
        return self.pipelines[model_type]


# Global singleton instance
model_manager = ModelManager()
