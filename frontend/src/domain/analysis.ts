export type ModelType = 'triage' | 'severity';
export type EvidenceViewMode = 'original' | 'overlay' | 'compare';

export interface ImageBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DiagnosticPatchInfo {
  rank: number;
  attention_score: number;
  raw_attention: number;
  box: ImageBox;
  box_display: ImageBox;
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
  overlay_base64: string;
  heatmap_only_base64: string;
  original_display_base64: string;
  display_width: number;
  display_height: number;
  top_patches: DiagnosticPatchInfo[];
  served_by?: import('./backend').BackendTarget;
}
