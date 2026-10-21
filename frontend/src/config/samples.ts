export interface ReferenceSample {
  filename: string;
  label: string;
  family: string;
}

export const REFERENCE_SAMPLES: ReferenceSample[] = [
  { filename: 'sample_nilm.jpg', label: 'NILM', family: 'Normal' },
  { filename: 'sample_ascus.jpg', label: 'ASC-US', family: 'Atypical' },
  { filename: 'sample_lsil.jpg', label: 'LSIL', family: 'Low grade' },
  { filename: 'sample_hsil.jpg', label: 'HSIL', family: 'High grade' },
  { filename: 'sample_scc.jpg', label: 'SCC', family: 'Malignant' },
];
