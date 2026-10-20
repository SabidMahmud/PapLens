'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';

interface SampleImagesProps {
  onSelectSample: (file: File) => void;
  isLoading: boolean;
  selectedFilename?: string;
}

const SAMPLES = [
  { filename: 'sample_nilm.jpg', label: 'NILM', family: 'Normal' },
  { filename: 'sample_ascus.jpg', label: 'ASC-US', family: 'Atypical' },
  { filename: 'sample_lsil.jpg', label: 'LSIL', family: 'Low grade' },
  { filename: 'sample_hsil.jpg', label: 'HSIL', family: 'High grade' },
  { filename: 'sample_scc.jpg', label: 'SCC', family: 'Malignant' },
];

export function SampleImages({ onSelectSample, isLoading, selectedFilename }: SampleImagesProps) {
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  const loadSample = async (filename: string) => {
    if (isLoading || pending.current) return;
    pending.current = true;
    setError(null);
    setLoadingSample(filename);
    try {
      const response = await fetch(`/samples/${filename}`);
      if (!response.ok) throw new Error('Sample could not be loaded.');
      const blob = await response.blob();
      onSelectSample(new File([blob], filename, { type: blob.type || 'image/jpeg' }));
    } catch {
      setError('This sample could not be loaded. Try again or upload your own image.');
    } finally {
      pending.current = false;
      setLoadingSample(null);
    }
  };

  return (
    <section aria-labelledby="sample-fields-title">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="quiet-label text-[#0d6b62]">Reference fields</p>
          <h2 id="sample-fields-title" className="font-display mt-2 text-2xl text-[#17211f]">Start with a sample</h2>
        </div>
        <p className="max-w-48 text-right text-xs leading-5 text-[#65706c]">Select a field, then run your chosen analysis.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {SAMPLES.map((sample) => {
          const loading = loadingSample === sample.filename;
          return (
            <button
              key={sample.filename}
              type="button"
              onClick={() => loadSample(sample.filename)}
              disabled={isLoading || loadingSample !== null}
              className={`group min-w-0 overflow-hidden border bg-[#fbfaf7] text-left transition-colors hover:border-[#0d6b62] disabled:opacity-60 ${selectedFilename === sample.filename ? 'border-[#0d6b62] ring-1 ring-[#0d6b62]' : 'border-[#c7cac4]'}`}
              aria-label={`Select ${sample.label} sample`}
              aria-pressed={selectedFilename === sample.filename}
            >
              <div className="relative aspect-[2/1] overflow-hidden bg-[#1d2422]">
                <Image src={`/samples/${sample.filename}`} alt={`${sample.label} microscopy sample`} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.025]" />
                {loading && <span className="absolute inset-0 grid place-items-center bg-[#111715]/70 text-[10px] font-bold uppercase tracking-wider text-white">Loading</span>}
              </div>
              <span className="flex flex-wrap items-center justify-between gap-1 px-3 py-3">
                <span className="text-xs font-bold text-[#17211f]">{sample.label}</span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-[#737c78]">{sample.family}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p role="status" className="mt-3 text-xs text-[#65706c]">{loadingSample ? 'Loading sample…' : selectedFilename?.startsWith('sample_') ? 'Sample selected. Review the image and protocol above, then run analysis.' : 'Sample labels describe the reference fields, not a new model prediction.'}</p>
      {error && <p role="alert" className="mt-2 text-sm text-[#a33d35]">{error}</p>}
    </section>
  );
}
