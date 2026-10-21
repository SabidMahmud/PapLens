import {
  DiagnosticPatchInfo,
  EvidenceViewMode,
  PredictionResponse,
} from '@/domain/analysis';
import { EvidenceField } from './EvidenceField';

interface EvidenceCanvasProps {
  result: PredictionResponse;
  viewMode: EvidenceViewMode;
  viewBox: string;
  opacity: number;
  showRegions: boolean;
  highlightedPatch: number | null;
  activePatch?: DiagnosticPatchInfo;
  onOpacityChange: (opacity: number) => void;
  onShowRegionsChange: (show: boolean) => void;
  onFitField: () => void;
}

export function EvidenceCanvas(props: EvidenceCanvasProps) {
  const panels = props.viewMode === 'compare'
    ? [{ withHeatmap: false, label: 'Original microscopy field' }, { withHeatmap: true, label: 'Field with attention overlay' }]
    : [{
        withHeatmap: props.viewMode === 'overlay',
        label: props.viewMode === 'overlay' ? 'Field with attention overlay' : 'Original microscopy field',
      }];

  return (
    <div className="bg-[#111715] text-[#edf1ef]">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-white/10 px-4 py-2 sm:px-6">
        <div className="flex min-h-11 items-center gap-3 text-xs">
          <span role="status">
            {props.activePatch ? `Region ${props.activePatch.rank} · detail view` : 'Full field'}
          </span>
          {props.activePatch && (
            <button type="button" onClick={props.onFitField} className="min-h-11 text-[#9ddbd1] underline underline-offset-4">
              Fit field
            </button>
          )}
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={props.showRegions}
            onChange={(event) => props.onShowRegionsChange(event.target.checked)}
            className="h-4 w-4 accent-[#62b6a9]"
          />
          Region outlines
        </label>
        <div className={`grid w-full min-w-0 basis-full grid-cols-[auto_minmax(0,1fr)_2rem] items-center gap-3 text-xs sm:ml-auto sm:w-auto sm:max-w-xs sm:basis-auto sm:flex-1 ${props.viewMode === 'original' ? 'opacity-40' : ''}`}>
          <label htmlFor="heatmap-opacity" className="shrink-0">Blend</label>
          <input
            id="heatmap-opacity"
            aria-label="Heatmap opacity"
            aria-valuetext={`${Math.round(props.opacity * 100)} percent`}
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={props.opacity}
            disabled={props.viewMode === 'original'}
            onChange={(event) => props.onOpacityChange(Number(event.target.value))}
            className="w-full min-w-0 max-w-full accent-[#62b6a9]"
          />
          <output htmlFor="heatmap-opacity" className="w-8 shrink-0 font-mono">
            {Math.round(props.opacity * 100)}%
          </output>
        </div>
      </div>

      <div className={props.viewMode === 'compare' ? 'grid gap-px bg-white/10 md:grid-cols-2' : ''}>
        {panels.map((panel) => (
          <figure key={String(panel.withHeatmap)} className="min-w-0 bg-[#111715]">
            {props.viewMode === 'compare' && (
              <figcaption className="border-b border-white/10 px-5 py-3 text-xs text-white/70">
                {panel.withHeatmap ? 'Attention overlay' : 'Original field'}
              </figcaption>
            )}
            <div className="viewer-checkerboard mx-auto h-[clamp(260px,55vw,580px)] w-full p-3 sm:p-5">
              <EvidenceField
                result={props.result}
                withHeatmap={panel.withHeatmap}
                label={panel.label}
                viewBox={props.viewBox}
                opacity={props.opacity}
                showRegions={props.showRegions}
                highlightedPatch={props.highlightedPatch}
              />
            </div>
          </figure>
        ))}
      </div>

      <div className="flex flex-wrap justify-between gap-2 border-t border-white/10 px-5 py-3 text-[11px] leading-5 text-white/60">
        <span>Display: {props.result.display_width} × {props.result.display_height} px</span>
        <span>Export includes the full displayed field at the current blend.</span>
      </div>
    </div>
  );
}
