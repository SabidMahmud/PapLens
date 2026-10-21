import { EvidenceViewMode } from '@/domain/analysis';

const VIEW_MODES: EvidenceViewMode[] = ['original', 'overlay', 'compare'];

interface EvidenceHeaderProps {
  viewMode: EvidenceViewMode;
  exporting: boolean;
  onViewModeChange: (mode: EvidenceViewMode) => void;
  onExport: () => void;
}

export function EvidenceHeader({
  viewMode,
  exporting,
  onViewModeChange,
  onExport,
}: EvidenceHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-5 border-b border-line p-5 sm:p-7 lg:flex-row lg:items-end">
      <div>
        <p className="quiet-label text-brand">Explore the model&apos;s attention</p>
        <h2 id="evidence-map-title" className="font-display mt-3 text-3xl tracking-[-0.02em]">Evidence map</h2>
        <p className="mt-2 text-xs leading-5 text-ink-muted">
          Compare the original field with its attention overlay, or inspect a region below.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Evidence map view" className="flex border border-[#bfc2bc] bg-paper-muted p-1">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => onViewModeChange(mode)}
              className={`min-h-10 px-3 text-xs font-semibold capitalize transition-colors ${viewMode === mode ? 'bg-ink text-white' : 'text-ink-secondary hover:bg-[#e0e1db]'}`}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          title="Download the full displayed field at the current blend, without region boxes"
          className="min-h-11 border border-line-control px-4 text-xs font-semibold text-[#38433f] hover:border-ink hover:bg-ink hover:text-white disabled:opacity-50"
        >
          {exporting ? 'Exporting…' : 'Export field ↓'}
        </button>
      </div>
    </header>
  );
}
