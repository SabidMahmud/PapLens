import { EvidenceViewMode, PredictionResponse } from '@/domain/analysis';

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be loaded.'));
    image.src = source;
  });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Image export failed.')),
      'image/png'
    );
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportEvidenceField(
  result: PredictionResponse,
  viewMode: EvidenceViewMode,
  opacity: number
): Promise<void> {
  const [original, heatmap] = await Promise.all([
    loadImage(result.original_display_base64),
    loadImage(result.heatmap_only_base64),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = result.display_width;
  canvas.height = result.display_height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image export is unavailable.');

  context.drawImage(original, 0, 0, canvas.width, canvas.height);
  context.globalAlpha = viewMode === 'original' ? 0 : opacity;
  context.drawImage(heatmap, 0, 0, canvas.width, canvas.height);

  const suffix = viewMode === 'original' ? 'original' : 'attention';
  downloadBlob(await canvasToPng(canvas), `paplens-${result.model_type}-${suffix}.png`);
}
