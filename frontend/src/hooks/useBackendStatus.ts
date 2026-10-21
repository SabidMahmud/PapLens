'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BACKEND_STATUS_CONFIG,
  getRetryDelay,
  ServerState,
} from '@/config/backendStatus';
import { checkHealth, getActiveBackendTarget } from '@/lib/api';
import { BackendTarget, HealthResponse } from '@/domain/backend';

export type { ServerState } from '@/config/backendStatus';

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

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const performCheckRef = useRef<(retry: number) => Promise<void>>(async () => {});

  const performCheck = useCallback(async (currentRetry: number = 0) => {
    if (!isMountedRef.current) return;
    setStatus(currentRetry === 0 ? 'checking' : 'waking');
    setError(null);

    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    const timeoutId = setTimeout(
      () => controller.abort(),
      BACKEND_STATUS_CONFIG.checkTimeoutMs
    );

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

      if (nextRetry <= BACKEND_STATUS_CONFIG.maxRetries) {
        setStatus('waking');
        retryTimerRef.current = setTimeout(() => {
          performCheckRef.current(nextRetry);
        }, getRetryDelay(nextRetry));
      } else {
        setStatus('offline');
        setError(BACKEND_STATUS_CONFIG.offlineMessage);
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
      activeControllerRef.current?.abort();
    };
  }, []);

  return { status, health, error, retryCount, target, checkServer };
}
