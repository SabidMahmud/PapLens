/**
 * Compatibility exports for existing consumers. New code should import from
 * the domain module that owns the type.
 */
export type {
  DiagnosticPatchInfo,
  EvidenceViewMode,
  ImageBox,
  ModelType,
  PredictionResponse,
} from '@/domain/analysis';
export type {
  ApiError,
  BackendResolution,
  BackendTarget,
  HealthResponse,
} from '@/domain/backend';
