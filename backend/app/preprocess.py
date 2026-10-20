"""
Image validation, decoding, patch extraction, and normalization for PapLens AB-MIL.
"""
import io
from typing import List, Tuple
import cv2
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as transforms

from app.config import settings
from app.errors import ImageDimensionsExceeded


# ImageNet normalization transform matching research pipeline
patch_transform = transforms.Compose([
    transforms.Resize((settings.BACKBONE_INPUT_SIZE, settings.BACKBONE_INPUT_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


def compute_background_ratio(patch_array: np.ndarray) -> float:
    """Calculates the exact white background ratio in a patch."""
    gray = cv2.cvtColor(patch_array, cv2.COLOR_RGB2GRAY)
    white_pixels = np.sum(gray > 220)
    total_pixels = gray.shape[0] * gray.shape[1]
    return float(white_pixels / total_pixels)


def validate_and_decode_image(image_bytes: bytes | bytearray) -> np.ndarray:
    """
    Validates uploaded raw bytes and decodes into an RGB uint8 numpy array.
    Rejects corrupted images, unsupported formats, and oversized files.
    """
    if len(image_bytes) == 0:
        raise ValueError("Uploaded file is empty.")

    if len(image_bytes) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise ValueError(f"File exceeds maximum upload size of {settings.MAX_UPLOAD_MB} MB.")

    try:
        with Image.open(io.BytesIO(image_bytes)) as image_probe:
            image_format = (image_probe.format or "").upper()
            if image_format not in ["JPEG", "JPG", "PNG"]:
                raise ValueError(
                    f"Unsupported image format: {image_format}. Only JPEG and PNG are allowed."
                )

            width, height = image_probe.size
            long_side = max(width, height)
            short_side = min(width, height)
            total_pixels = width * height
            if (
                long_side > settings.MAX_LONG_SIDE
                or short_side > settings.MAX_SHORT_SIDE
                or total_pixels > settings.MAX_IMAGE_PIXELS
            ):
                raise ImageDimensionsExceeded(
                    f"Image resolution {width}x{height} exceeds the maximum allowed "
                    f"dimensions of {settings.MAX_LONG_SIDE}x{settings.MAX_SHORT_SIDE} "
                    f"(landscape or portrait) and {settings.MAX_IMAGE_PIXELS:,} total pixels."
                )

            image_probe.verify()
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Invalid or corrupted image file: {str(e)}")

    # Re-open after verify() (Pillow requirement), then decode to RGB.
    try:
        with Image.open(io.BytesIO(image_bytes)) as pil_image:
            return np.array(pil_image.convert("RGB"))
    except Exception as e:
        raise ValueError(f"Invalid or corrupted image file: {str(e)}")


def extract_patches(
    img_array: np.ndarray,
    patch_size: int = settings.PATCH_SIZE,
    stride: int = settings.STRIDE,
    bg_threshold: float = settings.BG_THRESHOLD,
) -> Tuple[torch.Tensor, List[Tuple[int, int]], Tuple[int, int]]:
    """
    Extracts 1280x1280 patches from an FOV image using sliding window and background rejection.
    Returns:
        bag_tensor: Tensor of shape (N, 3, 224, 224) ready for the feature extractor
        coords: List of (x, y) coordinates of extracted patches
        original_shape: (height, width) of the original image
    """
    h, w = img_array.shape[:2]

    # Handle images smaller than patch size by padding
    if h < patch_size or w < patch_size:
        pad_h = max(0, patch_size - h)
        pad_w = max(0, patch_size - w)
        img_array = cv2.copyMakeBorder(
            img_array, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT_101
        )
        h, w = img_array.shape[:2]

    # Generate sliding window coordinates matching research code
    y_coords = list(range(0, h - patch_size + 1, stride))
    if not y_coords or y_coords[-1] + patch_size < h:
        y_coords.append(max(0, h - patch_size))
    x_coords = list(range(0, w - patch_size + 1, stride))
    if not x_coords or x_coords[-1] + patch_size < w:
        x_coords.append(max(0, w - patch_size))

    candidate_patches = []
    candidate_coords = []
    bg_ratios = []

    for y in y_coords:
        for x in x_coords:
            patch = img_array[y : y + patch_size, x : x + patch_size]
            bg_ratio = compute_background_ratio(patch)
            candidate_patches.append(patch)
            candidate_coords.append((x, y))
            bg_ratios.append(bg_ratio)

    # Filter out patches exceeding background threshold
    bag_patches = []
    retained_coords = []
    for patch, coord, bg_ratio in zip(candidate_patches, candidate_coords, bg_ratios):
        if bg_ratio <= bg_threshold:
            patch_pil = Image.fromarray(patch)
            bag_patches.append(patch_transform(patch_pil))
            retained_coords.append(coord)

    # Fallback: if all patches were rejected as background, select the top 3 with lowest bg ratio
    if len(bag_patches) == 0:
        sorted_indices = np.argsort(bg_ratios)[: min(3, len(candidate_patches))]
        for idx in sorted_indices:
            patch_pil = Image.fromarray(candidate_patches[idx])
            bag_patches.append(patch_transform(patch_pil))
            retained_coords.append(candidate_coords[idx])

    bag_tensor = torch.stack(bag_patches)
    return bag_tensor, retained_coords, (img_array.shape[0], img_array.shape[1])
