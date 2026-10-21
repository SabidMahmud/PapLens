import { BackendResolution, BackendTarget } from '@/domain/backend';
import {
  API_TIMEOUTS,
  BACKEND_LABELS,
  getBackendResolution,
} from './config';
import { ApiClientError } from './errors';

const BACKEND_TARGET_STORAGE_KEY = 'paplens_backend_target';
let cachedResolution: BackendResolution | null = null;

function isBackendTarget(value: string | null): value is BackendTarget {
  return value === 'primary' || value === 'fallback';
}

function getStoredTarget(): BackendTarget | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const stored = window.sessionStorage.getItem(BACKEND_TARGET_STORAGE_KEY);
    return isBackendTarget(stored) ? stored : null;
  } catch {
    return null;
  }
}

function storeTarget(target: BackendTarget): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(BACKEND_TARGET_STORAGE_KEY, target);
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

async function isHealthy(baseUrl: string, timeoutMs: number): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const health = await response.json();
    return health?.status === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getActiveBackendTarget(): BackendTarget {
  return cachedResolution?.target || 'primary';
}

export function getActiveBackendLabel(): string {
  return BACKEND_LABELS[getActiveBackendTarget()];
}

export function setResolutionCache(resolution: BackendResolution): void {
  cachedResolution = resolution;
  storeTarget(resolution.target);
}

export function resetBackendResolution(): void {
  cachedResolution = null;
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(BACKEND_TARGET_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }
}

export async function resolveBackend(
  forceRecheck: boolean = false
): Promise<BackendResolution> {
  if (!forceRecheck && cachedResolution) return cachedResolution;

  if (!forceRecheck) {
    const storedTarget = getStoredTarget();
    if (storedTarget) {
      const storedResolution = getBackendResolution(storedTarget);
      cachedResolution = storedResolution;
      return storedResolution;
    }
  }

  const primary = getBackendResolution('primary');
  if (await isHealthy(primary.baseUrl, API_TIMEOUTS.primaryProbe)) {
    setResolutionCache(primary);
    return primary;
  }

  const fallback = getBackendResolution('fallback');
  if (await isHealthy(fallback.baseUrl, API_TIMEOUTS.fallbackProbe)) {
    setResolutionCache(fallback);
    return fallback;
  }

  throw new ApiClientError(
    'All backend targets are unreachable (k3s cluster and Hugging Face Spaces).',
    503,
    'Both primary and fallback /health probes failed.'
  );
}
