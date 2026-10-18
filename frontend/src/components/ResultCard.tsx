'use client';

import React from 'react';
import { PredictionResponse } from '@/lib/types';

interface ResultCardProps {
  result: PredictionResponse;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const isNormal = result.predicted_class === 'Normal';
  const isHighGrade = result.predicted_class === 'High_Grade' || result.predicted_class === 'Abnormal';

  const badgeColor = isNormal
    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-emerald-950/50'
    : isHighGrade
    ? 'bg-rose-950/80 text-rose-300 border-rose-500/40 shadow-rose-950/50'
    : 'bg-amber-950/80 text-amber-300 border-amber-500/40 shadow-amber-950/50';

  return (
    <div className="w-full bg-slate-900/70 rounded-2xl border border-slate-800 p-6 md:p-8 backdrop-blur-md shadow-2xl animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
            Slide Classification Result ({result.model_type === 'triage' ? '2-Class Triage' : '3-Class Severity'})
          </span>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {result.predicted_class.replace('_', ' ')}
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${badgeColor}`}>
              {(result.confidence * 100).toFixed(1)}% Confidence
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{result.display_name}</p>
        </div>

        {/* Telemetry metadata */}
        <div className="flex sm:flex-col items-start sm:items-end gap-3 sm:gap-1 text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Inference: <strong className="text-slate-200">{result.inference_time_ms} ms</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Patches: <strong className="text-slate-200">{result.num_patches} foreground</strong></span>
          </div>
        </div>
      </div>

      {/* Probabilities distribution */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Posterior Probability Distribution
        </h3>
        <div className="space-y-3">
          {Object.entries(result.probabilities).map(([cls, prob]) => {
            const isWinner = cls === result.predicted_class;
            const pct = (prob * 100).toFixed(1);

            return (
              <div key={cls} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className={`font-medium ${isWinner ? 'text-slate-100 font-bold' : 'text-slate-400'}`}>
                    {cls.replace('_', ' ')}
                  </span>
                  <span className={`font-mono text-xs ${isWinner ? 'text-indigo-300 font-bold' : 'text-slate-400'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isWinner
                        ? isNormal
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                          : isHighGrade
                          ? 'bg-gradient-to-r from-rose-500 to-red-400 shadow-sm shadow-rose-500/50'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-sm shadow-amber-500/50'
                        : 'bg-slate-700/60'
                    }`}
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
