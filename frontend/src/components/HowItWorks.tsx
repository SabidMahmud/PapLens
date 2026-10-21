const METHOD_STAGES = [
  { number: '01', title: 'Tile', detail: 'The field is divided into overlapping 1280 px regions.' },
  { number: '02', title: 'Filter', detail: 'Low-information background glass is excluded.' },
  { number: '03', title: 'Encode', detail: 'ResNet-50 converts each retained region into features.' },
  { number: '04', title: 'Attend', detail: 'Gated MIL weighs regions and produces one field-level result.' },
] as const;

export function HowItWorks() {

  return (
    <section className="border-y border-line-panel py-8" aria-labelledby="method-title">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="quiet-label text-brand">Method note</p>
          <h2 id="method-title" className="font-display mt-2 text-2xl text-ink">From field image to evidence map</h2>
        </div>
        <p className="max-w-md text-xs leading-5 text-[#727b78]">The model learns from image-level labels while exposing the relative contribution of individual regions.</p>
      </div>

      <ol className="mt-6 grid gap-px border border-line-panel bg-line-panel sm:grid-cols-2 lg:grid-cols-4">
        {METHOD_STAGES.map((stage) => (
          <li key={stage.number} className="bg-paper-strong p-5">
            <span className="font-mono text-xs text-brand">{stage.number}</span>
            <h3 className="mt-5 text-sm font-bold text-ink">{stage.title}</h3>
            <p className="mt-2 text-xs leading-5 text-ink-muted">{stage.detail}</p>
          </li>
        ))}
      </ol>

      <details className="group mt-5 border border-[#d0d1cb] bg-paper-muted">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-xs font-bold uppercase tracking-[0.1em] text-[#38433f] marker:hidden">
          Research context and limitations
          <span className="text-lg font-normal text-brand transition-transform group-open:rotate-45" aria-hidden="true">+</span>
        </summary>
        <div className="grid gap-6 border-t border-[#d0d1cb] px-5 py-6 text-xs leading-5 text-ink-secondary md:grid-cols-3">
          <div>
            <h3 className="font-bold text-ink">Dataset</h3>
            <p className="mt-2">Trained on 2,253 conventional Pap-smear field-of-view images from PapSmear-BD. The application does not distribute the dataset.</p>
          </div>
          <div>
            <h3 className="font-bold text-ink">Intended input</h3>
            <p className="mt-2">High-power conventional Pap smear fields. Whole-slide images, liquid-based preparations, and phone photographs are outside the validated input domain.</p>
          </div>
          <div>
            <h3 className="font-bold text-ink">Interpretation</h3>
            <p className="mt-2">Attention reflects model focus and should not be interpreted as a segmentation mask, a calibrated risk estimate, or a clinical diagnosis.</p>
          </div>
        </div>
      </details>
    </section>
  );
}
