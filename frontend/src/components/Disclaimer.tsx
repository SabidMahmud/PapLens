import { RESEARCH_DEMO_LABEL, RESEARCH_DEMO_NOTICE } from '@/config/disclaimer';

export function Disclaimer() {
  return (
    <footer className="mt-auto bg-ink text-white">
      <div className="workspace-shell flex flex-col justify-between gap-5 py-7 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 shrink-0 bg-[#e1a94f]" aria-hidden="true" />
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.12em]">{RESEARCH_DEMO_LABEL}</p>
            <p className="mt-1 text-xs leading-5 text-white/60">{RESEARCH_DEMO_NOTICE}</p>
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-[0.13em] text-white/45">PapLens · Interpretable cytology research</p>
      </div>
    </footer>
  );
}
