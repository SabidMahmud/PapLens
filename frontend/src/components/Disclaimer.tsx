'use client';

import React from 'react';

export const Disclaimer: React.FC = () => {
  return (
    <div className="w-full bg-slate-900/80 border-t border-slate-800 py-4 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold tracking-wide uppercase text-[10px] border border-amber-500/30">
            Research Demo Only
          </span>
          <p className="leading-relaxed">
            Not for clinical, medical, or diagnostic use. Demo of a model from the PapSmear-BD study.
          </p>
        </div>
        <div className="text-slate-500 text-[11px] text-center sm:text-right">
          <span>This research demo does not distribute or grant downloads to the underlying dataset.</span>
        </div>
      </div>
    </div>
  );
};
