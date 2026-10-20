'use client';

import { useRef, useState } from 'react';
import { PredictionResponse } from '@/lib/types';

interface HeatmapViewerProps { result: PredictionResponse; }
type ViewMode = 'original' | 'overlay' | 'compare';

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image could not be loaded.'));
    image.src = source;
  });
}

export function HeatmapViewer({ result }: HeatmapViewerProps) {
  const [opacity, setOpacity] = useState(0.42);
  const [viewMode, setViewMode] = useState<ViewMode>('overlay');
  const [highlightedPatch, setHighlightedPatch] = useState<number | null>(null);
  const [showRegions, setShowRegions] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportingRef = useRef(false);
  const activePatch = result.top_patches.find((patch) => patch.rank === highlightedPatch);
  const fullView = `0 0 ${result.display_width} ${result.display_height}`;
  // Both comparison panels use the same crop, preserving spatial alignment.
  const crop = activePatch?.box_display;
  const padding = crop ? Math.max(crop.width, crop.height) * 0.15 : 0;
  const left = crop ? Math.max(0, crop.x - padding) : 0;
  const top = crop ? Math.max(0, crop.y - padding) : 0;
  const viewBox = crop
    ? `${left} ${top} ${Math.min(result.display_width, crop.x + crop.width + padding) - left} ${Math.min(result.display_height, crop.y + crop.height + padding) - top}`
    : fullView;

  const exportField = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setExportError(null);
    try {
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
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Image export failed.')), 'image/png'));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `paplens-${result.model_type}-${viewMode === 'original' ? 'original' : 'attention'}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError('The image could not be exported. Please try again.');
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  const field = (withHeatmap: boolean, label: string) => (
    <svg role="img" aria-label={label} viewBox={viewBox} className="block h-full w-full" preserveAspectRatio="xMidYMid meet">
      <image href={result.original_display_base64} width={result.display_width} height={result.display_height} />
      {withHeatmap && <image href={result.heatmap_only_base64} width={result.display_width} height={result.display_height} opacity={opacity} />}
      {showRegions && result.top_patches.map((patch) => {
        const active = patch.rank === highlightedPatch;
        return (
          <g key={patch.rank} opacity={activePatch && !active ? 0.25 : 1}>
            <rect {...patch.box_display} fill="none" stroke={active ? '#ffffff' : '#f4cf81'} strokeWidth={active ? 3 : 1.5} vectorEffect="non-scaling-stroke" />
            <rect x={patch.box_display.x} y={patch.box_display.y} width="24" height="22" fill={active ? '#ffffff' : '#f4cf81'} />
            <text x={patch.box_display.x + 7} y={patch.box_display.y + 15} fill="#17211f" fontSize="12" fontWeight="700">{patch.rank}</text>
          </g>
        );
      })}
    </svg>
  );

  return (
    <section className="border border-[#c7cac4] bg-[#fbfaf7]" aria-labelledby="evidence-map-title">
      <header className="flex flex-col justify-between gap-5 border-b border-[#d9d8d1] p-5 sm:p-7 lg:flex-row lg:items-end">
        <div>
          <p className="quiet-label text-[#0d6b62]">Explore the model&apos;s attention</p>
          <h2 id="evidence-map-title" className="font-display mt-3 text-3xl tracking-[-0.02em]">Evidence map</h2>
          <p className="mt-2 text-xs leading-5 text-[#65706c]">Compare the original field with its attention overlay, or inspect a region below.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Evidence map view" className="flex border border-[#bfc2bc] bg-[#efeee8] p-1">
            {(['original', 'overlay', 'compare'] as const).map((value) => (
              <button key={value} type="button" aria-pressed={viewMode === value} onClick={() => setViewMode(value)} className={`min-h-10 px-3 text-xs font-semibold capitalize transition-colors ${viewMode === value ? 'bg-[#17211f] text-white' : 'text-[#5f6965] hover:bg-[#e0e1db]'}`}>{value}</button>
            ))}
          </div>
          <button type="button" onClick={exportField} disabled={exporting} title="Download the full displayed field at the current blend, without region boxes" className="min-h-11 border border-[#aeb2ac] px-4 text-xs font-semibold text-[#38433f] hover:border-[#17211f] hover:bg-[#17211f] hover:text-white disabled:opacity-50">{exporting ? 'Exporting…' : 'Export field ↓'}</button>
        </div>
      </header>

      <div className="bg-[#111715] text-[#edf1ef]">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-white/10 px-4 py-2 sm:px-6">
          <div className="flex min-h-11 items-center gap-3 text-xs">
            <span role="status">{activePatch ? `Region ${activePatch.rank} · detail view` : 'Full field'}</span>
            {activePatch && <button type="button" onClick={() => setHighlightedPatch(null)} className="min-h-11 text-[#9ddbd1] underline underline-offset-4">Fit field</button>}
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs"><input type="checkbox" checked={showRegions} onChange={(event) => setShowRegions(event.target.checked)} className="h-4 w-4 accent-[#62b6a9]" />Region outlines</label>
          <div className={`flex min-w-0 flex-1 items-center gap-3 text-xs sm:max-w-xs ${viewMode === 'original' ? 'opacity-40' : ''}`}>
            <label htmlFor="heatmap-opacity" className="shrink-0">Blend</label>
            <input id="heatmap-opacity" aria-label="Heatmap opacity" aria-valuetext={`${Math.round(opacity * 100)} percent`} type="range" min="0" max="1" step="0.01" value={opacity} disabled={viewMode === 'original'} onChange={(event) => setOpacity(Number(event.target.value))} className="w-full min-w-16 accent-[#62b6a9]" />
            <output htmlFor="heatmap-opacity" className="w-8 shrink-0 font-mono">{Math.round(opacity * 100)}%</output>
          </div>
        </div>
        <div className={viewMode === 'compare' ? 'grid gap-px bg-white/10 md:grid-cols-2' : ''}>
          {(viewMode === 'compare' ? [false, true] : [viewMode === 'overlay']).map((withHeatmap) => (
            <figure key={String(withHeatmap)} className="min-w-0 bg-[#111715]">
              {viewMode === 'compare' && <figcaption className="border-b border-white/10 px-5 py-3 text-xs text-white/70">{withHeatmap ? 'Attention overlay' : 'Original field'}</figcaption>}
              <div className="viewer-checkerboard mx-auto h-[clamp(260px,55vw,580px)] w-full p-3 sm:p-5">
                {field(withHeatmap, withHeatmap ? 'Field with attention overlay' : 'Original microscopy field')}
              </div>
            </figure>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-white/60"><span>Display: {result.display_width} × {result.display_height} px</span><span>Export includes the full displayed field at the current blend.</span></div>
      </div>
      {exportError && <p role="alert" className="border-b border-[#d9d8d1] bg-[#f8e9e6] px-5 py-3 text-sm text-[#a33d35]">{exportError}</p>}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 p-5 sm:p-7">
          <p className="quiet-label text-[#65706c]">Highest attention regions</p>
          <p className="mt-2 text-xs leading-5 text-[#65706c]">Select a preview to inspect it. Scores show relative attention, not clinical probability.</p>
          {result.top_patches.length ? <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {result.top_patches.map((patch) => (
              <button key={patch.rank} type="button" aria-label={`Inspect region ${patch.rank}`} aria-pressed={highlightedPatch === patch.rank} onClick={() => setHighlightedPatch(highlightedPatch === patch.rank ? null : patch.rank)} className={`min-w-0 overflow-hidden border text-left transition-colors ${highlightedPatch === patch.rank ? 'border-[#0d6b62] bg-[#e4f0ed] ring-1 ring-[#0d6b62]' : 'border-[#d5d6d0] hover:border-[#0d6b62]'}`}>
                <svg aria-hidden="true" viewBox={`${patch.box_display.x} ${patch.box_display.y} ${patch.box_display.width} ${patch.box_display.height}`} className="aspect-square w-full bg-[#111715]" preserveAspectRatio="xMidYMid slice"><image href={result.original_display_base64} width={result.display_width} height={result.display_height} /></svg>
                <span className="flex flex-wrap justify-between gap-1 p-2 font-mono text-xs"><span>#{patch.rank}</span><span className="text-[#0d6b62]">{patch.attention_score.toFixed(2)}</span></span>
              </button>
            ))}
          </div> : <p className="mt-5 border border-dashed border-[#c7cac4] p-5 text-sm text-[#65706c]">No region previews were returned for this field.</p>}
        </div>
        <aside className="border-t border-[#d9d8d1] bg-[#efeee8] p-5 sm:p-7 lg:border-l lg:border-t-0">
          <p className="quiet-label text-[#65706c]">Reading the map</p>
          <div className="mt-5 h-2.5" style={{ background: 'linear-gradient(90deg, #001dff, #00c7e6 30%, #39d27d 50%, #f5e642 72%, #e32617)' }} aria-hidden="true" />
          <div className="mt-2 flex justify-between text-[11px] text-[#65706c]"><span>Lower attention</span><span>Higher attention</span></div>
          <p className="mt-5 text-xs leading-5 text-[#5f6965]">Warmer colors indicate higher model attention. This is not a lesion boundary or a diagnosis.</p>
          <p className="mt-3 text-xs leading-5 text-[#65706c]">Region previews are cropped from the display image; zooming does not add image detail.</p>
        </aside>
      </div>
    </section>
  );
}
