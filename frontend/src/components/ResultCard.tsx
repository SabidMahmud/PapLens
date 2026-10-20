import { PredictionResponse } from '@/lib/types';

interface ResultCardProps { result: PredictionResponse; }

function displayClass(value: string) {
  return value.replaceAll('_', ' ');
}

export function ResultCard({ result }: ResultCardProps) {
  const isNormal = result.predicted_class === 'Normal';
  const isIntermediate = result.predicted_class === 'Low_Grade';
  const accent = isNormal ? '#0d6b62' : isIntermediate ? '#a66d1d' : '#a33d35';
  const tint = isNormal ? '#e4f0ed' : isIntermediate ? '#f6edda' : '#f8e9e6';

  return (
    <section className="overflow-hidden border border-[#c7cac4] bg-[#fbfaf7]" aria-labelledby="classification-heading">
      <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <div className="relative p-6 sm:p-9" style={{ backgroundColor: tint }}>
          <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: accent }} aria-hidden="true" />
          <p className="quiet-label text-[#65706c]">Model classification</p>
          <h2 id="classification-heading" className="font-display mt-5 text-5xl leading-none tracking-[-0.035em] text-[#17211f] sm:text-6xl">
            {displayClass(result.predicted_class)}
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[#4f5a56]">{result.display_name}</p>
          <div className="mt-8 inline-flex items-baseline gap-2 border-t pt-4" style={{ borderColor: accent }}>
            <span className="sr-only">{(result.confidence * 100).toFixed(1)}% Confidence</span>
            <strong aria-hidden="true" className="font-display text-3xl text-[#17211f]">{(result.confidence * 100).toFixed(1)}<span>%</span></strong>
            <span aria-hidden="true" className="text-xs font-bold uppercase tracking-[0.1em] text-[#58635f]">Confidence</span>
          </div>
        </div>

        <div className="p-6 sm:p-9">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="quiet-label text-[#65706c]">Class distribution</p>
              <p className="mt-2 text-xs leading-5 text-[#7a827f]">Relative model output; not a calibrated clinical risk score.</p>
            </div>
            <span className="border border-[#cfd0ca] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#65706c]">
              {result.model_type === 'triage' ? '2 class' : '3 class'}
            </span>
          </div>

          <div className="mt-7 space-y-5">
            {Object.entries(result.probabilities).map(([name, probability]) => {
              const winner = name === result.predicted_class;
              const percentage = (probability * 100).toFixed(1);
              return (
                <div key={name}>
                  <div className="mb-2 flex items-baseline justify-between gap-4 text-xs">
                    <span className={winner ? 'font-bold text-[#17211f]' : 'font-medium text-[#65706c]'}>{displayClass(name)}</span>
                    <span className={`font-mono ${winner ? 'font-bold text-[#17211f]' : 'text-[#737c78]'}`}>{percentage}%</span>
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

      <dl className="grid border-t border-[#d9d8d1] bg-[#efeee8] sm:grid-cols-3">
        <div className="border-b border-[#d9d8d1] px-5 py-4 sm:border-b-0 sm:border-r">
          <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a827f]">Inference time</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-[#26312e]">{result.inference_time_ms} ms</dd>
        </div>
        <div className="border-b border-[#d9d8d1] px-5 py-4 sm:border-b-0 sm:border-r">
          <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a827f]">Analyzed regions</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-[#26312e]">{result.num_patches} foreground</dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#7a827f]">Analysis protocol</dt>
          <dd className="mt-1 text-sm font-semibold text-[#26312e]">{result.model_type === 'triage' ? '2-class triage' : '3-class severity grading'}</dd>
        </div>
      </dl>
    </section>
  );
}
