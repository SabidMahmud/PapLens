import { BackendTarget } from '@/domain/backend';
import { ServerState } from '@/hooks/useBackendStatus';
import { BrandMark } from './BrandMark';
import { ServerStatus } from './ServerStatus';

interface AppHeaderProps {
  status: ServerState;
  retryCount: number;
  target: BackendTarget;
  onRefresh: () => void;
}

export function AppHeader({ status, retryCount, target, onRefresh }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[#f8f7f2]/95 backdrop-blur-sm">
      <div className="workspace-shell flex h-[68px] items-center justify-between gap-5">
        <a href="#main-content" className="group flex items-center gap-3" aria-label="PapLens home">
          <span className="grid h-9 w-9 place-items-center border border-ink bg-ink text-sm font-bold tracking-tight text-white transition-colors group-hover:bg-brand">
            <BrandMark />
          </span>
          <span>
            <span className="font-display block text-lg leading-none text-ink">PapLens</span>
            <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.16em] text-[#707a76] sm:block">
              Cytology evidence workspace
            </span>
          </span>
        </a>

        <div className="flex items-center gap-5">
          <span className="hidden border-r border-line pr-5 text-xs text-ink-muted lg:block">
            PapSmear-BD research prototype
          </span>
          <ServerStatus
            status={status}
            retryCount={retryCount}
            target={target}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </header>
  );
}
