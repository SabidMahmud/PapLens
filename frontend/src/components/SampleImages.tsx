'use client';

import Image from 'next/image';
import { REFERENCE_SAMPLES } from '@/config/samples';
import { useReferenceSample } from '@/hooks/useReferenceSample';

interface SampleImagesProps {
  onSelectSample: (file: File) => void;
  isLoading: boolean;
  selectedFilename?: string;
}

export function SampleImages({ onSelectSample, isLoading, selectedFilename }: SampleImagesProps) {
  const { loadingSample, error, loadSample } = useReferenceSample({
    isLoading,
    onSelectSample,
  });

  return (
    <section aria-labelledby="sample-fields-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="quiet-label text-brand">Reference fields</p>
          <h2 id="sample-fields-title" className="font-display mt-2 text-2xl text-ink">Start with a sample</h2>
        </div>
        <p className="max-w-48 text-right text-xs leading-5 text-ink-muted">Select a field, then run your chosen analysis.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {REFERENCE_SAMPLES.map((sample) => {
          const loading = loadingSample === sample.filename;
          return (
            <button
              key={sample.filename}
              type="button"
              onClick={() => loadSample(sample.filename)}
              disabled={isLoading || loadingSample !== null}
              className={`group min-w-0 overflow-hidden border bg-paper-strong text-left transition-colors hover:border-brand disabled:opacity-60 ${selectedFilename === sample.filename ? 'border-brand ring-1 ring-brand' : 'border-line-panel'}`}
              aria-label={`Select ${sample.label} sample`}
              aria-pressed={selectedFilename === sample.filename}
            >
              <div className="relative aspect-[2/1] overflow-hidden bg-[#1d2422]">
                <Image src={`/samples/${sample.filename}`} alt={`${sample.label} microscopy sample`} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.025]" />
                {loading && <span className="absolute inset-0 grid place-items-center bg-canvas/70 text-[10px] font-bold uppercase tracking-wider text-white">Loading</span>}
              </div>
              <span className="flex flex-wrap items-center justify-between gap-1 px-3 py-3">
                <span className="text-xs font-bold text-ink">{sample.label}</span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[#737c78]">{sample.family}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p role="status" className="mt-3 text-xs text-ink-muted">{loadingSample ? 'Loading sample…' : selectedFilename?.startsWith('sample_') ? 'Sample selected. Review the image and protocol above, then run analysis.' : 'Sample labels describe the reference fields, not a new model prediction.'}</p>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </section>
  );
}
