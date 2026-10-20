'use client';

import { useEffect, useRef, useState } from 'react';
import { ErrorBanner } from '@/components/ErrorBanner';
import { HeatmapViewer } from '@/components/HeatmapViewer';
import { HowItWorks } from '@/components/HowItWorks';
import { ImageUploader } from '@/components/ImageUploader';
import { ResultCard } from '@/components/ResultCard';
import { SampleImages } from '@/components/SampleImages';
import { ServerStatus } from '@/components/ServerStatus';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { predictImage } from '@/lib/api';
import { ModelType, PredictionResponse } from '@/lib/types';

function ProcessingPanel() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="overflow-hidden border border-[#bdd4cd] bg-[#e4f0ed]">
      <div className="flex items-start justify-between gap-5 px-5 py-4">
        <div role="status">
          <p className="text-sm font-semibold text-[#084f49]">Analyzing your field</p>
          <p className="mt-1 text-xs leading-5 text-[#4f5a56]">{elapsed < 20 ? 'Your image is being processed. Keep this tab open.' : 'Still working. Server startup and larger fields can take longer.'}</p>
        </div>
        <span className="shrink-0 font-mono text-xs text-[#0d6b62]" aria-label={`${elapsed} seconds elapsed`}>{elapsed}s</span>
      </div>
      <div className="h-0.5 overflow-hidden bg-[#c9ddd6]" aria-hidden="true">
        <div className="scan-line h-full w-1/4 bg-[#0d6b62]" />
      </div>
    </section>
  );
}

export default function Home() {
  const { status, retryCount, target: statusTarget, checkServer } = useBackendStatus();
  const [selectedModel, setSelectedModel] = useState<ModelType>('triage');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ file: File; url: string } | null>(null);
  const requestInFlight = useRef(false);
  const reportHeading = useRef<HTMLHeadingElement>(null);
  const activeTarget = result?.served_by || statusTarget;

  useEffect(() => () => {
    if (selection) URL.revokeObjectURL(selection.url);
  }, [selection]);

  useEffect(() => {
    if (result) reportHeading.current?.focus();
  }, [result]);

  const handleFileChange = (file: File) => {
    if (requestInFlight.current) return;
    setSelection({ file, url: URL.createObjectURL(file) });
    setError(null);
  };

  const handleAnalyze = async (file: File, modelType: ModelType) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setIsLoading(true);
    setError(null);
    try {
      setResult(await predictImage(file, modelType));
    } catch (err: unknown) {
      const apiError = err as { detail?: string; message?: string };
      setError(apiError?.detail || apiError?.message || 'Inference failed. Please try again.');
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSelection(null);
    document.getElementById('main-content')?.focus();
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="flex-1">
      <header className="sticky top-0 z-50 border-b border-[#d9d8d1] bg-[#f8f7f2]/95 backdrop-blur-sm">
        <div className="workspace-shell flex h-[68px] items-center justify-between gap-5">
          <a href="#main-content" className="group flex items-center gap-3" aria-label="PapLens home">
            <span className="grid h-9 w-9 place-items-center border border-[#17211f] bg-[#17211f] text-sm font-bold tracking-tight text-white transition-colors group-hover:bg-[#0d6b62]">
              <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.3"><circle cx="16" cy="16" r="10" /><ellipse cx="16" cy="16" rx="5" ry="7" transform="rotate(35 16 16)" /><circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" /></svg>
            </span>
            <span>
              <span className="font-display block text-lg leading-none text-[#17211f]">PapLens</span>
              <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.16em] text-[#707a76] sm:block">Cytology evidence workspace</span>
            </span>
          </a>

          <div className="flex items-center gap-5">
            <span className="hidden border-r border-[#d9d8d1] pr-5 text-xs text-[#65706c] lg:block">PapSmear-BD research prototype</span>
            <ServerStatus status={status} retryCount={retryCount} target={activeTarget} onRefresh={checkServer} />
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="workspace-shell py-8 sm:py-10">
        {!result && (
          <section className="grid gap-6 border-b border-[#c7cac4] pb-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
            <div>
              <p className="quiet-label text-[#0d6b62]">Cervical cytology · Research workspace</p>
              <h1 className="font-display mt-4 max-w-3xl text-[2.5rem] leading-[1.04] tracking-[-0.035em] text-[#17211f] sm:text-[3.5rem]">
                Review the field.<br />See the evidence.
              </h1>
            </div>
            <div className="border-l-2 border-[#0d6b62] pl-5">
              <p className="text-sm leading-6 text-[#4f5a56]">Upload a field, choose a model, and explore its classification alongside a spatial attention map.</p>
              <p className="mt-3 text-xs font-semibold text-[#a33d35]">Research use only · Not for diagnosis or patient care</p>
            </div>
          </section>
        )}

        {result && (
          <section className="mb-8 flex flex-col justify-between gap-5 border-b border-[#c7cac4] pb-7 sm:flex-row sm:items-end">
            <div>
              <p className="quiet-label text-[#0d6b62]">Completed analysis</p>
              <h1 ref={reportHeading} tabIndex={-1} className="font-display mt-3 text-4xl tracking-[-0.025em] text-[#17211f] sm:text-5xl">Evidence report</h1>
              <p className="mt-3 break-all text-sm text-[#65706c]">{selection?.file.name} <span aria-hidden="true">·</span> {result.model_type === 'triage' ? 'Triage' : 'Severity grading'}</p>
            </div>
            <button type="button" onClick={handleReset} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-[#aeb2ac] bg-transparent px-4 text-xs font-bold text-[#26312e] transition-colors hover:border-[#17211f] hover:bg-[#17211f] hover:text-white">
              <span aria-hidden="true">←</span> New analysis
            </button>
          </section>
        )}

        {error && <div className="mt-7"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

        <div className={result ? '' : 'mt-8'}>
          {!result ? (
            <div className="space-y-7">
              {isLoading && <ProcessingPanel />}
              <ImageUploader onAnalyze={handleAnalyze} isLoading={isLoading} selectedModel={selectedModel} onModelChange={setSelectedModel} selectedFile={selection?.file ?? null} previewUrl={selection?.url ?? null} onFileChange={handleFileChange} />
              <SampleImages onSelectSample={handleFileChange} isLoading={isLoading} selectedFilename={selection?.file.name} />
              <HowItWorks />
            </div>
          ) : (
            <div className="space-y-8">
              <ResultCard result={result} />
              <HeatmapViewer result={result} />
              <HowItWorks />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
