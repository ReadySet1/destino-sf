'use client';

import { useState, useCallback } from 'react';
import { 
  type AvailabilityRule, 
  type AvailabilityEvaluation,
  type AvailabilityApiResponse
} from '@/types/availability';
import { logger } from '@/utils/logger';

interface UseAvailabilityPreviewReturn {
  preview: AvailabilityEvaluation | null;
  isLoading: boolean;
  error: string | null;
  previewRules: (productId: string, rules: AvailabilityRule[], previewDate?: Date) => Promise<void>;
  clearPreview: () => void;
  clearError: () => void;
}

/**
 * Hook for previewing availability changes without saving
 */
export function useAvailabilityPreview(): UseAvailabilityPreviewReturn {
  const [preview, setPreview] = useState<AvailabilityEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewRules = useCallback(async (
    productId: string, 
    rules: AvailabilityRule[], 
    previewDate?: Date
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/availability/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rules,
          previewDate: previewDate?.toISOString()
        })
      });

      const data: AvailabilityApiResponse<AvailabilityEvaluation> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to preview availability');
      }

      setPreview(data.data || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Preview failed';
      setError(errorMessage);
      logger.error('Error previewing availability', {
        productId,
        rulesCount: rules.length,
        error: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    preview,
    isLoading,
    error,
    previewRules,
    clearPreview,
    clearError
  };
}
