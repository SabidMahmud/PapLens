'use client';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div role="alert" className="flex items-start justify-between gap-4 border border-[#d9a39e] border-l-4 border-l-[#a33d35] bg-[#f8e9e6] p-4 text-[#6f2d28]">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em]">Analysis could not be completed</p>
        <p className="mt-1 text-xs leading-5">{message}</p>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="grid h-11 w-11 shrink-0 place-items-center border border-[#d9a39e] text-lg leading-none transition-colors hover:bg-[#a33d35] hover:text-white">×</button>
    </div>
  );
}
