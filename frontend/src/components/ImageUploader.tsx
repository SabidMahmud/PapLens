'use client';

import { useCallback, useRef, useState } from 'react';
import { ModelType } from '@/lib/types';
import { MAX_UPLOAD_MB, validateImageFile } from '@/lib/validation';

interface ImageUploaderProps {
  onAnalyze: (file: File, modelType: ModelType) => void;
  isLoading: boolean;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  selectedFile: File | null;
  previewUrl: string | null;
  onFileChange: (file: File) => void;
}

const TASKS: Array<{
  value: ModelType;
  index: string;
  title: string;
  summary: string;
  output: string;
}> = [
  {
    value: 'triage',
    index: 'A',
    title: 'Triage',
    summary: 'Normal vs abnormal',
    output: 'Two-class screening model',
  },
  {
    value: 'severity',
    index: 'B',
    title: 'Severity grading',
    summary: 'Normal vs low vs high grade',
    output: 'Three-level lesion stratification',
  },
];

export function ImageUploader({
  onAnalyze,
  isLoading,
  selectedModel,
  onModelChange,
  selectedFile,
  previewUrl,
  onFileChange,
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (isLoading) return;
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setClientError(validation.error || 'The selected file cannot be used.');
      return;
    }
    setClientError(null);
    onFileChange(file);
  }, [isLoading, onFileChange]);

  const handleDrag = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;
    if (event.type === 'dragleave' && event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDragActive(event.type === 'dragenter' || event.type === 'dragover');
  }, [isLoading]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <section id="upload-field" className="border border-[#c7cac4] bg-[#fbfaf7]" aria-labelledby="new-analysis-title" aria-busy={isLoading}>
      <div className="flex items-center justify-between border-b border-[#d9d8d1] px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#0d6b62]">01</span>
          <h2 id="new-analysis-title" className="text-sm font-bold text-[#17211f]">New field analysis</h2>
        </div>
        <span className="hidden text-xs text-[#727b78] sm:block">JPEG or PNG · {MAX_UPLOAD_MB} MB maximum</span>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (selectedFile && !isLoading) onAnalyze(selectedFile, selectedModel);
        }}
        className="grid lg:grid-cols-[minmax(0,1fr)_330px]"
      >
        <div className="flex flex-col p-5 sm:p-7">
          <input
            ref={fileInputRef}
            id="fov-upload-input"
            type="file"
            aria-label="Upload microscopy image"
            disabled={isLoading}
            tabIndex={-1}
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFile(file);
              event.target.value = '';
            }}
            className="sr-only"
          />

          {!selectedFile ? (
            <button
              type="button"
              disabled={isLoading}
              aria-label="Choose a microscopy field image"
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group grid min-h-[300px] w-full flex-1 place-items-center border border-dashed px-6 py-7 text-center transition-colors ${
                dragActive
                  ? 'border-[#0d6b62] bg-[#e4f0ed]'
                  : 'border-[#aeb2ac] bg-[#f6f5f0] hover:border-[#0d6b62] hover:bg-[#eef3f0]'
              }`}
            >
              <span className="block max-w-md">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[#b9c5c1] bg-[#fbfaf7] text-[#0d6b62] transition-transform group-hover:-translate-y-1" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6" strokeWidth="1.6">
                    <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
                  </svg>
                </span>
                <span className="font-display mt-5 block text-2xl text-[#17211f]">Add a microscopy field</span>
                <span className="mt-2 block text-sm leading-6 text-[#65706c]">Drag an image here, or browse your device.</span>
                <span className="mt-5 inline-block bg-[#0d6b62] px-5 py-3 text-xs font-bold text-white group-hover:bg-[#084f49]">Choose image <span aria-hidden="true">↗</span></span>
                <span className="mt-3 block text-xs text-[#65706c]">JPEG or PNG · up to {MAX_UPLOAD_MB} MB</span>
              </span>
            </button>
          ) : (
            <div className="grid min-h-[300px] flex-1 gap-5 md:grid-cols-[minmax(220px,0.85fr)_1fr]">
              <div className="viewer-checkerboard relative min-h-[240px] overflow-hidden border border-[#29332f]">
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Selected microscopy field" className="absolute inset-0 h-full w-full object-contain" />
                )}
                <span className="absolute bottom-3 left-3 bg-[#111715]/85 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white">Input field</span>
              </div>
              <div className="flex min-w-0 flex-col justify-between border-y border-[#d9d8d1] py-5">
                <div>
                  <p className="quiet-label text-[#0d6b62]">{isLoading ? 'Analysis in progress' : 'Ready to analyze'}</p>
                  <h3 title={selectedFile.name} className="mt-4 break-words text-lg font-bold text-[#17211f]">{selectedFile.name}</h3>
                  <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 text-xs">
                    <div><dt className="text-[#7a827f]">File size</dt><dd className="mt-1 font-semibold text-[#26312e]">{(selectedFile.size / 1048576).toFixed(2)} MB</dd></div>
                    <div><dt className="text-[#7a827f]">Format</dt><dd className="mt-1 font-semibold uppercase text-[#26312e]">{selectedFile.type.split('/')[1] || 'image'}</dd></div>
                    <div className="col-span-2"><dt className="text-[#7a827f]">Protocol</dt><dd className="mt-1 font-semibold text-[#26312e]">{selectedModel === 'triage' ? '2-class clinical triage' : '3-class severity grading'}</dd></div>
                  </dl>
                </div>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <button type="button" disabled={isLoading} onClick={() => fileInputRef.current?.click()} className="min-h-11 border border-[#aeb2ac] px-4 text-xs font-bold text-[#4e5855] transition-colors hover:border-[#17211f] hover:text-[#17211f] disabled:opacity-50">Replace image</button>
                  <button type="submit" disabled={isLoading} className="min-h-11 flex-1 bg-[#0d6b62] px-5 text-xs font-bold text-white transition-colors hover:bg-[#084f49] disabled:opacity-60">{isLoading ? 'Analyzing…' : 'Run analysis →'}</button>
                </div>
              </div>
            </div>
          )}

          {clientError && <p role="alert" className="mt-3 border-l-2 border-[#a33d35] bg-[#f8e9e6] px-3 py-2 text-xs leading-5 text-[#84332d]">{clientError}</p>}
        </div>

        <aside className="border-t border-[#d9d8d1] bg-[#efeee8] p-5 sm:p-7 lg:border-l lg:border-t-0">
          <fieldset disabled={isLoading} className="disabled:opacity-60">
            <legend className="quiet-label text-[#65706c]">02 · Select protocol</legend>
            <div className="mt-5 space-y-3">
              {TASKS.map((task) => {
                const selected = selectedModel === task.value;
                return (
                  <button
                    key={task.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onModelChange(task.value)}
                    className={`w-full border p-4 text-left transition-colors ${selected ? 'border-[#0d6b62] bg-[#fbfaf7]' : 'border-[#d0d1cb] bg-transparent hover:border-[#8b918e]'}`}
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-bold text-[#17211f]">{task.title}</span>
                        <span className="mt-1 block text-xs text-[#5f6965]">{task.summary}</span>
                      </span>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-bold ${selected ? 'border-[#0d6b62] bg-[#0d6b62] text-white' : 'border-[#aeb2ac] text-[#65706c]'}`}>{task.index}</span>
                    </span>
                    <span className="mt-4 block border-t border-[#d9d8d1] pt-3 text-[11px] leading-4 text-[#7a827f]">{task.output}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <details className="group mt-5 border-t border-[#cfd0ca]">
            <summary className="flex min-h-11 list-none items-center justify-between gap-2 pt-3 text-xs font-semibold text-[#65706c]">Recommended input <span aria-hidden="true" className="text-base group-open:rotate-45">+</span></summary>
            <ul className="mt-2 space-y-2 text-xs leading-5 text-[#5f6965]">
              <li>High-power conventional Pap smear FOV</li>
              <li>Approximately 4000 × 3000 pixels</li>
              <li>In-focus JPEG or PNG</li>
            </ul>
          </details>
        </aside>
      </form>
    </section>
  );
}
