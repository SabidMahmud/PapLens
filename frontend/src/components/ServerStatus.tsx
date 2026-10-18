'use client';

import React from 'react';
import { ServerState } from '@/hooks/useBackendStatus';

interface ServerStatusProps {
  status: ServerState;
  retryCount: number;
  onRefresh: () => void;
}

export const ServerStatus: React.FC<ServerStatusProps> = ({
  status,
  retryCount,
  onRefresh,
}) => {
  return (
    <div className="flex items-center gap-2">
      {status === 'online' && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 backdrop-blur-sm shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Model Server Ready</span>
        </div>
      )}

      {status === 'checking' && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 backdrop-blur-sm animate-pulse">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>Connecting to server...</span>
        </div>
      )}

      {status === 'waking' && (
        <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-950/70 text-amber-200 border border-amber-500/40 backdrop-blur-sm animate-pulse">
          <svg className="animate-spin h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>
            Waking up server on Hugging Face Spaces (attempt {retryCount}/5)... this can take ~30-60s
          </span>
          <button
            onClick={onRefresh}
            className="underline hover:text-amber-100 focus:outline-none"
            title="Retry connecting now"
          >
            Retry
          </button>
        </div>
      )}

      {status === 'offline' && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-950/70 text-rose-300 border border-rose-500/40 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
          <span>Server Unreachable</span>
          <button
            onClick={onRefresh}
            className="ml-1 underline hover:text-rose-100 font-semibold focus:outline-none"
          >
            Reconnect
          </button>
        </div>
      )}
    </div>
  );
};
