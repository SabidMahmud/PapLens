import { RESEARCH_DEMO_SHORT_NOTICE } from '@/config/disclaimer';

export function WorkspaceIntro() {
  return (
    <section className="grid gap-6 border-b border-[#c7cac4] pb-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
      <div>
        <p className="quiet-label text-[#0d6b62]">Cervical cytology · Research workspace</p>
        <h1 className="font-display mt-4 max-w-3xl text-[2.5rem] leading-[1.04] tracking-[-0.035em] text-[#17211f] sm:text-[3.5rem]">
          Review the field.<br />See the evidence.
        </h1>
      </div>
      <div className="border-l-2 border-[#0d6b62] pl-5">
        <p className="text-sm leading-6 text-[#4f5a56]">
          Upload a field, choose a model, and explore its classification alongside a spatial attention map.
        </p>
        <p className="mt-3 text-xs font-semibold text-[#a33d35]">
          {RESEARCH_DEMO_SHORT_NOTICE}
        </p>
      </div>
    </section>
  );
}
