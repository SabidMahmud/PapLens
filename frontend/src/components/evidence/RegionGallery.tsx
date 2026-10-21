import { PredictionResponse } from '@/domain/analysis';

interface RegionGalleryProps {
  result: PredictionResponse;
  highlightedPatch: number | null;
  onTogglePatch: (rank: number) => void;
}

export function RegionGallery({ result, highlightedPatch, onTogglePatch }: RegionGalleryProps) {
  return (
    <div className="min-w-0 p-5 sm:p-7">
      <p className="quiet-label text-[#65706c]">Highest attention regions</p>
      <p className="mt-2 text-xs leading-5 text-[#65706c]">
        Select a preview to inspect it. Scores show relative attention, not clinical probability.
      </p>
      {result.top_patches.length ? (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {result.top_patches.map((patch) => {
            const selected = highlightedPatch === patch.rank;
            return (
              <button
                key={patch.rank}
                type="button"
                aria-label={`Inspect region ${patch.rank}`}
                aria-pressed={selected}
                onClick={() => onTogglePatch(patch.rank)}
                className={`min-w-0 overflow-hidden border text-left transition-colors ${selected ? 'border-[#0d6b62] bg-[#e4f0ed] ring-1 ring-[#0d6b62]' : 'border-[#d5d6d0] hover:border-[#0d6b62]'}`}
              >
                <svg
                  aria-hidden="true"
                  viewBox={`${patch.box_display.x} ${patch.box_display.y} ${patch.box_display.width} ${patch.box_display.height}`}
                  className="aspect-square w-full bg-[#111715]"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <image href={result.original_display_base64} width={result.display_width} height={result.display_height} />
                </svg>
                <span className="flex flex-wrap justify-between gap-1 p-2 font-mono text-xs">
                  <span>#{patch.rank}</span>
                  <span className="text-[#0d6b62]">{patch.attention_score.toFixed(2)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 border border-dashed border-[#c7cac4] p-5 text-sm text-[#65706c]">
          No region previews were returned for this field.
        </p>
      )}
    </div>
  );
}
