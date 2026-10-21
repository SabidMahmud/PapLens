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
    <section className="mb-8 flex flex-col justify-between gap-5 border-b border-[#c7cac4] pb-7 sm:flex-row sm:items-end">
      <div>
        <p className="quiet-label text-[#0d6b62]">Completed analysis</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="font-display mt-3 text-4xl tracking-[-0.025em] text-[#17211f] sm:text-5xl"
        >
          Evidence report
        </h1>
        <p className="mt-3 break-all text-sm text-[#65706c]">
          {filename} <span aria-hidden="true">·</span> {getModelProtocol(modelType).title}
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-[#aeb2ac] bg-transparent px-4 text-xs font-bold text-[#26312e] transition-colors hover:border-[#17211f] hover:bg-[#17211f] hover:text-white"
      >
        <span aria-hidden="true">←</span> New analysis
      </button>
    </section>
  );
}
