'use client';

import { PredictionResponse } from '@/domain/analysis';
import { useEvidenceMap } from '@/hooks/useEvidenceMap';
import { AttentionLegend } from './evidence/AttentionLegend';
import { EvidenceCanvas } from './evidence/EvidenceCanvas';
import { EvidenceHeader } from './evidence/EvidenceHeader';
import { RegionGallery } from './evidence/RegionGallery';

interface HeatmapViewerProps {
  result: PredictionResponse;
}

export function HeatmapViewer({ result }: HeatmapViewerProps) {
  const evidence = useEvidenceMap(result);

  return (
    <section className="border border-line-panel bg-paper-strong" aria-labelledby="evidence-map-title">
      <EvidenceHeader
        viewMode={evidence.viewMode}
        exporting={evidence.exporting}
        onViewModeChange={evidence.setViewMode}
        onExport={evidence.exportField}
      />

      <EvidenceCanvas
        result={result}
        viewMode={evidence.viewMode}
        viewBox={evidence.viewBox}
        opacity={evidence.opacity}
        showRegions={evidence.showRegions}
        highlightedPatch={evidence.highlightedPatch}
        activePatch={evidence.activePatch}
        onOpacityChange={evidence.setOpacity}
        onShowRegionsChange={evidence.setShowRegions}
        onFitField={evidence.clearHighlightedPatch}
      />

      {evidence.exportError && (
        <p role="alert" className="border-b border-line bg-danger-soft px-5 py-3 text-sm text-danger">
          {evidence.exportError}
        </p>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <RegionGallery
          result={result}
          highlightedPatch={evidence.highlightedPatch}
          onTogglePatch={evidence.togglePatch}
        />
        <AttentionLegend />
      </div>
    </section>
  );
}
