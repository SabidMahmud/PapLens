'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkHealth, getActiveBackendTarget } from '@/lib/api';
import { BackendTarget, HealthResponse } from '@/lib/types';

export type ServerState = 'checking' | 'online' | 'waking' | 'offline';

export interface UseBackendStatusReturn {
  status: ServerState;
  health: HealthResponse | null;
  error: string | null;
  retryCount: number;
  target: BackendTarget;
  checkServer: () => void;
}

export function useBackendStatus(): UseBackendStatusReturn {
  const [status, setStatus] = useState<ServerState>('checking');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [target, setTarget] = useState<BackendTarget>(getActiveBackendTarget());
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const performCheckRef = useRef<(retry: number) => Promise<void>>(async () => {});

  const performCheck = useCallback(async (currentRetry: number = 0) => {
    if (!isMountedRef.current) return;
    setStatus(currentRetry === 0 ? 'checking' : 'waking');
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const data = await checkHealth(controller.signal);
      clearTimeout(timeoutId);

      if (!isMountedRef.current) return;
      if (data && data.status === 'ok' && data.models_loaded) {
        setHealth(data);
        setStatus('online');
        setRetryCount(0);
        if (data.served_by) {
          setTarget(data.served_by);
        }
      } else {
        throw new Error('Models still initializing on server.');
      }
    } catch {
      clearTimeout(timeoutId);
      if (!isMountedRef.current) return;

      const nextRetry = currentRetry + 1;
      setRetryCount(nextRetry);

      if (nextRetry <= 5) {
        setStatus('waking');
        // Exponential backoff: 3s, 5s, 8s, 12s, 15s
        const backoffMs = Math.min(3000 * Math.pow(1.4, nextRetry - 1), 15000);
        retryTimerRef.current = setTimeout(() => {
          performCheckRef.current(nextRetry);
        }, backoffMs);
      } else {
        setStatus('offline');
        setError(
          'Model server appears to be unreachable. If running locally, please start the backend container. ' +
          'If on Hugging Face Spaces, it may take an additional moment to complete container startup.'
        );
      }
    }
  }, []);

  useEffect(() => {
    performCheckRef.current = performCheck;
  }, [performCheck]);

  const checkServer = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    performCheck(0);
  }, [performCheck]);

  useEffect(() => {
    isMountedRef.current = true;
    const initialTimer = setTimeout(() => {
      performCheckRef.current(0);
    }, 0);

    return () => {
      isMountedRef.current = false;
      clearTimeout(initialTimer);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  return { status, health, error, retryCount, target, checkServer };
}
