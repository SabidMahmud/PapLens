"""Inference pipelines and model lifecycle management."""

import logging

import torch
import torch.nn as nn
import torch.nn.functional as F

from app.config import settings
from app.errors import ModelNotReadyError
from app.labels import MODEL_CLASSES, ModelType
from app.ml.architecture import AttentionMIL
from app.ml.checkpoints import (
    load_abmil_aggregator,
    load_feature_extractor,
    resolve_weight_path,
)


logger = logging.getLogger(__name__)


class ModelPipeline:
    """A matched feature extractor and Attention-MIL aggregator."""

    def __init__(
        self,
        extractor: nn.Module,
        aggregator: AttentionMIL,
        classes: tuple[str, ...],
    ) -> None:
        self.extractor = extractor
        self.aggregator = aggregator
        self.classes = classes

    @torch.no_grad()
    def predict(
        self, bag_tensor: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, int, torch.Tensor]:
        """Return probabilities, attention, predicted index, and logits."""
        device = next(self.extractor.parameters()).device
        bag_tensor = bag_tensor.to(device)
        features = self.extractor(bag_tensor)
        features = features.view(features.size(0), -1).unsqueeze(0)
        logits, attention_weights = self.aggregator(features)
        probabilities = F.softmax(logits, dim=1)
        predicted_index = torch.argmax(probabilities, dim=1).item()
        return probabilities, attention_weights, predicted_index, logits


class ModelManager:
    """Own all inference pipelines loaded during application startup."""

    def __init__(self) -> None:
        self.pipelines: dict[ModelType, ModelPipeline] = {}
        self.is_loaded = False

    @property
    def available_models(self) -> list[ModelType]:
        """Return model identifiers in their configured display order."""
        return list(MODEL_CLASSES)

    def load_all_models(self) -> None:
        """Load the two-class triage and three-class severity pipelines."""
        if self.is_loaded:
            return

        if settings.DEVICE == "cpu" and settings.TORCH_THREADS > 0:
            torch.set_num_threads(settings.TORCH_THREADS)

        loaded_pipelines: dict[ModelType, ModelPipeline] = {
            "triage": self._load_pipeline(
                folder="2Class_Triage",
                classes=MODEL_CLASSES["triage"],
            ),
            "severity": self._load_pipeline(
                folder="3Class_Severity",
                classes=MODEL_CLASSES["severity"],
            ),
        }
        self.pipelines = loaded_pipelines
        self.is_loaded = True
        logger.info(
            "[ModelManager] Successfully loaded 2-Class Triage and "
            "3-Class Severity pipelines."
        )

    def _load_pipeline(
        self, folder: str, classes: tuple[str, ...]
    ) -> ModelPipeline:
        extractor_path = resolve_weight_path(folder, "best_cnn_extractor.pth")
        aggregator_path = resolve_weight_path(folder, "best_abmil_focal.pth")
        extractor = load_feature_extractor(extractor_path, settings.DEVICE)
        aggregator = load_abmil_aggregator(
            aggregator_path,
            num_classes=len(classes),
            device=settings.DEVICE,
        )
        return ModelPipeline(extractor, aggregator, classes)

    def get_pipeline(self, model_type: ModelType = "triage") -> ModelPipeline:
        """Return a loaded pipeline for the requested task."""
        if not self.is_loaded:
            raise ModelNotReadyError("Inference models are not ready.")
        if model_type not in self.pipelines:
            raise ValueError(
                f"Unknown model_type '{model_type}'. Choose 'triage' or 'severity'."
            )
        return self.pipelines[model_type]
