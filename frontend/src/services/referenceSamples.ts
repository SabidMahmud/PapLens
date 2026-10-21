export async function fetchReferenceSample(filename: string): Promise<File> {
  const response = await fetch(`/samples/${filename}`);
  if (!response.ok) throw new Error('Sample could not be loaded.');

  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}
