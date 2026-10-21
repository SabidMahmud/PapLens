import { BackendResolution, BackendTarget } from '@/domain/backend';

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

export const PRIMARY_API_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_URL_PRIMARY ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:7860'
);

export const FALLBACK_API_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_URL_FALLBACK ||
    'https://sabidmahmud-paplens.hf.space'
);

export const BACKEND_LABELS: Record<BackendTarget, string> = {
  primary: 'k3s cluster',
  fallback: 'Hugging Face Spaces (fallback)',
};

export const API_TIMEOUTS = {
  primaryProbe: 4_000,
  fallbackProbe: 8_000,
  health: 8_000,
  prediction: 60_000,
} as const;

export function getBackendResolution(target: BackendTarget): BackendResolution {
  return {
    target,
    baseUrl: target === 'primary' ? PRIMARY_API_URL : FALLBACK_API_URL,
    label: BACKEND_LABELS[target],
  };
}

export function getAlternateTarget(target: BackendTarget): BackendTarget {
  return target === 'primary' ? 'fallback' : 'primary';
}
