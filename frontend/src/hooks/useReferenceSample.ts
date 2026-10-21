'use client';

import { useRef, useState } from 'react';
import { fetchReferenceSample } from '@/services/referenceSamples';

interface UseReferenceSampleOptions {
  isLoading: boolean;
  onSelectSample: (file: File) => void;
}

export function useReferenceSample({
  isLoading,
  onSelectSample,
}: UseReferenceSampleOptions) {
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  const loadSample = async (filename: string) => {
    if (isLoading || pending.current) return;
    pending.current = true;
    setError(null);
    setLoadingSample(filename);

    try {
      onSelectSample(await fetchReferenceSample(filename));
    } catch {
      setError('This sample could not be loaded. Try again or upload your own image.');
    } finally {
      pending.current = false;
      setLoadingSample(null);
    }
  };

  return { loadingSample, error, loadSample };
}
