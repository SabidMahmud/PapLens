import { MODEL_PROTOCOL_LIST } from '@/config/modelProtocols';
import { ModelType } from '@/domain/analysis';

interface ProtocolSelectorProps {
  selectedModel: ModelType;
  isLoading: boolean;
  onModelChange: (model: ModelType) => void;
}

export function ProtocolSelector({
  selectedModel,
  isLoading,
  onModelChange,
}: ProtocolSelectorProps) {
  return (
    <aside className="border-t border-line bg-paper-muted p-5 sm:p-7 lg:border-l lg:border-t-0">
      <fieldset disabled={isLoading} className="disabled:opacity-60">
        <legend className="quiet-label text-ink-muted">02 · Select protocol</legend>
        <div className="mt-5 space-y-3">
          {MODEL_PROTOCOL_LIST.map((protocol) => {
            const selected = selectedModel === protocol.value;
            return (
              <button
                key={protocol.value}
                type="button"
                aria-pressed={selected}
                onClick={() => onModelChange(protocol.value)}
                className={`w-full border p-4 text-left transition-colors ${selected ? 'border-brand bg-paper-strong' : 'border-[#d0d1cb] bg-transparent hover:border-[#8b918e]'}`}
              >
                <span className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-bold text-ink">{protocol.title}</span>
                    <span className="mt-1 block text-xs text-ink-secondary">{protocol.summary}</span>
                  </span>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${selected ? 'border-brand bg-brand text-white' : 'border-line-control text-ink-muted'}`}>
                    {protocol.index}
                  </span>
                </span>
                <span className="mt-4 block border-t border-line pt-3 text-[11px] leading-4 text-ink-faint">
                  {protocol.output}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <details className="group mt-5 border-t border-[#cfd0ca]">
        <summary className="flex min-h-11 list-none items-center justify-between gap-2 pt-3 text-xs font-semibold text-ink-muted">
          Recommended input
          <span aria-hidden="true" className="text-base group-open:rotate-45">+</span>
        </summary>
        <ul className="mt-2 space-y-2 text-xs leading-5 text-ink-secondary">
          <li>High-power conventional Pap smear FOV</li>
          <li>Approximately 4000 × 3000 pixels</li>
          <li>In-focus JPEG or PNG</li>
        </ul>
      </details>
    </aside>
  );
}
