export function displayClassName(value: string): string {
  return value.replaceAll('_', ' ');
}

export function formatPercentage(value: number): string {
  return (value * 100).toFixed(1);
}
