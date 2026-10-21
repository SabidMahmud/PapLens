import { DragEvent, RefObject } from 'react';
import { MAX_UPLOAD_MB } from '@/lib/validation';

interface UploadDropzoneProps {
  dragActive: boolean;
  isLoading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onDrag: (event: DragEvent<HTMLButtonElement>) => void;
  onDrop: (event: DragEvent<HTMLButtonElement>) => void;
}

export function UploadDropzone({
  dragActive,
  isLoading,
  fileInputRef,
  onDrag,
  onDrop,
}: UploadDropzoneProps) {
  const stateClasses = dragActive
    ? 'border-[#0d6b62] bg-[#e4f0ed]'
    : 'border-[#aeb2ac] bg-[#f6f5f0] hover:border-[#0d6b62] hover:bg-[#eef3f0]';

  return (
    <button
      type="button"
      disabled={isLoading}
      aria-label="Choose a microscopy field image"
      onDragEnter={onDrag}
      onDragLeave={onDrag}
      onDragOver={onDrag}
      onDrop={onDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`group grid min-h-[300px] w-full flex-1 place-items-center border border-dashed px-6 py-7 text-center transition-colors ${stateClasses}`}
    >
      <span className="block max-w-md">
        <span
          className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#b9c5c1] bg-[#fbfaf7] text-[#0d6b62] transition-transform group-hover:-translate-y-1"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6" strokeWidth="1.6">
            <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </span>
        <span className="font-display mt-5 block text-2xl text-[#17211f]">Add a microscopy field</span>
        <span className="mt-2 block text-sm leading-6 text-[#65706c]">Drag an image here, or browse your device.</span>
        <span className="mt-5 inline-block bg-[#0d6b62] px-5 py-3 text-xs font-bold text-white group-hover:bg-[#084f49]">
          Choose image <span aria-hidden="true">↗</span>
        </span>
        <span className="mt-3 block text-xs text-[#65706c]">JPEG or PNG · up to {MAX_UPLOAD_MB} MB</span>
      </span>
    </button>
  );
}
