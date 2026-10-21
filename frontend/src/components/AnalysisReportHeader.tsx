import { RefObject } from 'react';
import { getModelProtocol } from '@/config/modelProtocols';
import { ModelType } from '@/domain/analysis';

interface AnalysisReportHeaderProps {
  filename?: string;
  modelType: ModelType;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onReset: () => void;
}

export function AnalysisReportHeader({
  filename,
  modelType,
  headingRef,
  onReset,
}: AnalysisReportHeaderProps) {
  return (
    <section className="mb-8 flex flex-col justify-between gap-5 border-b border-line-panel pb-7 sm:flex-row sm:items-end">
      <div>
        <p className="quiet-label text-brand">Completed analysis</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display mt-3 text-4xl tracking-[-0.025em] text-ink sm:text-5xl"
        >
          Evidence report
        </h1>
        <p className="mt-3 break-all text-sm text-ink-muted">
          {filename} <span aria-hidden="true">·</span> {getModelProtocol(modelType).title}
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-line-control bg-transparent px-4 text-xs font-bold text-ink-strong transition-colors hover:border-ink hover:bg-ink hover:text-white"
      >
        <span aria-hidden="true">←</span> New analysis
      </button>
    </section>
  );
}
