import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultCard } from '@/components/ResultCard';
import { PredictionResponse } from '@/lib/types';

describe('ResultCard Component', () => {
  const sampleTriageResult: PredictionResponse = {
    model_type: 'triage',
    predicted_class: 'Normal',
    display_name: 'Normal (NILM)',
    severity_level: 'success',
    confidence: 0.9941,
    probabilities: {
      Normal: 0.9941,
      Abnormal: 0.0059,
    },
    classes: ['Normal', 'Abnormal'],
    num_patches: 24,
    inference_time_ms: 648.5,
    overlay_base64: 'data:image/png;base64,mock',
    heatmap_only_base64: 'data:image/png;base64,mock',
    original_display_base64: 'data:image/png;base64,mock',
    display_width: 1024,
    display_height: 768,
    top_patches: [],
  };

  it('renders predicted class heading, confidence, and latency', () => {
    render(<ResultCard result={sampleTriageResult} />);

    expect(screen.getByRole('heading', { name: 'Normal' })).toBeInTheDocument();
    expect(screen.getByText('99.4% Confidence')).toBeInTheDocument();
    expect(screen.getByText(/648.5 ms/i)).toBeInTheDocument();
    expect(screen.getByText(/24 foreground/i)).toBeInTheDocument();
    expect(screen.getByText('Normal (NILM)')).toBeInTheDocument();
  });

  it('renders all class probabilities with percentage labels', () => {
    render(<ResultCard result={sampleTriageResult} />);

    expect(screen.getByText('99.4%')).toBeInTheDocument();
    expect(screen.getByText('0.6%')).toBeInTheDocument();
  });

  it('renders 3-Class Severity results accurately', () => {
    const severityResult: PredictionResponse = {
      ...sampleTriageResult,
      model_type: 'severity',
      predicted_class: 'High_Grade',
      display_name: 'High-Grade Lesion / Malignancy (HSIL / SCC)',
      severity_level: 'danger',
      confidence: 0.9716,
      probabilities: {
        Normal: 0.0,
        Low_Grade: 0.0284,
        High_Grade: 0.9716,
      },
      classes: ['Normal', 'Low_Grade', 'High_Grade'],
    };

    render(<ResultCard result={severityResult} />);

    expect(screen.getByRole('heading', { name: 'High Grade' })).toBeInTheDocument();
    expect(screen.getByText('97.2% Confidence')).toBeInTheDocument();
    expect(screen.getByText('High-Grade Lesion / Malignancy (HSIL / SCC)')).toBeInTheDocument();
  });
});
