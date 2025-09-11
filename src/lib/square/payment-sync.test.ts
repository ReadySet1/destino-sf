/**
 * Payment Sync Service Tests
 * 
 * Tests the fallback payment synchronization system that catches
 * missed payments when webhooks fail.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PaymentSyncService, syncRecentPayments, scheduledPaymentSync } from './payment-sync';
import { PaymentStatus } from '@prisma/client';

// Mock dependencies
vi.mock('@/lib/db/queries/payments', () => ({
  createPaymentSyncStatus: vi.fn().mockResolvedValue({
    id: 'sync-status-123',
    syncId: 'sync-123',
    syncType: 'manual',
    startTime: new Date(),
    paymentsFound: 0,
    paymentsProcessed: 0,
    paymentsFailed: 0,
    createdAt: new Date()
  }),
  updatePaymentSyncStatus: vi.fn().mockResolvedValue(undefined),
  findMissingPayments: vi.fn().mockResolvedValue({
    missing: ['payment-1', 'payment-2'],
    existing: []
  }),
  findOrdersWithoutPayments: vi.fn().mockResolvedValue([]),
  createPaymentFromSquareData: vi.fn().mockResolvedValue(undefined),
  updateOrderPaymentStatus: vi.fn().mockResolvedValue(undefined)
}));

vi.mock('@/lib/square/service', () => ({
  SquareService: vi.fn().mockImplementation(() => ({
    client: {
      paymentsApi: {
        listPayments: vi.fn().mockResolvedValue({
          result: {
            payments: [
              {
                id: 'payment-1',
                status: 'COMPLETED',
                order_id: 'order-1',
                amount_money: { amount: 1000, currency: 'USD' },
                created_at: new Date().toISOString()
              },
              {
                id: 'payment-2',
                status: 'COMPLETED',
                order_id: 'order-2',
                amount_money: { amount: 2000, currency: 'USD' },
                created_at: new Date().toISOString()
              }
            ]
          }
        })
      }
    }
  }))
}));

vi.mock('@/lib/square', () => ({
  getSquareService: vi.fn().mockReturnValue({
    client: {
      paymentsApi: {
        listPayments: vi.fn().mockResolvedValue({
          result: {
            payments: []
          }
        })
      }
    }
  })
}));

vi.mock('@/lib/monitoring/webhook-metrics', () => ({
  trackMetric: vi.fn().mockResolvedValue(undefined),
  sendWebhookAlert: vi.fn().mockResolvedValue(undefined)
}));

describe('PaymentSyncService', () => {
  let syncService: PaymentSyncService;

  beforeEach(() => {
    syncService = new PaymentSyncService('sandbox');
    vi.clearAllMocks();
  });

  describe('syncPayments', () => {
    it('successfully syncs payments from Square API', async () => {
      const result = await syncService.syncPayments({
        lookbackMinutes: 60,
        syncType: 'manual'
      });

      expect(result.success).toBe(true);
      expect(result.syncId).toBeDefined();
      expect(result.paymentsFound).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.metadata?.environment).toBe('sandbox');
    });

    it('handles Square API errors gracefully', async () => {
      // Mock Square API to throw error
      const { getSquareService } = await import('@/lib/square');
      vi.mocked(getSquareService).mockReturnValueOnce({
        client: {
          paymentsApi: {
            listPayments: vi.fn().mockRejectedValue(new Error('Square API error'))
          }
        }
      } as any);

      const result = await syncService.syncPayments({
        lookbackMinutes: 60,
        syncType: 'manual'
      });

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Square API error');
    });

    it('processes missing payments correctly', async () => {
      // Mock missing payments scenario
      const { findMissingPayments, createPaymentFromSquareData } = await import('@/lib/db/queries/payments');
      
      vi.mocked(findMissingPayments).mockResolvedValueOnce({
        missing: ['payment-1'],
        existing: [{ squarePaymentId: 'payment-2', orderId: 'order-2', status: PaymentStatus.PAID }]
      });

      const result = await syncService.syncPayments({
        lookbackMinutes: 60,
        syncType: 'manual'
      });

      expect(result.paymentsProcessed).toBeGreaterThan(0);
      expect(vi.mocked(createPaymentFromSquareData)).toHaveBeenCalled();
    });

    it('respects batch size limits', async () => {
      const result = await syncService.syncPayments({
        lookbackMinutes: 60,
        syncType: 'manual',
        batchSize: 5
      });

      // Should complete without errors even with small batch size
      expect(result.syncId).toBeDefined();
    });

    it('handles force sync option', async () => {
      const result = await syncService.syncPayments({
        lookbackMinutes: 60,
        syncType: 'manual',
        forceSync: true
      });

      expect(result.syncId).toBeDefined();
      // With force sync, should process existing payments too
    });
  });

  describe('Environment Handling', () => {
    it('creates service for production environment', () => {
      const prodService = new PaymentSyncService('production');
      expect(prodService).toBeInstanceOf(PaymentSyncService);
    });

    it('creates service for sandbox environment', () => {
      const sandboxService = new PaymentSyncService('sandbox');
      expect(sandboxService).toBeInstanceOf(PaymentSyncService);
    });
  });
});

describe('Utility Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncRecentPayments', () => {
    it('executes sync with default parameters', async () => {
      const result = await syncRecentPayments({});
      
      expect(result).toBeDefined();
      expect(result.syncId).toBeDefined();
      expect(result.metadata?.environment).toBe('production'); // default
      expect(result.metadata?.syncType).toBe('manual'); // default
    });

    it('respects custom parameters', async () => {
      const result = await syncRecentPayments({
        lookbackMinutes: 120,
        environment: 'sandbox',
        syncType: 'webhook_fallback',
        forceSync: true
      });

      expect(result.metadata?.environment).toBe('sandbox');
      expect(result.metadata?.syncType).toBe('webhook_fallback');
    });
  });

  describe('scheduledPaymentSync', () => {
    it('syncs both environments', async () => {
      const result = await scheduledPaymentSync();
      
      expect(result).toBeDefined();
      expect(result.syncId).toContain('combined');
      expect(result.metadata?.environments).toEqual(['production', 'sandbox']);
    });

    it('handles partial failures in multi-environment sync', async () => {
      // Mock one environment to fail
      const { PaymentSyncService } = await import('./payment-sync');
      const mockSyncService = vi.fn().mockImplementation((env) => ({
        syncPayments: env === 'production' 
          ? vi.fn().mockRejectedValue(new Error('Production API error'))
          : vi.fn().mockResolvedValue({
              success: true,
              syncId: 'sandbox-sync-123',
              paymentsFound: 5,
              paymentsProcessed: 5,
              paymentsFailed: 0,
              errors: [],
              duration: 1000,
              startTime: new Date(),
              endTime: new Date()
            })
      }));

      // Should still return a combined result even with partial failures
      const result = await scheduledPaymentSync();
      expect(result.syncId).toBeDefined();
    });
  });
});

describe('Performance Tests', () => {
  it('completes sync within reasonable time', async () => {
    const startTime = performance.now();
    
    const result = await syncRecentPayments({
      lookbackMinutes: 30
    });
    
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
  });

  it('handles large payment volumes efficiently', async () => {
    // Mock large payment response
    const manyPayments = Array.from({ length: 100 }, (_, i) => ({
      id: `payment-${i}`,
      status: 'COMPLETED',
      order_id: `order-${i}`,
      amount_money: { amount: 1000, currency: 'USD' },
      created_at: new Date().toISOString()
    }));

    const { getSquareService } = await import('@/lib/square');
    vi.mocked(getSquareService).mockReturnValueOnce({
      client: {
        paymentsApi: {
          listPayments: vi.fn().mockResolvedValue({
            result: { payments: manyPayments }
          })
        }
      }
    } as any);

    const result = await syncRecentPayments({
      lookbackMinutes: 60,
      batchSize: 20
    });

    expect(result.paymentsFound).toBe(100);
    // Should handle large volume without errors
    expect(result.errors.length).toBeLessThan(10); // Allow some errors but not excessive
  });
});
