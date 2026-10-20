/**
 * Single source of truth for all API communication with the PapLens backend.
 * Implements client-side failover between Primary (k3s Cluster) and Fallback (Hugging Face Spaces).
 * Directly calls the FastAPI server (bypassing Next.js API routes).
 */
import {
  BackendResolution,
  BackendTarget,
  HealthResponse,
  ModelType,
  PredictionResponse,
} from './types';

export const PRIMARY_API_URL = (
  process.env.NEXT_PUBLIC_API_URL_PRIMARY ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:7860'
).replace(/\/+$/, '');

export const FALLBACK_API_URL = (
  process.env.NEXT_PUBLIC_API_URL_FALLBACK ||
  'https://sabidmahmud-paplens.hf.space'
).replace(/\/+$/, '');

export const BACKEND_LABELS: Record<BackendTarget, string> = {
  primary: 'k3s cluster',
  fallback: 'Hugging Face Spaces (fallback)',
};

export class ApiClientError extends Error {
  status?: number;
  detail: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.detail = detail || message;
  }
}

// Session cache for resolved backend target
let cachedResolution: BackendResolution | null = null;

export function getActiveBackendTarget(): BackendTarget {
  return cachedResolution?.target || 'primary';
}

export function getActiveBackendLabel(): string {
  const target = getActiveBackendTarget();
  return BACKEND_LABELS[target];
}

export function resetBackendResolution(): void {
  cachedResolution = null;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem('paplens_backend_target');
    } catch {
      // Ignore storage access errors
    }
  }
}

/**
 * Resolves the active backend target.
 * 1. Checks session cache.
 * 2. Probes PRIMARY (/health) with a short timeout (~4s).
 * 3. If PRIMARY fails, switches to FALLBACK.
 */
export async function resolveBackend(forceRecheck: boolean = false): Promise<BackendResolution> {
  // Check in-memory or session storage cache if not forced
  if (!forceRecheck && cachedResolution) {
    return cachedResolution;
  }

  if (!forceRecheck && typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem('paplens_backend_target') as BackendTarget | null;
      if (stored && (stored === 'primary' || stored === 'fallback')) {
        cachedResolution = {
          target: stored,
          baseUrl: stored === 'primary' ? PRIMARY_API_URL : FALLBACK_API_URL,
          label: BACKEND_LABELS[stored],
        };
        return cachedResolution;
      }
    } catch {
      // Fall through to probe
    }
  }

  // Probe PRIMARY with 4000ms timeout
  const primaryController = new AbortController();
  const primaryTimeout = setTimeout(() => primaryController.abort(), 4000);

  try {
    const res = await fetch(`${PRIMARY_API_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: primaryController.signal,
    });
    clearTimeout(primaryTimeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'ok') {
        const resolution: BackendResolution = {
          target: 'primary',
          baseUrl: PRIMARY_API_URL,
          label: BACKEND_LABELS.primary,
        };
        setResolutionCache(resolution);
        return resolution;
      }
    }
  } catch {
    clearTimeout(primaryTimeout);
    // Primary failed or timed out, fall through to fallback
  }

  // Probe FALLBACK (/health) with ~8000ms timeout
  const fallbackController = new AbortController();
  const fallbackTimeout = setTimeout(() => fallbackController.abort(), 8000);

  let fallbackOk = false;
  try {
    const res = await fetch(`${FALLBACK_API_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: fallbackController.signal,
    });
    clearTimeout(fallbackTimeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'ok') {
        fallbackOk = true;
      }
    }
  } catch {
    clearTimeout(fallbackTimeout);
  }

  if (fallbackOk) {
    const fallbackResolution: BackendResolution = {
      target: 'fallback',
      baseUrl: FALLBACK_API_URL,
      label: BACKEND_LABELS.fallback,
    };
    setResolutionCache(fallbackResolution);
    return fallbackResolution;
  }

  // Both backends failed probe
  throw new ApiClientError(
    'All backend targets are unreachable (k3s cluster and Hugging Face Spaces).',
    503,
    'Both primary and fallback /health probes failed.'
  );
}

export function setResolutionCache(resolution: BackendResolution): void {
  cachedResolution = resolution;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem('paplens_backend_target', resolution.target);
    } catch {
      // Ignore storage access errors
    }
  }
}

/**
 * Checks server health and model load status using the resolved backend.
 */
export async function checkHealth(
  signal?: AbortSignal,
  forceRecheck: boolean = false
): Promise<HealthResponse> {
  const resolution = await resolveBackend(forceRecheck);
  const url = `${resolution.baseUrl}/health`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    if (!res.ok) {
      throw new ApiClientError(
        `Server returned status ${res.status}`,
        res.status,
        `Health check failed on ${resolution.label} with status code ${res.status}.`
      );
    }

    const data: HealthResponse = await res.json();
    data.served_by = resolution.target;
    return data;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError('Health check aborted.', undefined, 'Health check request was cancelled.');
    }
    if (error instanceof ApiClientError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Network connection failed.';
    throw new ApiClientError(
      `Cannot connect to PapLens model server on ${resolution.label}.`,
      undefined,
      message
    );
  }
}

/**
 * Executes a single inference request to a specific backend base URL.
 */
async function executePredictRequest(
  baseUrl: string,
  target: BackendTarget,
  file: File | Blob,
  modelType: ModelType,
  callerSignal?: AbortSignal,
  timeoutMs: number = 60_000
): Promise<PredictionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('REQUEST_TIMEOUT'));
  }, timeoutMs);

  if (callerSignal) {
    callerSignal.addEventListener('abort', () => controller.abort());
  }

  const formData = new FormData();
  if (file instanceof File) {
    formData.append('file', file);
  } else {
    formData.append('file', file, 'slide_sample.jpg');
  }

  const url = `${baseUrl}/predict?model_type=${encodeURIComponent(modelType)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `Inference failed on ${BACKEND_LABELS[target]} with status ${response.status}.`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        errorDetail = response.statusText || errorDetail;
      }
      throw new ApiClientError(errorDetail, response.status, errorDetail);
    }

    const result: PredictionResponse = await response.json();
    result.served_by = target;
    return result;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof ApiClientError) {
      throw error;
    }

    const isAbort =
      (error instanceof Error && error.name === 'AbortError') ||
      controller.signal.aborted;

    if (isAbort) {
      throw new ApiClientError(
        'Inference request timed out. If the server is starting up, please retry in a moment.',
        408,
        'Request timeout exceeded.'
      );
    }

    const message = error instanceof Error ? error.message : 'Network error';
    throw new ApiClientError(
      `Connection failed on ${BACKEND_LABELS[target]}.`,
      undefined,
      message
    );
  }
}

/**
 * Runs slide-level inference with automatic failover and single retry.
 * If the active backend fails with a network error or 5xx, retries ONCE on the alternative backend.
 */
export async function predictImage(
  file: File | Blob,
  modelType: ModelType = 'triage',
  callerSignal?: AbortSignal,
  timeoutMs: number = 60_000
): Promise<PredictionResponse> {
  const currentResolution = await resolveBackend();

  try {
    return await executePredictRequest(
      currentResolution.baseUrl,
      currentResolution.target,
      file,
      modelType,
      callerSignal,
      timeoutMs
    );
  } catch (initialError: unknown) {
    const isNetworkOr5xx =
      initialError instanceof ApiClientError &&
      (!initialError.status || initialError.status >= 500);

    // If client aborted or got a 4xx validation error, do not retry
    if (!isNetworkOr5xx) {
      throw initialError;
    }

    // Switch to the alternative backend
    const alternateTarget: BackendTarget =
      currentResolution.target === 'primary' ? 'fallback' : 'primary';
    const alternateBaseUrl =
      alternateTarget === 'primary' ? PRIMARY_API_URL : FALLBACK_API_URL;

    const altResolution: BackendResolution = {
      target: alternateTarget,
      baseUrl: alternateBaseUrl,
      label: BACKEND_LABELS[alternateTarget],
    };
    setResolutionCache(altResolution);

    // Retry ONCE on alternative backend
    try {
      return await executePredictRequest(
        altResolution.baseUrl,
        altResolution.target,
        file,
        modelType,
        callerSignal,
        timeoutMs
      );
    } catch {
      // If retry also fails, re-throw original or latest error
      throw initialError;
    }
  }
}
