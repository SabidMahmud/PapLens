import { getClassificationTheme } from '@/config/classification';
import { getModelProtocol } from '@/config/modelProtocols';
import { PredictionResponse } from '@/domain/analysis';
import { displayClassName, formatPercentage } from '@/lib/formatting';

interface ResultCardProps { result: PredictionResponse; }

export function ResultCard({ result }: ResultCardProps) {
  const { accent, tint } = getClassificationTheme(result.predicted_class);
  const protocol = getModelProtocol(result.model_type);
  const confidence = formatPercentage(result.confidence);

  return (
    <section className="overflow-hidden border border-line-panel bg-paper-strong" aria-labelledby="classification-heading">
      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <div className="relative p-6 sm:p-9" style={{ backgroundColor: tint }}>
          <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: accent }} aria-hidden="true" />
          <p className="quiet-label text-ink-muted">Model classification</p>
          <h2 id="classification-heading" className="font-display mt-5 text-5xl leading-none tracking-[-0.035em] text-ink sm:text-6xl">
            {displayClassName(result.predicted_class)}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-ink-body">{result.display_name}</p>
          <div className="mt-8 inline-flex items-baseline gap-2 border-t pt-4" style={{ borderColor: accent }}>
            <span className="sr-only">{confidence}% Confidence</span>
            <strong aria-hidden="true" className="font-display text-3xl text-ink">{confidence}<span>%</span></strong>
            <span aria-hidden="true" className="text-xs font-bold uppercase tracking-[0.1em] text-[#58635f]">Confidence</span>
          </div>
        </div>

        <div className="p-6 sm:p-9">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="quiet-label text-ink-muted">Class distribution</p>
              <p className="mt-2 text-xs leading-5 text-ink-faint">Relative model output; not a calibrated clinical risk score.</p>
            </div>
            <span className="border border-[#cfd0ca] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink-muted">
              {protocol.classCountLabel}
            </span>
          </div>

          <div className="mt-7 space-y-5">
            {Object.entries(result.probabilities).map(([name, probability]) => {
              const winner = name === result.predicted_class;
              const percentage = formatPercentage(probability);
              return (
                <div key={name}>
                  <div className="mb-2 flex items-baseline justify-between gap-4 text-xs">
                    <span className={winner ? 'font-bold text-ink' : 'font-medium text-ink-muted'}>{displayClassName(name)}</span>
                    <span className={`font-mono ${winner ? 'font-bold text-ink' : 'text-[#737c78]'}`}>{percentage}%</span>
                  </div>
                  <div className="h-2 bg-[#e5e4de]" aria-hidden="true">
                    <div className="h-full transition-[width] duration-500" style={{ width: `${percentage}%`, backgroundColor: winner ? accent : '#aeb4b0' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <dl className="grid border-t border-line bg-paper-muted sm:grid-cols-3">
        <div className="border-b border-line px-5 py-4 sm:border-b-0 sm:border-r">
          <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Inference time</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-ink-strong">{result.inference_time_ms} ms</dd>
        </div>
        <div className="border-b border-line px-5 py-4 sm:border-b-0 sm:border-r">
          <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Analyzed regions</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-ink-strong">{result.num_patches} foreground</dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink-faint">Analysis protocol</dt>
          <dd className="mt-1 text-sm font-semibold text-ink-strong">{protocol.resultLabel}</dd>
        </div>
      </dl>
    </section>
  );
}
