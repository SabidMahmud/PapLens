'use client';

import React, { useState } from 'react';
import { DiagnosticPatchInfo, PredictionResponse } from '@/lib/types';

interface HeatmapViewerProps {
  result: PredictionResponse;
}

export const HeatmapViewer: React.FC<HeatmapViewerProps> = ({ result }) => {
  const [viewMode, setViewMode] = useState<'overlay' | 'side-by-side'>('overlay');
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.55);
  const [highlightedPatch, setHighlightedPatch] = useState<number | null>(null);

  const downloadOverlay = () => {
    const link = document.createElement('a');
    link.href = result.overlay_base64;
    link.download = `paplens_${result.predicted_class}_heatmap.png`;
    link.click();
  };

  return (
    <div className="w-full bg-slate-900/70 rounded-2xl border border-slate-800 p-6 md:p-8 backdrop-blur-md shadow-2xl">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Spatial Attention Map & Interpretability
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Gated attention weights mapped back to slide coordinates ({result.display_width} × {result.display_height} px)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View mode toggle */}
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            <button
              onClick={() => setViewMode('overlay')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'overlay'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Interactive Slider
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'side-by-side'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Side-by-Side
            </button>
          </div>

          <button
            onClick={downloadOverlay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-750 border border-slate-700/80 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PNG
          </button>
        </div>
      </div>

      {/* Opacity Slider Control (in Overlay Mode) */}
      {viewMode === 'overlay' && (
        <div className="my-5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Heatmap Opacity:</span>
            <span className="text-xs font-mono font-bold text-indigo-400">
              {Math.round(heatmapOpacity * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Original Smear</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={heatmapOpacity}
              onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              aria-label="Heatmap opacity slider"
            />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Full Heatmap</span>
          </div>
        </div>
      )}

      {/* Main Image Viewports */}
      {viewMode === 'overlay' ? (
        <div className="relative w-full aspect-[4/3] max-h-[640px] rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
          {/* Base Layer: Original Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.original_display_base64}
            alt="Original Pap smear slide"
            className="absolute inset-0 w-full h-full object-contain select-none"
          />

          {/* Top Layer: Colored Attention Map with CSS opacity */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.heatmap_only_base64}
            alt="Attention heatmap layer"
            style={{ opacity: heatmapOpacity }}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none transition-opacity duration-75"
          />

          {/* Bounding Box Highlights for Top Diagnostic Patches */}
          {result.top_patches && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${result.display_width} ${result.display_height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {result.top_patches.map((patch: DiagnosticPatchInfo) => {
                const isSelected = highlightedPatch === patch.rank;
                return (
                  <g key={patch.rank}>
                    <rect
                      x={patch.box_display.x}
                      y={patch.box_display.y}
                      width={patch.box_display.width}
                      height={patch.box_display.height}
                      fill="none"
                      stroke={isSelected ? '#38bdf8' : '#f43f5e'}
                      strokeWidth={isSelected ? 4 : 2}
                      strokeDasharray={isSelected ? undefined : '6 4'}
                      opacity={isSelected ? 1.0 : 0.75}
                    />
                    <text
                      x={patch.box_display.x + 8}
                      y={patch.box_display.y + 22}
                      fill="white"
                      fontSize="14"
                      fontWeight="bold"
                      filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.8))"
                    >
                      #{patch.rank} ({(patch.attention_score * 100).toFixed(0)}%)
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      ) : (
        /* Side by Side View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300">Original Smear</span>
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-800 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.original_display_base64}
                alt="Original smear field"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300">Blended Attention Overlay</span>
            <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-800 bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.overlay_base64}
                alt="Blended attention overlay"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Colormap Legend */}
      <div className="mt-5 p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-semibold text-slate-300">Colormap (JET):</span>
          <span>Cool blue (low attention / background) to warm red (high attention / dysplastic nuclei).</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-blue-400 font-mono">0.0 (Min)</span>
          <div className="w-32 sm:w-44 h-3 rounded-md bg-gradient-to-r from-blue-600 via-emerald-400 via-yellow-400 to-red-600 border border-slate-700"></div>
          <span className="text-[10px] text-red-400 font-mono">1.0 (Max)</span>
        </div>
      </div>

      {/* Top Diagnostic Patches List */}
      {result.top_patches && result.top_patches.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Top Diagnostic Patches (Highest Attention Weights)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {result.top_patches.map((patch: DiagnosticPatchInfo) => (
              <button
                key={patch.rank}
                type="button"
                onClick={() => setHighlightedPatch(highlightedPatch === patch.rank ? null : patch.rank)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  highlightedPatch === patch.rank
                    ? 'bg-sky-950/80 border-sky-400 text-sky-200 shadow-md'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Patch #{patch.rank}</span>
                  <span className="font-mono text-indigo-400 text-[11px]">
                    {(patch.attention_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  ({patch.box.x}, {patch.box.y})
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
