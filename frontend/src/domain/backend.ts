export type BackendTarget = 'primary' | 'fallback';

export interface BackendResolution {
  target: BackendTarget;
  baseUrl: string;
  label: string;
}

export interface HealthResponse {
  status: string;
  models_loaded: boolean;
  available_models: string[];
  device: string;
  torch_threads: number;
  version: string;
  served_by?: BackendTarget;
}

export interface ApiError {
  error: string;
  detail: string;
  status?: number;
}
