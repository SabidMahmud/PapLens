'use client';

import { FormEvent } from 'react';
import { ModelType } from '@/domain/analysis';
import { useImageInput } from '@/hooks/useImageInput';
import { MAX_UPLOAD_MB } from '@/lib/validation';
import { ProtocolSelector } from './image-uploader/ProtocolSelector';
import { SelectedImagePanel } from './image-uploader/SelectedImagePanel';
import { UploadDropzone } from './image-uploader/UploadDropzone';

interface ImageUploaderProps {
  onAnalyze: (file: File, modelType: ModelType) => void;
  isLoading: boolean;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
  selectedFile: File | null;
  previewUrl: string | null;
  onFileChange: (file: File) => void;
}

export function ImageUploader(props: ImageUploaderProps) {
  const {
    dragActive,
    clientError,
    fileInputRef,
    selectFile,
    handleDrag,
    handleDrop,
  } = useImageInput({
    isLoading: props.isLoading,
    onFileChange: props.onFileChange,
  });

  const submitAnalysis = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (props.selectedFile && !props.isLoading) {
      props.onAnalyze(props.selectedFile, props.selectedModel);
    }
  };

  return (
    <section
      id="upload-field"
      className="border border-line-panel bg-paper-strong"
      aria-labelledby="new-analysis-title"
      aria-busy={props.isLoading}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-brand">01</span>
          <h2 id="new-analysis-title" className="text-sm font-bold text-ink">
            New field analysis
          </h2>
        </div>
        <span className="hidden text-xs text-[#727b78] sm:block">
          JPEG or PNG · {MAX_UPLOAD_MB} MB maximum
        </span>
      </div>

      <form onSubmit={submitAnalysis} className="grid lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex flex-col p-5 sm:p-7">
          <input
            ref={fileInputRef}
            id="fov-upload-input"
            type="file"
            aria-label="Upload microscopy image"
            disabled={props.isLoading}
            tabIndex={-1}
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) selectFile(file);
              event.target.value = '';
            }}
            className="sr-only"
          />

          {props.selectedFile ? (
            <SelectedImagePanel
              file={props.selectedFile}
              previewUrl={props.previewUrl}
              selectedModel={props.selectedModel}
              isLoading={props.isLoading}
              fileInputRef={fileInputRef}
            />
          ) : (
            <UploadDropzone
              dragActive={dragActive}
              isLoading={props.isLoading}
              fileInputRef={fileInputRef}
              onDrag={handleDrag}
              onDrop={handleDrop}
            />
          )}

          {clientError && (
            <p role="alert" className="mt-3 border-l-2 border-danger bg-danger-soft px-3 py-2 text-xs leading-5 text-[#84332d]">
              {clientError}
            </p>
          )}
        </div>

        <ProtocolSelector
          selectedModel={props.selectedModel}
          isLoading={props.isLoading}
          onModelChange={props.onModelChange}
        />
      </form>
    </section>
  );
}
