/**
 * Single source of truth for all API communication with the PapLens backend.
 * Directly calls the FastAPI server via NEXT_PUBLIC_API_URL (bypassing Next.js API routes).
 */
import { HealthResponse, ModelType, PredictionResponse } from './types';

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860'
).replace(/\/+$/, '');

export class ApiClientError extends Error {
  status?: number;
  detail: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.detail = detail || message;
  }
}

/**
 * Checks server health and model load status.
 */
export async function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/health`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (!res.ok) {
      throw new ApiClientError(
        `Server returned status ${res.status}`,
        res.status,
        `Health check failed with status code ${res.status}.`
      );
    }

    return await res.json();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new ApiClientError('Health check aborted.', undefined, 'Health check request was cancelled.');
    }
    throw new ApiClientError(
      'Cannot connect to PapLens model server.',
      undefined,
      error.message || 'Network connection failed.'
    );
  }
}

/**
 * Runs slide-level inference and heatmap overlay on an uploaded FOV image.
 * Uses an AbortController with a 60-second default timeout to protect against stuck requests.
 */
export async function predictImage(
  file: File | Blob,
  modelType: ModelType = 'triage',
  callerSignal?: AbortSignal,
  timeoutMs: number = 60_000
): Promise<PredictionResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new Error('REQUEST_TIMEOUT'));
  }, timeoutMs);

  // Link with caller's signal if provided
  if (callerSignal) {
    callerSignal.addEventListener('abort', () => controller.abort());
  }

  const formData = new FormData();
  // Ensure a filename exists if given a Blob
  if (file instanceof File) {
    formData.append('file', file);
  } else {
    formData.append('file', file, 'slide_sample.jpg');
  }

  const url = `${API_BASE_URL}/predict?model_type=${encodeURIComponent(modelType)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorDetail = `Inference failed with status ${response.status}.`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // Fall back to status text
        errorDetail = response.statusText || errorDetail;
      }
      throw new ApiClientError(errorDetail, response.status, errorDetail);
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error?.name === 'AbortError' || controller.signal.aborted) {
      throw new ApiClientError(
        'Inference request timed out or was cancelled. If the model server is waking up, please retry in a moment.',
        408,
        'Request timeout exceeded.'
      );
    }

    throw new ApiClientError(
      'Unable to connect to the PapLens model server. It may be starting up or sleeping on Hugging Face Spaces free tier.',
      undefined,
      error.message || 'Network error'
    );
  }
}
