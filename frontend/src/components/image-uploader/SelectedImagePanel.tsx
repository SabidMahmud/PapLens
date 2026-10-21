import { RefObject } from 'react';
import { getModelProtocol } from '@/config/modelProtocols';
import { ModelType } from '@/domain/analysis';

interface SelectedImagePanelProps {
  file: File;
  previewUrl: string | null;
  selectedModel: ModelType;
  isLoading: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
}

function formatFileSize(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(2)} MB`;
}

function getFileFormat(file: File): string {
  return file.type.split('/')[1] || 'image';
}

export function SelectedImagePanel({
  file,
  previewUrl,
  selectedModel,
  isLoading,
  fileInputRef,
}: SelectedImagePanelProps) {
  return (
    <div className="grid min-h-[300px] flex-1 gap-5 md:grid-cols-[minmax(220px,0.85fr)_1fr]">
      <div className="viewer-checkerboard relative min-h-[240px] overflow-hidden border border-[#29332f]">
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Selected microscopy field"
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        <span className="absolute bottom-3 left-3 bg-canvas/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white">
          Input field
        </span>
      </div>

      <div className="flex min-w-0 flex-col justify-between border-y border-line py-5">
        <div>
          <p className="quiet-label text-brand">
            {isLoading ? 'Analysis in progress' : 'Ready to analyze'}
          </p>
          <h3 title={file.name} className="mt-4 break-words text-lg font-bold text-ink">
            {file.name}
          </h3>
          <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-xs">
            <div>
              <dt className="text-ink-faint">File size</dt>
              <dd className="mt-1 font-semibold text-ink-strong">{formatFileSize(file.size)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Format</dt>
              <dd className="mt-1 font-semibold uppercase text-ink-strong">{getFileFormat(file)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-ink-faint">Protocol</dt>
              <dd className="mt-1 font-semibold text-ink-strong">
                {getModelProtocol(selectedModel).fullLabel}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-11 border border-line-control px-4 text-xs font-bold text-[#4e5855] transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
          >
            Replace image
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="min-h-11 flex-1 bg-brand px-5 text-xs font-bold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {isLoading ? 'Analyzing…' : 'Run analysis →'}
          </button>
        </div>
      </div>
    </div>
  );
}
