import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkHealth,
  predictImage,
  resolveBackend,
  resetBackendResolution,
  setResolutionCache,
  ApiClientError,
  PRIMARY_API_URL,
  FALLBACK_API_URL,
} from '@/lib/api';

describe('API Client & Failover Resolver', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetBackendResolution();
  });

  describe('Resolver Failover Scenarios', () => {
    it('scenario 1: resolves to PRIMARY when primary is healthy', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.startsWith(PRIMARY_API_URL)) {
          return {
            ok: true,
            json: async () => ({ status: 'ok', models_loaded: true }),
          };
        }
        return { ok: false, status: 500 };
      });

      const resolution = await resolveBackend(true);
      expect(resolution.target).toBe('primary');
      expect(resolution.baseUrl).toBe(PRIMARY_API_URL);
      expect(resolution.label).toBe('k3s cluster');
    });

    it('scenario 2: resolves to FALLBACK when primary is down and fallback is healthy', async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.startsWith(PRIMARY_API_URL)) {
          throw new Error('Connection refused');
        }
        if (url.startsWith(FALLBACK_API_URL)) {
          return {
            ok: true,
            json: async () => ({ status: 'ok', models_loaded: true }),
          };
        }
        return { ok: false, status: 500 };
      });

      const resolution = await resolveBackend(true);
      expect(resolution.target).toBe('fallback');
      expect(resolution.baseUrl).toBe(FALLBACK_API_URL);
      expect(resolution.label).toBe('Hugging Face Spaces (fallback)');
    });

    it('scenario 3: throws ApiClientError when both backends are down', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        throw new Error('Network unreachable');
      });

      await expect(resolveBackend(true)).rejects.toThrow(ApiClientError);
      await expect(resolveBackend(true)).rejects.toThrow(/unreachable/i);
    });

    it('caches the resolved target in session and reuses it without re-probing', async () => {
      const fetchMock = vi.fn().mockImplementation(async (url: string) => {
        if (url.startsWith(PRIMARY_API_URL)) {
          return {
            ok: true,
            json: async () => ({ status: 'ok', models_loaded: true }),
          };
        }
        return { ok: false, status: 500 };
      });
      global.fetch = fetchMock;

      const first = await resolveBackend(true);
      expect(first.target).toBe('primary');
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call without forceRecheck should use cached resolution
      const second = await resolveBackend(false);
      expect(second.target).toBe('primary');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Health Checks', () => {
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
      expect(result.served_by).toBe('primary');
    });

    it('checkHealth throws ApiClientError when server is unreachable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      await expect(checkHealth(undefined, true)).rejects.toThrow(ApiClientError);
    });
  });

  describe('Prediction & Automatic Failover', () => {
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

    it('predictImage sends model_type parameter and parses prediction response', async () => {
      setResolutionCache({
        target: 'primary',
        baseUrl: PRIMARY_API_URL,
        label: 'k3s cluster',
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockPrediction,
      });

      const file = new File([new Uint8Array([1, 2, 3])], 'slide.jpg', { type: 'image/jpeg' });
      const response = await predictImage(file, 'triage');

      expect(response.predicted_class).toBe('Normal');
      expect(response.confidence).toBe(0.994);
      expect(response.served_by).toBe('primary');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`${PRIMARY_API_URL}/predict?model_type=triage`),
        expect.any(Object)
      );
    });

    it('predictImage automatically retries ONCE on fallback if primary fails with 500', async () => {
      setResolutionCache({
        target: 'primary',
        baseUrl: PRIMARY_API_URL,
        label: 'k3s cluster',
      });

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.startsWith(PRIMARY_API_URL)) {
          return {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ detail: 'Node out of memory' }),
          };
        }
        if (url.startsWith(FALLBACK_API_URL)) {
          return {
            ok: true,
            json: async () => ({ ...mockPrediction, served_by: 'fallback' }),
          };
        }
        return { ok: false, status: 404 };
      });

      const file = new File([new Uint8Array([1, 2, 3])], 'slide.jpg', { type: 'image/jpeg' });
      const response = await predictImage(file, 'triage');

      expect(response.predicted_class).toBe('Normal');
      expect(response.served_by).toBe('fallback');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('predictImage throws formatted ApiClientError on 400 validation error without retrying', async () => {
      setResolutionCache({
        target: 'primary',
        baseUrl: PRIMARY_API_URL,
        label: 'k3s cluster',
      });

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'File exceeds maximum upload size of 50 MB.' }),
      });
      global.fetch = fetchMock;

      const file = new File([new Uint8Array([1, 2, 3])], 'large.jpg', { type: 'image/jpeg' });
      await expect(predictImage(file, 'triage')).rejects.toThrow(ApiClientError);
      // Should NOT retry on 4xx user validation errors
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
