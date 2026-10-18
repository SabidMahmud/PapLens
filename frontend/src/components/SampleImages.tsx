'use client';

import React, { useEffect, useState } from 'react';

interface SampleImageItem {
  name: string;
  filename: string;
  label: string;
  description: string;
}

interface SampleImagesProps {
  onSelectSample: (file: File) => void;
  isLoading: boolean;
}

// Default metadata for samples when placed in public/samples/
const AVAILABLE_SAMPLES: SampleImageItem[] = [
  // Populated dynamically if placed by user
];

export const SampleImages: React.FC<SampleImagesProps> = ({ onSelectSample, isLoading }) => {
  const [samples, setSamples] = useState<SampleImageItem[]>(AVAILABLE_SAMPLES);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  // Checks if public/samples contains any user-provided sample images
  useEffect(() => {
    // Attempt to probe known sample filenames if user places any in public/samples
    const probeSamples = async () => {
      const candidates = [
        { name: 'Normal (NILM) Sample', filename: 'sample_nilm.jpg', label: 'Normal', description: 'Clean negative squamous field' },
        { name: 'Low-Grade (LSIL) Sample', filename: 'sample_lsil.jpg', label: 'Low-Grade', description: 'Koilocytes and mild nuclear enlargement' },
        { name: 'High-Grade (HSIL) Sample', filename: 'sample_hsil.jpg', label: 'High-Grade', description: 'Marked dyskaryosis and irregular chromatin' },
      ];

      const found: SampleImageItem[] = [];
      for (const item of candidates) {
        try {
          const res = await fetch(`/samples/${item.filename}`, { method: 'HEAD' });
          if (res.ok) {
            found.push(item);
          }
        } catch {
          // Ignore 404
        }
      }
      setSamples(found);
    };

    probeSamples();
  }, []);

  const loadSample = async (item: SampleImageItem) => {
    if (isLoading) return;
    setLoadingSample(item.filename);

    try {
      const res = await fetch(`/samples/${item.filename}`);
      if (!res.ok) throw new Error('Failed to fetch sample image.');
      const blob = await res.blob();
      const file = new File([blob], item.filename, { type: blob.type || 'image/jpeg' });
      onSelectSample(file);
    } catch (err) {
      console.error('Error loading sample image:', err);
    } finally {
      setLoadingSample(null);
    }
  };

  // If no samples were placed in public/samples, return null so UI stays clean
  if (samples.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900/60 rounded-2xl border border-slate-800 p-6 backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Sample Microscopy Images</h3>
          <p className="text-xs text-slate-400">Click any sample to test model inference instantly</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {samples.map((item) => (
          <button
            key={item.filename}
            type="button"
            onClick={() => loadSample(item)}
            disabled={isLoading || loadingSample === item.filename}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-950/80 text-left transition-all disabled:opacity-50 group"
          >
            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700/80 overflow-hidden flex-shrink-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/samples/${item.filename}`}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-200 block truncate group-hover:text-indigo-300">
                {item.name}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">{item.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
