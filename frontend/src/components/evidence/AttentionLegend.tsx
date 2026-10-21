export function AttentionLegend() {
  return (
    <aside className="border-t border-line bg-paper-muted p-5 sm:p-7 lg:border-l lg:border-t-0">
      <p className="quiet-label text-ink-muted">Reading the map</p>
      <div
        className="mt-5 h-2.5"
        style={{ background: 'linear-gradient(90deg, #001dff, #00c7e6 30%, #39d27d 50%, #f5e642 72%, #e32617)' }}
        aria-hidden="true"
      />
      <div className="mt-2 flex justify-between text-[11px] text-ink-muted">
        <span>Lower attention</span><span>Higher attention</span>
      </div>
      <p className="mt-5 text-xs leading-5 text-ink-secondary">
        Warmer colors indicate higher model attention. This is not a lesion boundary or a diagnosis.
      </p>
      <p className="mt-3 text-xs leading-5 text-ink-muted">
        Region previews are cropped from the display image; zooming does not add image detail.
      </p>
    </aside>
  );
}
