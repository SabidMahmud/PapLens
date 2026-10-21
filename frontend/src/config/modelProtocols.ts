import { ModelType } from '@/domain/analysis';

export interface ModelProtocol {
  value: ModelType;
  index: string;
  title: string;
  summary: string;
  output: string;
  fullLabel: string;
  resultLabel: string;
  classCountLabel: string;
}

export const MODEL_PROTOCOLS: Record<ModelType, ModelProtocol> = {
  triage: {
    value: 'triage',
    index: 'A',
    title: 'Triage',
    summary: 'Normal vs abnormal',
    output: 'Two-class screening model',
    fullLabel: '2-class clinical triage',
    resultLabel: '2-class triage',
    classCountLabel: '2 class',
  },
  severity: {
    value: 'severity',
    index: 'B',
    title: 'Severity grading',
    summary: 'Normal vs low vs high grade',
    output: 'Three-level lesion stratification',
    fullLabel: '3-class severity grading',
    resultLabel: '3-class severity grading',
    classCountLabel: '3 class',
  },
};

export const MODEL_PROTOCOL_LIST = Object.values(MODEL_PROTOCOLS);

export function getModelProtocol(modelType: ModelType): ModelProtocol {
  return MODEL_PROTOCOLS[modelType];
}
