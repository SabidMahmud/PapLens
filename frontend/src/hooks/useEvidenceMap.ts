'use client';

import { useRef, useState } from 'react';
import { EvidenceViewMode, PredictionResponse } from '@/domain/analysis';
import { getEvidenceViewBox } from '@/lib/evidenceViewport';
import { exportEvidenceField } from '@/lib/imageExport';

export function useEvidenceMap(result: PredictionResponse) {
  const [opacity, setOpacity] = useState(0.42);
  const [viewMode, setViewMode] = useState<EvidenceViewMode>('overlay');
  const [highlightedPatch, setHighlightedPatch] = useState<number | null>(null);
  const [showRegions, setShowRegions] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportingRef = useRef(false);

  const activePatch = result.top_patches.find(({ rank }) => rank === highlightedPatch);
  const viewBox = getEvidenceViewBox(result, highlightedPatch);

  const togglePatch = (rank: number) => {
    setHighlightedPatch((current) => current === rank ? null : rank);
  };

  const exportField = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    setExportError(null);
    try {
      await exportEvidenceField(result, viewMode, opacity);
    } catch {
      setExportError('The image could not be exported. Please try again.');
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  return {
    opacity,
    setOpacity,
    viewMode,
    setViewMode,
    highlightedPatch,
    clearHighlightedPatch: () => setHighlightedPatch(null),
    togglePatch,
    showRegions,
    setShowRegions,
    exporting,
    exportError,
    exportField,
    activePatch,
    viewBox,
  };
}
