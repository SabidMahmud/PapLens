'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ModelType, PredictionResponse } from '@/domain/analysis';
import { predictImage } from '@/lib/api';

interface ImageSelection {
  file: File;
  url: string;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as { detail?: string; message?: string };
    return apiError.detail || apiError.message || 'Inference failed. Please try again.';
  }
  return 'Inference failed. Please try again.';
}

export function useAnalysisWorkspace() {
  const [selectedModel, setSelectedModel] = useState<ModelType>('triage');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<ImageSelection | null>(null);
  const requestInFlight = useRef(false);

  useEffect(() => () => {
    if (selection) URL.revokeObjectURL(selection.url);
  }, [selection]);

  const selectFile = useCallback((file: File) => {
    if (requestInFlight.current) return;
    setSelection({ file, url: URL.createObjectURL(file) });
    setError(null);
  }, []);

  const analyze = useCallback(async (file: File, modelType: ModelType) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setIsLoading(true);
    setError(null);

    try {
      setResult(await predictImage(file, modelType));
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setSelection(null);
  }, []);

  return {
    selectedModel,
    setSelectedModel,
    isLoading,
    result,
    error,
    clearError: () => setError(null),
    selection,
    selectFile,
    analyze,
    reset,
  };
}
