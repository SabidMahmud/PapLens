import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import { HeatmapViewer } from '@/components/HeatmapViewer';
import { SampleImages } from '@/components/SampleImages';
import { predictImage } from '@/lib/api';
import { PredictionResponse } from '@/lib/types';

vi.mock('@/lib/api', () => ({ predictImage: vi.fn() }));
vi.mock('@/hooks/useBackendStatus', () => ({
  useBackendStatus: () => ({ status: 'online', retryCount: 0, target: 'primary', checkServer: vi.fn() }),
}));
vi.mock('next/image', () => ({
  default: ({ fill: _fill, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean }) => {
    void _fill;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

const result: PredictionResponse = {
  model_type: 'triage', predicted_class: 'Normal', display_name: 'Normal (NILM)', severity_level: 'success',
  confidence: 0.9, probabilities: { Normal: 0.9, Abnormal: 0.1 }, classes: ['Normal', 'Abnormal'],
  num_patches: 12, inference_time_ms: 430, display_width: 1000, display_height: 800,
  original_display_base64: 'data:image/png;base64,original', heatmap_only_base64: 'data:image/png;base64,heatmap', overlay_base64: 'data:image/png;base64,overlay',
  top_patches: [{ rank: 1, attention_score: 0.92, raw_attention: 0.2, box: { x: 100, y: 100, width: 200, height: 200 }, box_display: { x: 100, y: 100, width: 200, height: 200 } }],
};

beforeEach(() => {
  vi.resetAllMocks();
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test-preview') });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.stubGlobal('scrollTo', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Analysis workspace', () => {
  const chooseImage = () => fireEvent.change(screen.getByLabelText('Upload microscopy image'), {
    target: { files: [new File(['image'], 'field.jpg', { type: 'image/jpeg' })] },
  });

  it('retains the selected image after a failed request and allows retry', async () => {
    vi.mocked(predictImage).mockRejectedValueOnce(new Error('Server unavailable')).mockResolvedValueOnce(result);
    render(<Home />);
    chooseImage();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis →' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    expect(screen.getByText('field.jpg')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Selected microscopy field' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis →' }));
    expect(await screen.findByRole('heading', { name: 'Evidence report' })).toHaveFocus();
    expect(predictImage).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/field.jpg/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /New analysis/ }));
    expect(screen.getByRole('button', { name: 'Choose a microscopy field image' })).toBeInTheDocument();
  });

  it('keeps the preview visible and locks protocol and upload during analysis', async () => {
    let finish!: (value: PredictionResponse) => void;
    vi.mocked(predictImage).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<Home />);
    chooseImage();
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis →' }));
    expect(screen.getByRole('img', { name: 'Selected microscopy field' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analyzing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Severity grading/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Replace image' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: 'Analyzing…' }).closest('form')!);
    expect(predictImage).toHaveBeenCalledTimes(1);
    finish(result);
    await screen.findByRole('heading', { name: 'Evidence report' });
  });

  it('preserves a valid selection when its replacement is invalid', () => {
    render(<Home />);
    chooseImage();
    fireEvent.change(screen.getByLabelText('Upload microscopy image'), {
      target: { files: [new File(['bad file'], 'document.pdf', { type: 'application/pdf' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Unsupported file format');
    expect(screen.getByText('field.jpg')).toBeInTheDocument();
  });

  it('stages a sample without automatically submitting it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['sample'], { type: 'image/jpeg' }) }));
    render(<Home />);
    fireEvent.click(screen.getByRole('button', { name: 'Select NILM sample' }));
    await screen.findByText('sample_nilm.jpg');
    expect(predictImage).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Select NILM sample' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Reference samples', () => {
  it('shows a recoverable loading error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const onSelect = vi.fn();
    render(<SampleImages isLoading={false} onSelectSample={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select NILM sample' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This sample could not be loaded');
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Select NILM sample' })).toBeEnabled();
  });

  it('disables all samples while a sample is loading', async () => {
    let finish!: (value: unknown) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => { finish = resolve; })));
    render(<SampleImages isLoading={false} onSelectSample={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select NILM sample' }));
    expect(screen.getByRole('button', { name: 'Select HSIL sample' })).toBeDisabled();
    finish({ ok: false });
    await screen.findByRole('alert');
  });
});

describe('Evidence map', () => {
  it('zooms into a region, keeps comparison panels aligned, and resets to full field', () => {
    render(<HeatmapViewer result={result} />);
    expect(screen.getByRole('img', { name: 'Field with attention overlay' })).toHaveAttribute('viewBox', '0 0 1000 800');
    fireEvent.click(screen.getByRole('button', { name: 'Inspect region 1' }));
    expect(screen.getByRole('img', { name: 'Field with attention overlay' })).toHaveAttribute('viewBox', '70 70 260 260');
    fireEvent.click(screen.getByRole('button', { name: 'compare' }));
    expect(screen.getByRole('img', { name: 'Original microscopy field' })).toHaveAttribute('viewBox', '70 70 260 260');
    fireEvent.click(screen.getByRole('button', { name: 'Fit field' }));
    expect(screen.getByRole('img', { name: 'Original microscopy field' })).toHaveAttribute('viewBox', '0 0 1000 800');
  });

  it('preserves blend across views and allows hiding region outlines', () => {
    render(<HeatmapViewer result={result} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '0.75' } });
    fireEvent.click(screen.getByRole('button', { name: 'compare' }));
    expect(screen.getByRole('img', { name: 'Field with attention overlay' }).querySelectorAll('image')[1]).toHaveAttribute('opacity', '0.75');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Region outlines' }));
    expect(screen.getByRole('img', { name: 'Field with attention overlay' }).querySelector('rect')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'original' }));
    expect(screen.getByRole('slider')).toBeDisabled();
  });

  it('handles results with no region previews', () => {
    render(<HeatmapViewer result={{ ...result, top_patches: [] }} />);
    expect(screen.getByText('No region previews were returned for this field.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Inspect region/ })).not.toBeInTheDocument();
  });

  it('reports image export errors', async () => {
    vi.stubGlobal('Image', class {
      onerror?: () => void;
      set src(_value: string) { this.onerror?.(); }
    });
    render(<HeatmapViewer result={result} />);
    fireEvent.click(screen.getByRole('button', { name: 'Export field ↓' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('could not be exported'));
    expect(screen.getByRole('button', { name: 'Export field ↓' })).toBeEnabled();
  });
});
