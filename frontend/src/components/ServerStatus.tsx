'use client';

import { getStatusPresentation, ServerState } from '@/config/backendStatus';
import { BackendTarget } from '@/domain/backend';

interface ServerStatusProps {
  status: ServerState;
  retryCount: number;
  target?: BackendTarget;
  onRefresh: () => void;
}

export function ServerStatus({ status, retryCount, target = 'primary', onRefresh }: ServerStatusProps) {
  const current = getStatusPresentation(status, target, retryCount);

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
