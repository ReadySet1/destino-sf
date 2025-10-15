'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  type AvailabilityRule,
  type AvailabilityEvaluation,
  type AvailabilityApiResponse,
  AvailabilityState,
} from '@/types/availability';
import { logger } from '@/utils/logger';

interface UseAvailabilityOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseAvailabilityReturn {
  // Current state
  evaluation: AvailabilityEvaluation | null;
  rules: AvailabilityRule[];
  isLoading: boolean;
  error: string | null;

  // Convenience getters
  currentState: AvailabilityState;
  isAvailable: boolean;
  isPreOrder: boolean;
  isViewOnly: boolean;
  isHidden: boolean;
  preOrderSettings: any;
  viewOnlySettings: any;
  nextStateChange: any;

  // Actions
  refresh: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for managing product availability state
 */
export function useAvailability(
  productId: string,
  options: UseAvailabilityOptions = {}
): UseAvailabilityReturn {
  const { autoRefresh = false, refreshInterval = 30000 } = options;

  const [evaluation, setEvaluation] = useState<AvailabilityEvaluation | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!productId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch rules
      const rulesResponse = await fetch(`/api/availability?productId=${productId}`);
      const rulesData: AvailabilityApiResponse<AvailabilityRule[]> = await rulesResponse.json();

      if (!rulesData.success) {
        throw new Error(rulesData.error || 'Failed to fetch rules');
      }

      setRules(rulesData.data || []);

      // Evaluate current availability
      const evaluationResponse = await fetch('/api/availability/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          rules: rulesData.data || [],
        }),
      });

      const evaluationData: AvailabilityApiResponse<AvailabilityEvaluation> =
        await evaluationResponse.json();

      if (!evaluationData.success) {
        throw new Error(evaluationData.error || 'Failed to evaluate availability');
      }

      setEvaluation(evaluationData.data || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Error fetching availability', {
        productId,
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh || !productId) return;

    const interval = setInterval(fetchAvailability, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAvailability, productId]);

  // Convenience getters
  const currentState = evaluation?.currentState || AvailabilityState.AVAILABLE;
  const isAvailable = currentState === AvailabilityState.AVAILABLE;
  const isPreOrder = currentState === AvailabilityState.PRE_ORDER;
  const isViewOnly = currentState === AvailabilityState.VIEW_ONLY;
  const isHidden = currentState === AvailabilityState.HIDDEN;

  // Get settings from applied rules
  const appliedRule = evaluation?.appliedRules?.[0]; // Highest priority rule
  const preOrderSettings = appliedRule?.preOrderSettings || null;
  const viewOnlySettings = appliedRule?.viewOnlySettings || null;
  const nextStateChange = evaluation?.nextStateChange || null;

  return {
    evaluation,
    rules,
    isLoading,
    error,
    currentState,
    isAvailable,
    isPreOrder,
    isViewOnly,
    isHidden,
    preOrderSettings,
    viewOnlySettings,
    nextStateChange,
    refresh: fetchAvailability,
    clearError,
  };
}

/**
 * Hook for managing multiple products' availability
 */
export function useMultipleAvailability(productIds: string[]): {
  availabilityMap: Map<string, UseAvailabilityReturn>;
  isLoading: boolean;
  refresh: () => Promise<void>;
} {
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, UseAvailabilityReturn>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchMultipleAvailability = useCallback(async () => {
    if (!productIds.length) return;

    try {
      setIsLoading(true);

      // Fetch rules for all products
      const rulesResponse = await fetch(`/api/availability?productIds=${productIds.join(',')}`);
      const rulesData: AvailabilityApiResponse<AvailabilityRule[]> = await rulesResponse.json();

      if (!rulesData.success) {
        throw new Error(rulesData.error || 'Failed to fetch rules');
      }

      // Group rules by product
      const rulesByProduct = new Map<string, AvailabilityRule[]>();
      productIds.forEach(id => rulesByProduct.set(id, []));

      rulesData.data?.forEach(rule => {
        const productRules = rulesByProduct.get(rule.productId) || [];
        productRules.push(rule);
        rulesByProduct.set(rule.productId, productRules);
      });

      // Evaluate each product
      const newAvailabilityMap = new Map<string, UseAvailabilityReturn>();

      for (const [productId, rules] of rulesByProduct) {
        try {
          const evaluationResponse = await fetch('/api/availability/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, rules }),
          });

          const evaluationData: AvailabilityApiResponse<AvailabilityEvaluation> =
            await evaluationResponse.json();

          if (evaluationData.success && evaluationData.data) {
            const evaluation = evaluationData.data;
            const currentState = evaluation.currentState;
            const appliedRule = evaluation.appliedRules?.[0];

            newAvailabilityMap.set(productId, {
              evaluation,
              rules,
              isLoading: false,
              error: null,
              currentState,
              isAvailable: currentState === AvailabilityState.AVAILABLE,
              isPreOrder: currentState === AvailabilityState.PRE_ORDER,
              isViewOnly: currentState === AvailabilityState.VIEW_ONLY,
              isHidden: currentState === AvailabilityState.HIDDEN,
              preOrderSettings: appliedRule?.preOrderSettings || null,
              viewOnlySettings: appliedRule?.viewOnlySettings || null,
              nextStateChange: evaluation.nextStateChange || null,
              refresh: async () => {},
              clearError: () => {},
            });
          }
        } catch (err) {
          logger.error('Error evaluating product availability', {
            productId,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      setAvailabilityMap(newAvailabilityMap);
    } catch (err) {
      logger.error('Error fetching multiple availability', {
        productCount: productIds.length,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [productIds]);

  useEffect(() => {
    fetchMultipleAvailability();
  }, [fetchMultipleAvailability]);

  return {
    availabilityMap,
    isLoading,
    refresh: fetchMultipleAvailability,
  };
}
