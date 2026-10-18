'use client';

import React from 'react';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  return (
    <div className="w-full rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/40 p-4 text-rose-800 dark:text-rose-200 flex items-start justify-between gap-3 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200 transition-colors">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
        </svg>
        <div>
          <h4 className="font-semibold text-sm text-rose-900 dark:text-rose-100">Inference Error</h4>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
        aria-label="Dismiss error"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
