import { ModelType, PredictionResponse } from '@/domain/analysis';
import { BackendTarget } from '@/domain/backend';
import { createRequestAbortContext } from './abort';
import { resolveBackend, setResolutionCache } from './backendResolution';
import {
  API_TIMEOUTS,
  BACKEND_LABELS,
  getAlternateTarget,
  getBackendResolution,
} from './config';
import {
  ApiClientError,
  isRetryableApiError,
  readApiErrorDetail,
} from './errors';

function createPredictionPayload(file: File | Blob): FormData {
  const payload = new FormData();
  if (file instanceof File) {
    payload.append('file', file);
  } else {
    payload.append('file', file, 'slide_sample.jpg');
  }
  return payload;
}

async function executePredictRequest(
  baseUrl: string,
  target: BackendTarget,
  file: File | Blob,
  modelType: ModelType,
  callerSignal?: AbortSignal,
  timeoutMs: number = API_TIMEOUTS.prediction
): Promise<PredictionResponse> {
  const abortContext = createRequestAbortContext(timeoutMs, callerSignal);
  const url = `${baseUrl}/predict?model_type=${encodeURIComponent(modelType)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: createPredictionPayload(file),
      signal: abortContext.signal,
    });

    if (!response.ok) {
      const fallback = `Inference failed on ${BACKEND_LABELS[target]} with status ${response.status}.`;
      const detail = await readApiErrorDetail(response, fallback);
      throw new ApiClientError(detail, response.status, detail);
    }

    const prediction: PredictionResponse = await response.json();
    return { ...prediction, served_by: target };
  } catch (error: unknown) {
    if (error instanceof ApiClientError) throw error;

    const wasAborted =
      abortContext.timedOut() ||
      abortContext.signal.aborted ||
      (error instanceof Error && error.name === 'AbortError');

    if (wasAborted) {
      throw new ApiClientError(
        'Inference request timed out. If the server is starting up, please retry in a moment.',
        408,
        'Request timeout exceeded.'
      );
    }

    const detail = error instanceof Error ? error.message : 'Network error';
    throw new ApiClientError(
      `Connection failed on ${BACKEND_LABELS[target]}.`,
      undefined,
      detail
    );
  } finally {
    abortContext.cleanup();
  }
}

export async function predictImage(
  file: File | Blob,
  modelType: ModelType = 'triage',
  callerSignal?: AbortSignal,
  timeoutMs: number = API_TIMEOUTS.prediction
): Promise<PredictionResponse> {
  const activeBackend = await resolveBackend();

  try {
    return await executePredictRequest(
      activeBackend.baseUrl,
      activeBackend.target,
      file,
      modelType,
      callerSignal,
      timeoutMs
    );
  } catch (initialError: unknown) {
    if (!isRetryableApiError(initialError)) throw initialError;

    const alternate = getBackendResolution(getAlternateTarget(activeBackend.target));
    setResolutionCache(alternate);

    try {
      return await executePredictRequest(
        alternate.baseUrl,
        alternate.target,
        file,
        modelType,
        callerSignal,
        timeoutMs
      );
    } catch {
      throw initialError;
    }
  }
}
