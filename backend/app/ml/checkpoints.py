"""Checkpoint resolution and model-component loading."""

from pathlib import Path

import torch
import torch.nn as nn
from torchvision import models

from app.config import settings
from app.ml.architecture import AttentionMIL


def resolve_weight_path(pipeline_folder: str, filename: str) -> str:
    """Resolve local, legacy, or Hugging Face checkpoint locations."""
    local_path = Path(settings.WEIGHTS_DIR) / pipeline_folder / filename
    if local_path.is_file():
        return str(local_path)

    legacy_folder = (
        f"04_{pipeline_folder}" if "2Class" in pipeline_folder else f"05_{pipeline_folder}"
    )
    legacy_path = Path(settings.WEIGHTS_DIR) / legacy_folder / filename
    if legacy_path.is_file():
        return str(legacy_path)

    if settings.HF_REPO_ID:
        try:
            from huggingface_hub import hf_hub_download

            print(
                f"[Hybrid Model Loader] Local file {local_path} not found. "
                f"Downloading from Hugging Face repo '{settings.HF_REPO_ID}': "
                f"{pipeline_folder}/{filename}..."
            )
            return hf_hub_download(
                repo_id=settings.HF_REPO_ID,
                filename=f"{pipeline_folder}/{filename}",
                token=settings.HF_TOKEN or None,
                local_dir=settings.WEIGHTS_DIR,
            )
        except Exception as exc:
            raise FileNotFoundError(
                f"Weight file '{filename}' was not found locally at {local_path} and "
                f"Hugging Face download failed: {exc}"
            ) from exc

    raise FileNotFoundError(
        f"Weight file '{filename}' was not found locally at {local_path}. "
        f"Please place checkpoint files in backend/weights/{pipeline_folder}/ or set HF_REPO_ID."
    )


def load_feature_extractor(
    weights_path: str, device: str = settings.DEVICE
) -> nn.Module:
    """Instantiate and load the ResNet-50 feature-extraction backbone."""
    base = models.resnet50(weights=None)
    extractor = nn.Sequential(*list(base.children())[:-1])
    state_dict = torch.load(weights_path, map_location=device, weights_only=True)
    extractor.load_state_dict(state_dict)
    extractor.to(device)
    extractor.eval()
    return extractor


def load_abmil_aggregator(
    weights_path: str,
    num_classes: int,
    device: str = settings.DEVICE,
) -> AttentionMIL:
    """Instantiate and load the gated Attention-MIL aggregator."""
    model = AttentionMIL(feature_dim=2048, num_classes=num_classes)
    state_dict = torch.load(weights_path, map_location=device, weights_only=True)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model
