import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkHealth, predictImage, ApiClientError } from '@/lib/api';

describe('API Client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('checkHealth parses successful server health check', async () => {
    const mockHealth = {
      status: 'ok',
      models_loaded: true,
      available_models: ['triage', 'severity'],
      device: 'cpu',
      torch_threads: 4,
      version: '1.0.0',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockHealth,
    });

    const result = await checkHealth();
    expect(result.status).toBe('ok');
    expect(result.models_loaded).toBe(true);
    expect(result.available_models).toContain('triage');
  });

  it('checkHealth throws ApiClientError when response is not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    await expect(checkHealth()).rejects.toThrow(ApiClientError);
  });

  it('predictImage sends model_type parameter and parses prediction response', async () => {
    const mockPrediction = {
      model_type: 'triage',
      predicted_class: 'Normal',
      display_name: 'Normal (NILM)',
      severity_level: 'success',
      confidence: 0.994,
      probabilities: { Normal: 0.994, Abnormal: 0.006 },
      classes: ['Normal', 'Abnormal'],
      num_patches: 24,
      inference_time_ms: 540.2,
      overlay_base64: 'data:image/png;base64,overlay',
      heatmap_only_base64: 'data:image/png;base64,heatmap',
      original_display_base64: 'data:image/png;base64,orig',
      display_width: 1024,
      display_height: 768,
      top_patches: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPrediction,
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'slide.jpg', { type: 'image/jpeg' });
    const response = await predictImage(file, 'triage');

    expect(response.predicted_class).toBe('Normal');
    expect(response.confidence).toBe(0.994);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/predict?model_type=triage'),
      expect.any(Object)
    );
  });

  it('predictImage throws formatted ApiClientError on 400 error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'File exceeds maximum upload size of 15 MB.' }),
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'large.jpg', { type: 'image/jpeg' });
    await expect(predictImage(file, 'triage')).rejects.toThrow(ApiClientError);
  });
});
