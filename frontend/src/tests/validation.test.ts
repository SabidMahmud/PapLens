import { describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MB,
  validateImageFile,
} from '@/lib/validation';

function mockFile(size: number, name = 'slide.jpg', type = 'image/jpeg'): File {
  return { size, name, type } as File;
}

describe('image upload validation', () => {
  it('uses the 50 MiB upload limit', () => {
    expect(MAX_UPLOAD_MB).toBe(50);
    expect(MAX_UPLOAD_BYTES).toBe(50 * 1024 * 1024);
  });

  it('accepts a file exactly at the upload limit', () => {
    expect(validateImageFile(mockFile(MAX_UPLOAD_BYTES)).isValid).toBe(true);
  });

  it('rejects a file above the upload limit', () => {
    const result = validateImageFile(mockFile(MAX_UPLOAD_BYTES + 1));
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('50 MB');
  });
});
