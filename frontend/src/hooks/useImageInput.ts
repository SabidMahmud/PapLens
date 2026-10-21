'use client';

import { DragEvent, useCallback, useRef, useState } from 'react';
import { validateImageFile } from '@/lib/validation';

interface UseImageInputOptions {
  isLoading: boolean;
  onFileChange: (file: File) => void;
}

export function useImageInput({ isLoading, onFileChange }: UseImageInputOptions) {
  const [dragActive, setDragActive] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectFile = useCallback((file: File) => {
    if (isLoading) return;
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setClientError(validation.error || 'The selected file cannot be used.');
      return;
    }
    setClientError(null);
    onFileChange(file);
  }, [isLoading, onFileChange]);

  const handleDrag = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;
    if (
      event.type === 'dragleave' &&
      event.currentTarget.contains(event.relatedTarget as Node)
    ) return;
    setDragActive(event.type === 'dragenter' || event.type === 'dragover');
  }, [isLoading]);

  const handleDrop = useCallback((event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) selectFile(file);
  }, [selectFile]);

  return {
    dragActive,
    clientError,
    fileInputRef,
    selectFile,
    handleDrag,
    handleDrop,
  };
}
