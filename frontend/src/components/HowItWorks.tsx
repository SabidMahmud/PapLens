'use client';

import React, { useState } from 'react';

export const HowItWorks: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="w-full bg-slate-900/50 rounded-2xl border border-slate-800/80 p-6 md:p-8 backdrop-blur-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How It Works & Interpretability
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Understanding Attention-Based Multiple Instance Learning (AB-MIL) on high-resolution cytology.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="self-start md:self-auto text-xs font-medium px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white transition-colors border border-slate-700/60"
        >
          {isOpen ? 'Collapse Details' : 'Read Full Methodology'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm mb-3">
            1
          </div>
          <h3 className="font-semibold text-slate-200 text-sm mb-1.5">No Compression Penalty</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Standard CNNs downsample entire 4000×3000 slides by ~239x, blurring nuclear chromatin. PapLens divides the slide into overlapping 1280×1280 px patches, preserving full cellular diagnostic resolution.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm mb-3">
            2
          </div>
          <h3 className="font-semibold text-slate-200 text-sm mb-1.5">Gated Attention MIL</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            A domain-adapted ResNet-50 extracts feature embeddings for each patch. A Gated Attention neural aggregator learns to assign mathematical weights ($a_i$) to diagnostic nuclei while ignoring empty space and mucus.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm mb-3">
            3
          </div>
          <h3 className="font-semibold text-slate-200 text-sm mb-1.5">Glass-Box Heatmaps</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The learned attention weights are spatially projected back onto slide coordinates to generate an interpretable colormap. Pathologists can immediately inspect and verify the cellular regions driving the AI prediction.
          </p>
        </div>
      </div>

      {isOpen && (
        <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/30 text-slate-300">
            <h4 className="font-semibold text-indigo-300 mb-1">Dataset Attribution</h4>
            <p>
              Demo of a model trained on the PapSmear-BD dataset (2,253 conventional Pap-smear FOV images). This app does not distribute the dataset.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <h4 className="font-semibold text-slate-200 mb-1.5">Clinical Classification Tasks</h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                <li>
                  <strong className="text-slate-300">2-Class Clinical Triage:</strong> Distinguishes Normal (NILM) from Abnormal (ASC-US, LSIL, HSIL, SCC). Designed for high-sensitivity screening triage to filter negative smears.
                </li>
                <li>
                  <strong className="text-slate-300">3-Class Severity Grading:</strong> Hierarchical stratification into Normal (NILM), Low-Grade (ASC-US, LSIL), and High-Grade/Malignant (HSIL, SCC) to mirror clinical referral triage.
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <h4 className="font-semibold text-slate-200 mb-1.5">Technical & Clinical Limitations</h4>
              <ul className="space-y-1.5 list-disc list-inside text-slate-400">
                <li>Field-of-View (FOV) level prediction: analyzes high-power microscopy fields, not entire whole slide images (WSI).</li>
                <li>Image quality dependency: severe out-of-focus blur, thick overlapping cell clumping, or camera sensor noise may influence attention weight distribution.</li>
                <li>Research demonstration only: not FDA-cleared, CE-marked, or validated for diagnostic or clinical patient care.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
