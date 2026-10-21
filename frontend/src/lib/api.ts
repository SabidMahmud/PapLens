/**
 * Stable public facade for backend communication.
 * Implementations live under services/api so callers depend on one small API.
 */
export {
  getActiveBackendLabel,
  getActiveBackendTarget,
  resetBackendResolution,
  resolveBackend,
  setResolutionCache,
} from '@/services/api/backendResolution';
export {
  BACKEND_LABELS,
  FALLBACK_API_URL,
  PRIMARY_API_URL,
} from '@/services/api/config';
export { ApiClientError } from '@/services/api/errors';
export { checkHealth } from '@/services/api/health';
export { predictImage } from '@/services/api/prediction';
