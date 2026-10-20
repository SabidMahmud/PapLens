"""
Attention Heatmap Generation Module.
Maps patch-level attention weights back to slide coordinates, performs spatial accumulation,
applies colormaps (JET), generates blended overlays, and produces downscaled base64 PNGs.
"""
import base64
import io
from typing import Dict, List, Optional, Tuple, Any
import cv2
import numpy as np
from PIL import Image

from app.config import settings


def encode_array_to_base64_png(image_rgb: np.ndarray) -> str:
    """
    Encodes an RGB uint8 numpy image into a base64 PNG data URI string.
    """
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    success, buffer = cv2.imencode(".png", image_bgr)
    if not success:
        raise ValueError("Failed to encode image to PNG format.")
    b64_str = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


def downscale_image(image: np.ndarray, max_side: int = 1024) -> Tuple[np.ndarray, float]:
    """
    Downscales an image so its longest side does not exceed max_side.
    Preserves exact aspect ratio.
    Returns:
        downscaled_image: np.ndarray
        scale_factor: float (downscaled / original)
    """
    h, w = image.shape[:2]
    max_dim = max(h, w)
    if max_dim <= max_side:
        return image, 1.0

    scale = max_side / float(max_dim)
    new_w = int(round(w * scale))
    new_h = int(round(h * scale))

    # cv2.INTER_AREA is best for decimation / downscaling
    downscaled = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return downscaled, scale


def generate_attention_heatmap(
    orig_img_rgb: np.ndarray,
    coords: List[Tuple[int, int]],
    attention_weights: np.ndarray,
    patch_size: int = settings.PATCH_SIZE,
    max_display_side: int = 1024,
    colormap: int = cv2.COLORMAP_JET,
    overlay_weight: float = 0.6,
    heatmap_weight: float = 0.4,
    crop_shape: Optional[Tuple[int, int]] = None,
) -> Dict[str, Any]:
    """
    Generates attention heatmap and overlay from patch coordinates and attention weights.

    Args:
        orig_img_rgb: Full resolution RGB image array (H, W, 3)
        coords: List of (x, y) patch coordinates in original coordinate space
        attention_weights: (N,) attention scores from AttentionMIL
        patch_size: Extracted patch dimension (default 1280)
        max_display_side: Maximum width/height for web delivery (default 1024)
        colormap: OpenCV colormap (default COLORMAP_JET)
        overlay_weight: Weight of original image in blended overlay
        heatmap_weight: Weight of colormap in blended overlay
        crop_shape: (H, W) if original image was padded and should be cropped back

    Returns:
        dict with:
            - overlay_base64: pre-blended overlay data URI (60% smear + 40% heatmap)
            - heatmap_only_base64: pure colored heatmap data URI for client opacity slider
            - original_display_base64: downscaled original image data URI
            - display_width: width of display images
            - display_height: height of display images
            - top_patches: diagnostic patches with normalized attention and coords
    """
    # Ensure 3-channel RGB uint8 format
    if orig_img_rgb.ndim == 2:
        orig_img_rgb = cv2.cvtColor(orig_img_rgb, cv2.COLOR_GRAY2RGB)
    elif orig_img_rgb.shape[2] == 4:
        orig_img_rgb = cv2.cvtColor(orig_img_rgb, cv2.COLOR_RGBA2RGB)

    h, w = orig_img_rgb.shape[:2]

    # Normalize attention weights to [0, 1]
    attn = np.asarray(attention_weights, dtype=np.float32).flatten()
    if len(attn) == 0:
        attn_norm = np.array([1.0], dtype=np.float32)
    elif np.max(attn) == np.min(attn):
        attn_norm = np.ones_like(attn, dtype=np.float32)
    else:
        attn_norm = (attn - np.min(attn)) / (np.max(attn) - np.min(attn) + 1e-8)

    # 1. Accumulate spatial attention mask matching research code
    mask = np.zeros((h, w), dtype=np.float32)
    count_mask = np.zeros((h, w), dtype=np.float32)

    for i, (x, y) in enumerate(coords):
        # Clip coordinates to image boundary to protect against small image padding
        y1, y2 = max(0, y), min(h, y + patch_size)
        x1, x2 = max(0, x), min(w, x + patch_size)
        if y2 > y1 and x2 > x1:
            mask[y1:y2, x1:x2] += attn_norm[i]
            count_mask[y1:y2, x1:x2] += 1.0

    count_mask[count_mask == 0] = 1.0
    mask = mask / count_mask

    # Crop unpadded region if needed
    if crop_shape is not None and (crop_shape[0] < h or crop_shape[1] < w):
        crop_h, crop_w = crop_shape
        orig_img_rgb = orig_img_rgb[:crop_h, :crop_w]
        mask = mask[:crop_h, :crop_w]
        h, w = crop_h, crop_w

    # 2. Downscale both original image and float mask before colormapping for fast web delivery
    orig_display, scale_factor = downscale_image(orig_img_rgb, max_side=max_display_side)
    disp_h, disp_w = orig_display.shape[:2]

    mask_display = cv2.resize(mask, (disp_w, disp_h), interpolation=cv2.INTER_LINEAR)

    # 3. Apply Colormap
    mask_uint8 = np.uint8(np.clip(255.0 * mask_display, 0, 255))
    heatmap_bgr = cv2.applyColorMap(mask_uint8, colormap)
    heatmap_rgb = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2RGB)

    # 4. Generate Pre-Blended Overlay
    overlay_rgb = cv2.addWeighted(
        orig_display, overlay_weight, heatmap_rgb, heatmap_weight, 0
    )

    # 5. Extract Top Diagnostic Patches for Pathologist Explainability
    top_indices = np.argsort(attn_norm)[::-1][: min(5, len(attn_norm))]
    top_patches = []
    for rank, idx in enumerate(top_indices, 1):
        x, y = coords[idx]
        top_patches.append({
            "rank": rank,
            "attention_score": float(round(float(attn_norm[idx]), 4)),
            "raw_attention": float(round(float(attn[idx]), 6)),
            "box": {
                "x": int(x),
                "y": int(y),
                "width": int(min(patch_size, w - x)),
                "height": int(min(patch_size, h - y)),
            },
            "box_display": {
                "x": int(round(x * scale_factor)),
                "y": int(round(y * scale_factor)),
                "width": int(round(min(patch_size, w - x) * scale_factor)),
                "height": int(round(min(patch_size, h - y) * scale_factor)),
            },
        })

    return {
        "overlay_base64": encode_array_to_base64_png(overlay_rgb),
        "heatmap_only_base64": encode_array_to_base64_png(heatmap_rgb),
        "original_display_base64": encode_array_to_base64_png(orig_display),
        "display_width": disp_w,
        "display_height": disp_h,
        "scale_factor": float(scale_factor),
        "top_patches": top_patches,
    }
