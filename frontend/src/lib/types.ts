/**
 * TypeScript type definitions mirroring backend FastAPI schemas and client failover state.
 */

export type ModelType = 'triage' | 'severity';

export type BackendTarget = 'primary' | 'fallback';

export interface BackendResolution {
  target: BackendTarget;
  baseUrl: string;
  label: string; // "k3s cluster" or "Hugging Face Spaces (fallback)"
}

export interface DiagnosticPatchInfo {
  rank: number;
  attention_score: number;
  raw_attention: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  box_display: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PredictionResponse {
  model_type: ModelType;
  predicted_class: string;
  display_name: string;
  severity_level: 'success' | 'warning' | 'danger' | 'primary';
  confidence: number;
  probabilities: Record<string, number>;
  classes: string[];
  num_patches: number;
  inference_time_ms: number;

  // Visualizations (base64 data URIs)
  overlay_base64: string;
  heatmap_only_base64: string;
  original_display_base64: string;
  display_width: number;
  display_height: number;
  top_patches: DiagnosticPatchInfo[];

  // Failover resolution telemetry
  served_by?: BackendTarget;
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
