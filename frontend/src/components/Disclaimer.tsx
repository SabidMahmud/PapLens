export function Disclaimer() {
  return (
    <footer className="mt-auto bg-[#17211f] text-white">
      <div className="workspace-shell flex flex-col justify-between gap-5 py-7 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-2 w-2 shrink-0 bg-[#e1a94f]" aria-hidden="true" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em]">Research prototype</p>
            <p className="mt-1 text-xs leading-5 text-white/60">Not evaluated, cleared, or approved for clinical diagnosis, screening, triage, or patient management.</p>
          </div>
        </div>
        <p className="text-[10px] uppercase tracking-[0.13em] text-white/45">PapLens · Interpretable cytology research</p>
      </div>
    </footer>
  );
}
