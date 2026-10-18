'use client';

import React, { useCallback, useRef, useState } from 'react';
import { ModelType } from '@/lib/types';
import { MAX_UPLOAD_MB, validateImageFile } from '@/lib/validation';

interface ImageUploaderProps {
  onAnalyze: (file: File, modelType: ModelType) => void;
  isLoading: boolean;
  selectedModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onAnalyze,
  isLoading,
  selectedModel,
  onModelChange,
}) => {
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setClientError(null);
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setClientError(validation.error || 'Invalid file.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFile(e.target.files[0]);
      }
    },
    [handleFile]
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setClientError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isLoading) return;
    onAnalyze(selectedFile, selectedModel);
  };

  return (
    <div className="w-full bg-slate-900/60 rounded-2xl border border-slate-800 p-6 md:p-8 backdrop-blur-md shadow-xl">
      {/* Model Selector Header */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
          Select Diagnostic Classification Framing
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onModelChange('triage')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedModel === 'triage'
                ? 'bg-indigo-950/70 border-indigo-500/80 shadow-md shadow-indigo-950/50 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">2-Class Clinical Triage</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Flagship
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Normal (NILM) vs. Abnormal (ASC-US / LSIL / HSIL / SCC) • 95% Acc, 97% Sens
            </p>
          </button>

          <button
            type="button"
            onClick={() => onModelChange('severity')}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              selectedModel === 'severity'
                ? 'bg-indigo-950/70 border-indigo-500/80 shadow-md shadow-indigo-950/50 text-white'
                : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">3-Class Severity Grading</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Grading
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Normal vs. Low-Grade vs. High-Grade • Matches colposcopy protocol
            </p>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <form onSubmit={handleSubmit}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={handleChange}
          className="hidden"
          id="fov-upload-input"
        />

        {!selectedFile ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-8 md:p-12 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              dragActive
                ? 'border-indigo-400 bg-indigo-950/30'
                : 'border-slate-750 bg-slate-950/30 hover:border-slate-600 hover:bg-slate-950/60'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-base font-semibold text-slate-200 text-center">
              Click to upload or drag & drop a Pap smear slide image
            </p>
            <p className="text-xs text-slate-400 mt-1.5 text-center">
              Microscopy FOV (approx. 4000×3000 px) • JPEG or PNG up to {MAX_UPLOAD_MB} MB
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
            {previewUrl && (
              <div className="relative w-28 h-24 sm:w-32 sm:h-24 rounded-lg overflow-hidden border border-slate-750 flex-shrink-0 bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Selected slide preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 text-center sm:text-left">
              <p className="text-sm font-semibold text-slate-200 truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'image/jpeg'}
              </p>
              <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">
                  Ready for AB-MIL analysis
                </span>
              </div>
            </div>
            <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={clearSelection}
                disabled={isLoading}
                className="flex-1 sm:flex-none px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-750 transition-colors disabled:opacity-50"
              >
                Change Image
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span>Extracting Patches...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Run Inference</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {clientError && (
          <p className="mt-3 text-xs text-rose-400 flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {clientError}
          </p>
        )}
      </form>
    </div>
  );
};
