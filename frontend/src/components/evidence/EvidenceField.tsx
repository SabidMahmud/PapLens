import { PredictionResponse } from '@/domain/analysis';

interface EvidenceFieldProps {
  result: PredictionResponse;
  withHeatmap: boolean;
  label: string;
  viewBox: string;
  opacity: number;
  showRegions: boolean;
  highlightedPatch: number | null;
}

export function EvidenceField({
  result,
  withHeatmap,
  label,
  viewBox,
  opacity,
  showRegions,
  highlightedPatch,
}: EvidenceFieldProps) {
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={viewBox}
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <image href={result.original_display_base64} width={result.display_width} height={result.display_height} />
      {withHeatmap && (
        <image
          href={result.heatmap_only_base64}
          width={result.display_width}
          height={result.display_height}
          opacity={opacity}
        />
      )}
      {showRegions && result.top_patches.map((patch) => {
        const active = patch.rank === highlightedPatch;
        return (
          <g key={patch.rank} opacity={highlightedPatch !== null && !active ? 0.25 : 1}>
            <rect
              {...patch.box_display}
              fill="none"
              stroke={active ? '#ffffff' : '#f4cf81'}
              strokeWidth={active ? 3 : 1.5}
              vectorEffect="non-scaling-stroke"
            />
            <rect
              x={patch.box_display.x}
              y={patch.box_display.y}
              width="24"
              height="22"
              fill={active ? '#ffffff' : '#f4cf81'}
            />
            <text
              x={patch.box_display.x + 7}
              y={patch.box_display.y + 15}
              fill="#17211f"
              fontSize="12"
              fontWeight="700"
            >
              {patch.rank}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
