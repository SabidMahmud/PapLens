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

export function isRetryableApiError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && (!error.status || error.status >= 500);
}

export async function readApiErrorDetail(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = await response.json();
    if (body?.detail) {
      return typeof body.detail === 'string'
        ? body.detail
        : JSON.stringify(body.detail);
    }
  } catch {
    // The backend may return an empty or non-JSON error response.
  }
  return response.statusText || fallback;
}
