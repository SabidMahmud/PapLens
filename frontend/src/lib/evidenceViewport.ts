import { PredictionResponse } from '@/domain/analysis';

export function getEvidenceViewBox(
  result: PredictionResponse,
  highlightedRank: number | null
): string {
  const fullView = `0 0 ${result.display_width} ${result.display_height}`;
  const patch = result.top_patches.find(({ rank }) => rank === highlightedRank);
  if (!patch) return fullView;

  const crop = patch.box_display;
  const padding = Math.max(crop.width, crop.height) * 0.15;
  const left = Math.max(0, crop.x - padding);
  const top = Math.max(0, crop.y - padding);
  const right = Math.min(result.display_width, crop.x + crop.width + padding);
  const bottom = Math.min(result.display_height, crop.y + crop.height + padding);
  return `${left} ${top} ${right - left} ${bottom - top}`;
}
