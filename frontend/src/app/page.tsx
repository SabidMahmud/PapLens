'use client';

import React, { useState } from 'react';
import { ErrorBanner } from '@/components/ErrorBanner';
import { HeatmapViewer } from '@/components/HeatmapViewer';
import { HowItWorks } from '@/components/HowItWorks';
import { ImageUploader } from '@/components/ImageUploader';
import { ResultCard } from '@/components/ResultCard';
import { SampleImages } from '@/components/SampleImages';
import { ServerStatus } from '@/components/ServerStatus';
import { useBackendStatus } from '@/hooks/useBackendStatus';
import { predictImage } from '@/lib/api';
import { ModelType, PredictionResponse } from '@/lib/types';

export default function Home() {
  const { status, retryCount, checkServer } = useBackendStatus();

  const [selectedModel, setSelectedModel] = useState<ModelType>('triage');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (file: File, modelType: ModelType) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await predictImage(file, modelType);
      setResult(data);
    } catch (err: unknown) {
      console.error('Inference error:', err);
      const apiErr = err as { detail?: string; message?: string };
      setError(apiErr?.detail || apiErr?.message || 'Inference failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="flex-1 w-full flex flex-col items-center">
      {/* Top Navigation / Status Header */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/60 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-black text-lg">
              PL
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                PapLens
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Research Demo
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ServerStatus status={status} retryCount={retryCount} onRefresh={checkServer} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 flex-1">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            Interpretable Cervical Cytology Classification
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Interpretable cervical cytology classification with attention-based multiple instance learning. Research demo.
          </p>
        </div>

        {/* Global Error Alert */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Inference Progress Skeleton */}
        {isLoading && (
          <div className="w-full p-8 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40 border border-indigo-500/30 backdrop-blur-md text-center space-y-4 animate-pulse">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mb-2">
              <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Analyzing Slide Field-of-View...</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Extracting 1280px patches, filtering background glass, generating ResNet-50 embeddings, and computing Gated Attention weights.
            </p>
          </div>
        )}

        {/* Dynamic Display: Results vs Uploader */}
        {!result ? (
          <>
            <ImageUploader
              onAnalyze={handleAnalyze}
              isLoading={isLoading}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />

            <SampleImages onSelectSample={(file) => handleAnalyze(file, selectedModel)} isLoading={isLoading} />

            <HowItWorks />
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header actions */}
            <div className="flex items-center justify-between pb-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Diagnostic Findings</h3>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" />
                </svg>
                <span>Analyze Another Slide</span>
              </button>
            </div>

            <ResultCard result={result} />

            <HeatmapViewer result={result} />

            <HowItWorks />
          </div>
        )}
      </main>
    </div>
  );
}
