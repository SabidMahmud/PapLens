'use client';

import { ServerState } from '@/hooks/useBackendStatus';
import { BackendTarget } from '@/lib/types';

interface ServerStatusProps {
  status: ServerState;
  retryCount: number;
  target?: BackendTarget;
  onRefresh: () => void;
}

export function ServerStatus({ status, retryCount, target = 'primary', onRefresh }: ServerStatusProps) {
  const states = {
    online: {
      dot: 'bg-[#16877b]',
      label: target === 'fallback' ? 'Fallback online' : 'System ready',
      detail: target === 'fallback' ? 'Hugging Face' : 'k3s',
    },
    checking: { dot: 'bg-[#b67b22] animate-pulse', label: 'Checking system', detail: '' },
    waking: { dot: 'bg-[#b67b22] animate-pulse', label: 'Connecting', detail: `Attempt ${retryCount}/5` },
    offline: { dot: 'bg-[#a33d35]', label: 'System offline', detail: '' },
  } as const;
  const current = states[status];

  return (
    <div className="flex items-center gap-2 text-xs" data-testid="backend-badge">
      <span className={`h-2 w-2 rounded-full ${current.dot}`} aria-hidden="true" />
      <span role="status" className="font-semibold text-[#26312e]">{current.label}</span>
      {current.detail && <span className="hidden text-[#7a827f] sm:inline">· {current.detail}</span>}
      {(status === 'offline' || status === 'waking') && (
        <button type="button" onClick={onRefresh} className="min-h-11 px-2 text-xs font-semibold text-[#65706c] underline underline-offset-4 hover:text-[#0d6b62]">Retry</button>
      )}
    </div>
  );
}
