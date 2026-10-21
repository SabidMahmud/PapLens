import { BackendTarget } from '@/domain/backend';

export type ServerState = 'checking' | 'online' | 'waking' | 'offline';

export const BACKEND_STATUS_CONFIG = {
  checkTimeoutMs: 8_000,
  maxRetries: 5,
  initialRetryDelayMs: 3_000,
  retryGrowthFactor: 1.4,
  maxRetryDelayMs: 15_000,
  offlineMessage:
    'Model server appears to be unreachable. If running locally, please start the backend container. ' +
    'If on Hugging Face Spaces, it may take an additional moment to complete container startup.',
} as const;

export function getRetryDelay(retry: number): number {
  return Math.min(
    BACKEND_STATUS_CONFIG.initialRetryDelayMs *
      Math.pow(BACKEND_STATUS_CONFIG.retryGrowthFactor, retry - 1),
    BACKEND_STATUS_CONFIG.maxRetryDelayMs
  );
}

interface StatusPresentation {
  dot: string;
  label: string;
  detail: string;
}

export function getStatusPresentation(
  status: ServerState,
  target: BackendTarget,
  retryCount: number
): StatusPresentation {
  const presentations: Record<ServerState, StatusPresentation> = {
    online: {
      dot: 'bg-[#16877b]',
      label: target === 'fallback' ? 'Fallback online' : 'System ready',
      detail: target === 'fallback' ? 'Hugging Face' : 'k3s',
    },
    checking: { dot: 'bg-[#b67b22] animate-pulse', label: 'Checking system', detail: '' },
    waking: {
      dot: 'bg-[#b67b22] animate-pulse',
      label: 'Connecting',
      detail: `Attempt ${retryCount}/${BACKEND_STATUS_CONFIG.maxRetries}`,
    },
    offline: { dot: 'bg-danger', label: 'System offline', detail: '' },
  };
  return presentations[status];
}
