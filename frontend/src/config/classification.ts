export interface ClassificationTheme {
  accent: string;
  tint: string;
}

const THEMES = {
  normal: { accent: 'var(--teal)', tint: 'var(--teal-soft)' },
  intermediate: { accent: '#a66d1d', tint: 'var(--amber-soft)' },
  highRisk: { accent: 'var(--danger)', tint: 'var(--danger-soft)' },
} as const;

export function getClassificationTheme(predictedClass: string): ClassificationTheme {
  if (predictedClass === 'Normal') return THEMES.normal;
  if (predictedClass === 'Low_Grade') return THEMES.intermediate;
  return THEMES.highRisk;
}
