'use client';

import { useElapsedSeconds } from '@/hooks/useElapsedSeconds';

export function ProcessingPanel() {
  const elapsed = useElapsedSeconds();
  const message = elapsed < 20
    ? 'Your image is being processed. Keep this tab open.'
    : 'Still working. Server startup and larger fields can take longer.';

  return (
    <section className="overflow-hidden border border-[#bdd4cd] bg-brand-soft">
      <div className="flex items-start justify-between gap-5 px-5 py-4">
        <div role="status">
          <p className="text-sm font-semibold text-brand-dark">Analyzing your field</p>
          <p className="mt-1 text-xs leading-5 text-ink-body">{message}</p>
        </div>
        <span
          className="shrink-0 font-mono text-xs text-brand"
          aria-label={`${elapsed} seconds elapsed`}
        >
          {elapsed}s
        </span>
      </div>
      <div className="h-0.5 overflow-hidden bg-[#c9ddd6]" aria-hidden="true">
        <div className="scan-line h-full w-1/4 bg-brand" />
      </div>
    </section>
  );
}
