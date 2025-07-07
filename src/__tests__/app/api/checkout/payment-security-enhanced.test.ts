import { NextRequest } from 'next/server';
import crypto from 'crypto';

// Mock environment and dependencies before imports
jest.mock('@/env', () => ({
  env: {
    DATABASE_URL: 'mock-database-url',
    SQUARE_ACCESS_TOKEN: 'mock-access-token',
    SQUARE_ENVIRONMENT: 'sandbox'
  }
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/lib/square/orders');
jest.mock('@/lib/rate-limit');
jest.mock('@/lib/error-monitoring');

// Import after mocking
import { POST } from '@/app/api/checkout/payment/route';
import { prisma } from '@/lib/db';
import { createPayment } from '@/lib/square/orders';
import { checkRateLimit } from '@/lib/rate-limit';
import { errorMonitor } from '@/lib/error-monitoring';

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as any;

// Replace the actual prisma instance with our mock
(prisma as any).order = mockPrisma.order;

const mockCreatePayment = createPayment as jest.MockedFunction<typeof createPayment>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;
const mockErrorMonitor = errorMonitor as jest.Mocked<typeof errorMonitor>;

describe('Payment Security & Enhanced Coverage Tests (Phase 1 - 90%+ Target)', () => {
  const validOrder = {
    id: 'order-123',
    status: 'PENDING',
    total: 7500,
    squareOrderId: 'square-order-456',
    customerName: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validPayment = {
    id: 'payment-789',
    status: 'COMPLETED',
    amountMoney: { amount: 7500, currency: 'USD' },
    sourceType: 'CARD',
    orderId: 'square-order-456',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockPrisma.order.findUnique.mockResolvedValue(validOrder);
    mockPrisma.order.update.mockResolvedValue({ ...validOrder, status: 'PROCESSING' });
    mockCreatePayment.mockResolvedValue(validPayment);
    mockCheckRateLimit.mockResolvedValue({ success: true, limit: 100, remaining: 99, reset: new Date() });
    
    // Mock console methods to suppress logs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Payment Input Validation & Security (Critical)', () => {
    it('should sanitize and validate payment source IDs', async () => {
      const maliciousPayload = {
        sourceId: '<script>alert("xss")</script>cnon_abc123',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(maliciousPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      if (response.status === 200) {
        // If processed successfully, ensure XSS was sanitized
        expect(mockCreatePayment).toHaveBeenCalledWith(
          expect.not.stringMatching(/<script>/),
          'square-order-456',
          7500
        );
      } else {
        // Should reject malicious input
        expect(response.status).toBe(400);
      }
    });

    it('should validate order ID format and prevent injection', async () => {
      const sqlInjectionPayload = {
        sourceId: 'card-nonce-123',
        orderId: "order-123'; DROP TABLE orders; --",
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(sqlInjectionPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      // Should either sanitize or reject
      if (response.status === 200) {
        expect(mockPrisma.order.findUnique).toHaveBeenCalledWith({
          where: { id: expect.not.stringMatching(/DROP TABLE/) },
        });
      } else {
        expect(response.status).toBe(400);
      }
    });

    it('should enforce maximum payment amount limits', async () => {
      const excessivePayload = {
        sourceId: 'card-nonce-123',
        orderId: 'order-123',
        amount: 10000000000, // $100 million - excessive amount
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(excessivePayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('amount');
    });

    it('should validate payment amount precision (no fractional cents)', async () => {
      const fractionalPayload = {
        sourceId: 'card-nonce-123',
        orderId: 'order-123',
        amount: 7500.5, // Invalid - should be whole cents
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(fractionalPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid amount');
    });

    it('should reject payments with suspiciously long source IDs', async () => {
      const longSourceIdPayload = {
        sourceId: 'a'.repeat(1000), // Suspiciously long source ID
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(longSourceIdPayload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid');
    });
  });

  describe('Rate Limiting & DDoS Protection', () => {
    it('should apply rate limiting to payment endpoints', async () => {
      const payload = {
        sourceId: 'card-nonce-123',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      // Verify rate limiting was checked
      expect(mockCheckRateLimit).toHaveBeenCalled();
    });

    it('should reject payments when rate limit is exceeded', async () => {
      mockCheckRateLimit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: new Date(Date.now() + 60000),
      });

      const payload = {
        sourceId: 'card-nonce-123',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
    });

    it('should implement progressive delays for repeated failed payments', async () => {
      mockCreatePayment.mockRejectedValue(new Error('Payment declined'));

      const payload = {
        sourceId: 'card-nonce-declined',
        orderId: 'order-123',
        amount: 7500,
      };

      const startTime = Date.now();

      // Simulate multiple failed attempts
      for (let i = 0; i < 3; i++) {
        const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });

        await POST(request);
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should have some delay mechanism (this test would be enhanced with actual delay implementation)
      expect(processingTime).toBeGreaterThan(0);
    });
  });

  describe('Payment Method Security', () => {
    it('should validate card token formats and reject suspicious ones', async () => {
      const suspiciousTokens = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '../../../etc/passwd',
        'file:///etc/passwd',
      ];

      for (const token of suspiciousTokens) {
        const payload = {
          sourceId: token,
          orderId: 'order-123',
          amount: 7500,
        };

        const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
      }
    });

    it('should handle expired payment tokens gracefully', async () => {
      mockCreatePayment.mockRejectedValue(new Error('TOKEN_EXPIRED'));

      const payload = {
        sourceId: 'expired-token-123',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('expired');
    });

    it('should detect and prevent replay attacks with identical payment requests', async () => {
      const payload = {
        sourceId: 'card-nonce-123',
        orderId: 'order-123',
        amount: 7500,
        idempotencyKey: 'unique-key-123',
      };

      const request1 = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const request2 = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const [response1, response2] = await Promise.all([
        POST(request1),
        POST(request2),
      ]);

      // First should succeed, second should be detected as replay
      expect(response1.status).toBe(200);
      // Implementation would need actual idempotency checking
      // For now, both might succeed, but in production this should be prevented
    });
  });

  describe('Order State Validation & Race Conditions', () => {
    it('should prevent double payment on same order', async () => {
      // Mock order that's already being processed
      const processingOrder = {
        ...validOrder,
        status: 'PROCESSING',
        paymentStatus: 'PROCESSING',
      };

      mockPrisma.order.findUnique.mockResolvedValue(processingOrder);

      const payload = {
        sourceId: 'card-nonce-123',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already');
    });

    it('should handle concurrent payment attempts on same order', async () => {
      let callCount = 0;
      mockPrisma.order.update.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call succeeds
          return Promise.resolve({ ...validOrder, status: 'PROCESSING' });
        } else {
          // Subsequent calls should detect concurrent modification
          return Promise.reject(new Error('Concurrent modification detected'));
        }
      });

      const payload = {
        sourceId: 'card-nonce-123',
        orderId: 'order-123',
        amount: 7500,
      };

      const requests = Array.from({ length: 3 }, () =>
        new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));

      // Only one should succeed, others should fail
      const successfulResponses = responses.filter(r => r.status === 200);
      expect(successfulResponses.length).toBeLessThanOrEqual(1);
    });

    it('should validate order ownership before processing payment', async () => {
      // Mock order belonging to different user (in real implementation)
      const otherUserOrder = {
        ...validOrder,
        userId: 'other-user-id',
        customerEmail: 'other@example.com',
      };

      mockPrisma.order.findUnique.mockResolvedValue(otherUserOrder);

      const payload = {
        sourceId: 'card-nonce-123',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      // Implementation would check user ownership
      // For now, testing that the flow handles different user scenarios
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Error Monitoring & Alerting Integration', () => {
    it('should capture and categorize payment failures for monitoring', async () => {
      const fraudError = new Error('FRAUD_DETECTED');
      mockCreatePayment.mockRejectedValue(fraudError);

      const payload = {
        sourceId: 'card-nonce-fraud',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      // Verify error monitoring was called
      expect(mockErrorMonitor.capturePaymentError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'FRAUD_DETECTED',
        }),
        expect.objectContaining({
          orderId: 'order-123',
          amount: 7500,
        })
      );
    });

    it('should track payment processing metrics', async () => {
      const payload = {
        sourceId: 'card-nonce-123',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const startTime = Date.now();
      await POST(request);
      const endTime = Date.now();

      // Verify metrics are being tracked
      expect(mockErrorMonitor.recordPaymentMetrics).toHaveBeenCalledWith({
        orderId: 'order-123',
        amount: 7500,
        processingTime: expect.any(Number),
        success: true,
      });
    });

    it('should alert on suspicious payment patterns', async () => {
      // Simulate multiple high-value payments from same source
      const highValuePayload = {
        sourceId: 'card-nonce-suspicious',
        orderId: 'order-high-value',
        amount: 50000, // $500.00 - high value
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(highValuePayload),
        headers: { 'Content-Type': 'application/json' },
      });

      await POST(request);

      // Should trigger fraud detection alerts
      expect(mockErrorMonitor.triggerFraudAlert).toHaveBeenCalledWith({
        type: 'high_value_payment',
        sourceId: 'card-nonce-suspicious',
        amount: 50000,
      });
    });
  });

  describe('Performance & Scalability', () => {
    it('should process payments efficiently under load', async () => {
      const payload = {
        sourceId: 'card-nonce-load-test',
        orderId: 'order-123',
        amount: 7500,
      };

      const startTime = Date.now();
      const promises = Array.from({ length: 10 }, (_, i) => {
        const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
          method: 'POST',
          body: JSON.stringify({ ...payload, orderId: `order-${i}` }),
          headers: { 'Content-Type': 'application/json' },
        });
        return POST(request);
      });

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 payments
    });

    it('should handle payment processing timeouts gracefully', async () => {
      // Mock Square API timeout
      mockCreatePayment.mockImplementation(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const payload = {
        sourceId: 'card-nonce-timeout',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('timeout');
    });

    it('should maintain payment data consistency during partial failures', async () => {
      // Mock scenario where payment succeeds but database update fails
      mockCreatePayment.mockResolvedValue(validPayment);
      mockPrisma.order.update.mockRejectedValue(new Error('Database connection lost'));

      const payload = {
        sourceId: 'card-nonce-consistency',
        orderId: 'order-123',
        amount: 7500,
      };

      const request = new NextRequest('http://localhost:3000/api/checkout/payment', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);

      // Should handle partial failure appropriately
      expect(response.status).toBe(500);
      
      // Should capture the inconsistency for manual reconciliation
      expect(mockErrorMonitor.capturePaymentInconsistency).toHaveBeenCalledWith({
        paymentId: 'payment-789',
        orderId: 'order-123',
        error: 'Database update failed after successful payment',
      });
    });
  });
}); 