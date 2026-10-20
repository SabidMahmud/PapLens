/**
 * Client-side file and format validation.
 */

export const MAX_UPLOAD_MB = 50;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ValidationResult {
  if (!file) {
    return { isValid: false, error: 'No file provided.' };
  }

  // Size validation
  if (file.size > MAX_UPLOAD_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${sizeInMb} MB) exceeds maximum allowed limit of ${MAX_UPLOAD_MB} MB.`,
    };
  }

  if (file.size === 0) {
    return { isValid: false, error: 'Uploaded file is empty.' };
  }

  // Type / Extension validation
  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type === '';

  if (!hasValidExt && !hasValidMime) {
    return {
      isValid: false,
      error: 'Unsupported file format. Please upload a high-resolution JPEG or PNG microscopy image.',
    };
  }

  return { isValid: true };
}
