import { HealthResponse } from '@/domain/backend';
import { resolveBackend } from './backendResolution';
import { ApiClientError } from './errors';

export async function checkHealth(
  signal?: AbortSignal,
  forceRecheck: boolean = false
): Promise<HealthResponse> {
  const resolution = await resolveBackend(forceRecheck);

  try {
    const response = await fetch(`${resolution.baseUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal,
    });

    if (!response.ok) {
      throw new ApiClientError(
        `Server returned status ${response.status}`,
        response.status,
        `Health check failed on ${resolution.label} with status code ${response.status}.`
      );
    }

    const health: HealthResponse = await response.json();
    return { ...health, served_by: resolution.target };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(
        'Health check aborted.',
        undefined,
        'Health check request was cancelled.'
      );
    }
    if (error instanceof ApiClientError) throw error;

    const message = error instanceof Error
      ? error.message
      : 'Network connection failed.';
    throw new ApiClientError(
      `Cannot connect to PapLens model server on ${resolution.label}.`,
      undefined,
      message
    );
  }
}
