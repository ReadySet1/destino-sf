/**
 * Shippo API Timeout Test Suite
 *
 * Tests timeout handling for Shippo shipping rate calculations.
 * Part of DES-60 Phase 3: Network & Timeout Resilience
 */

import { calculateShippingRates } from '@/lib/shipping/rate-calculation';
import { resilientShippingApi } from '@/lib/shipping/shippo-circuit-breaker';
import { TimeoutError } from '@/lib/utils/http-timeout';
import { CircuitState } from '@/lib/utils/circuit-breaker';

// Mock the Shippo client
jest.mock('@/lib/shippo/client', () => {
  const mockClient = {
    shipments: {
      create: jest.fn(),
    },
  };

  return {
    ShippoClientManager: {
      getInstance: jest.fn(() => mockClient),
    },
    mockClient, // Export for access in tests
  };
});

// Helper to get the mocked client
function getMockShippoClient() {
  const { ShippoClientManager } = require('@/lib/shippo/client');
  return ShippoClientManager.getInstance();
}

describe('Shippo API - Timeout Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateShippingRates', () => {
    const validParams = {
      fromAddress: {
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
      },
      toAddress: {
        street1: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'US',
      },
      parcel: {
        length: 10,
        width: 8,
        height: 6,
        distance_unit: 'in' as const,
        weight: 2,
        mass_unit: 'lb' as const,
      },
    };

    test('should successfully calculate rates within timeout', async () => {
      const mockClient = getMockShippoClient();
      mockClient.shipments.create.mockResolvedValue({
        rates: [
          {
            object_id: 'rate_123',
            amount: '10.50',
            currency: 'USD',
            provider: 'USPS',
            servicelevel: {
              name: 'Priority Mail',
              token: 'usps_priority',
            },
            estimated_days: 3,
          },
        ],
      });

      const result = await calculateShippingRates(validParams);

      expect(result.success).toBe(true);
      if (result.success && result.rates) {
        expect(result.rates).toHaveLength(1);
        expect(result.rates[0].amount).toBe('10.50');
        expect(result.rates[0].provider).toBe('USPS');
      }
    });

    test('should timeout if request exceeds configured timeout', async () => {
      const mockClient = getMockShippoClient();
      // Simulate a request that takes too long
      mockClient.shipments.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ rates: [] }), 100))
      );

      // Mock withTimeout to use a very short timeout for testing
      const { TimeoutError } = require('@/lib/utils/http-timeout');
      const mockWithTimeout = jest.spyOn(require('@/lib/utils/http-timeout'), 'withTimeout');
      mockWithTimeout.mockImplementation((promise, timeout, message, operation) => {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new TimeoutError(message || `Request timed out after ${timeout}ms`, timeout, operation)),
              10
            )
          ),
        ]);
      });

      const result = await calculateShippingRates(validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('timed out');
      }

      mockWithTimeout.mockRestore();
    });

    test('should include helpful context in timeout error message', async () => {
      const mockClient = getMockShippoClient();
      mockClient.shipments.create.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ rates: [] }), 100))
      );

      // Mock withTimeout to use a very short timeout for testing
      const { TimeoutError } = require('@/lib/utils/http-timeout');
      const mockWithTimeout = jest.spyOn(require('@/lib/utils/http-timeout'), 'withTimeout');
      mockWithTimeout.mockImplementation((promise, timeout, message, operation) => {
        const timeoutMs = 10; // Short timeout for test
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(new TimeoutError(message || `Request timed out after ${timeout}ms`, timeout, operation)),
              timeoutMs
            )
          ),
        ]);
      });

      const result = await calculateShippingRates(validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('timed out');
        expect(result.error).toContain('20000'); // 20 seconds timeout
      }

      mockWithTimeout.mockRestore();
    });
  });

  describe('Timeout Error Handling', () => {
    const validParams = {
      fromAddress: {
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94102',
        country: 'US',
      },
      toAddress: {
        street1: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip: '90001',
        country: 'US',
      },
      parcel: {
        length: 10,
        width: 8,
        height: 6,
        distance_unit: 'in' as const,
        weight: 2,
        mass_unit: 'lb' as const,
      },
    };

    test('should handle network errors gracefully', async () => {
      const mockClient = getMockShippoClient();
      mockClient.shipments.create.mockRejectedValue(
        new Error('Network error: Connection refused')
      );

      const result = await calculateShippingRates(validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Network error');
      }
    });

    test('should handle API errors gracefully', async () => {
      const mockClient = getMockShippoClient();
      mockClient.shipments.create.mockRejectedValue(new Error('Invalid API key'));

      const result = await calculateShippingRates(validParams);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid API key');
      }
    });
  });
});

describe('Shippo API - Circuit Breaker Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset circuit breaker
    resilientShippingApi.resetCircuit();
  });

  const validParams = {
    fromAddress: {
      street1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'US',
    },
    toAddress: {
      street1: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001',
      country: 'US',
    },
    parcel: {
      length: 10,
      width: 8,
      height: 6,
      distance_unit: 'in' as const,
      weight: 2,
      mass_unit: 'lb' as const,
    },
  };

  test('should track successful rate calculations', async () => {
    const mockClient = getMockShippoClient();
    mockClient.shipments.create.mockResolvedValue({
      rates: [
        {
          object_id: 'rate_123',
          amount: '10.50',
          currency: 'USD',
          provider: 'USPS',
          servicelevel: {
            name: 'Priority Mail',
            token: 'usps_priority',
          },
          estimated_days: 3,
        },
      ],
    });

    const result = await resilientShippingApi.calculateShippingRates(validParams);

    expect(result.success).toBe(true);

    const stats = resilientShippingApi.getCircuitStats();
    expect(stats.successes).toBeGreaterThanOrEqual(1);
    expect(stats.state).toBe(CircuitState.CLOSED);
  });

  test('should handle timeout errors with circuit breaker wrapper', async () => {
    const mockClient = getMockShippoClient();

    // Mock withTimeout to use a very short timeout for testing
    const { TimeoutError } = require('@/lib/utils/http-timeout');
    const mockWithTimeout = jest.spyOn(require('@/lib/utils/http-timeout'), 'withTimeout');
    mockWithTimeout.mockImplementation((promise, timeout, message, operation) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new TimeoutError(message || `Request timed out after ${timeout}ms`, timeout, operation)),
            10
          )
        ),
      ]);
    });

    mockClient.shipments.create.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ rates: [] }), 100))
    );

    const result = await resilientShippingApi.calculateShippingRates(validParams);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('timed out');
    }

    mockWithTimeout.mockRestore();
  }, 15000);

  test('should not count validation errors as circuit failures', async () => {
    const mockClient = getMockShippoClient();

    // Simulate validation error responses
    for (let i = 0; i < 3; i++) {
      mockClient.shipments.create.mockRejectedValue(new Error('invalid address'));

      await resilientShippingApi.calculateShippingRates(validParams);
    }

    // Circuit should remain closed (validation errors don't count)
    const stats = resilientShippingApi.getCircuitStats();
    expect(stats.state).toBe(CircuitState.CLOSED);
    expect(stats.failures).toBe(0);
  });
});
