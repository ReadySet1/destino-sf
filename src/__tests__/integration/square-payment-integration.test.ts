import * as Square from 'square';
import { createPayment, processGiftCardPayment, handlePaymentWebhook } from '@/lib/square/payments-api';
import { v4 as uuidv4 } from 'uuid';

// Mock Square SDK
jest.mock('square');
jest.mock('@/lib/db');
jest.mock('@/lib/email');

const MockSquare = Square as jest.Mocked<typeof Square>;

describe('Square Payment Integration - E2E Testing', () => {
  let mockSquareClient: any;
  let mockPaymentsApi: any;
  let mockGiftCardsApi: any;
  let mockCustomersApi: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Square API responses
    mockPaymentsApi = {
      createPayment: jest.fn(),
      getPayment: jest.fn(),
      cancelPayment: jest.fn(),
      completePayment: jest.fn(),
    };

    mockGiftCardsApi = {
      createGiftCard: jest.fn(),
      retrieveGiftCardFromNonce: jest.fn(),
      linkCustomerToGiftCard: jest.fn(),
    };

    mockCustomersApi = {
      createCustomer: jest.fn(),
      searchCustomers: jest.fn(),
      updateCustomer: jest.fn(),
    };

    mockSquareClient = {
      paymentsApi: mockPaymentsApi,
      giftCardsApi: mockGiftCardsApi,
      customersApi: mockCustomersApi,
    };

    MockSquare.SquareClient = jest.fn().mockImplementation(() => mockSquareClient);

    // Set up environment
    process.env.SQUARE_ACCESS_TOKEN = 'test-access-token';
    process.env.SQUARE_APPLICATION_ID = 'test-app-id';
    process.env.SQUARE_ENVIRONMENT = 'sandbox';
  });

  afterEach(() => {
    delete process.env.SQUARE_ACCESS_TOKEN;
    delete process.env.SQUARE_APPLICATION_ID;
    delete process.env.SQUARE_ENVIRONMENT;
  });

  describe('Credit Card Payment Processing', () => {
    it('should process complete credit card payment flow', async () => {
      const paymentRequest = {
        source_id: 'card-nonce-ok',
        amount_money: {
          amount: 2500, // $25.00
          currency: 'USD',
        },
        idempotency_key: uuidv4(),
        order_id: 'order-123',
        customer_details: {
          email: 'customer@example.com',
          name: 'John Doe',
          phone: '555-0123',
        },
        billing_address: {
          address_line_1: '123 Main St',
          locality: 'San Francisco',
          administrative_district_level_1: 'CA',
          postal_code: '94102',
          country: 'US',
        },
      };

      // Mock successful payment creation
      mockPaymentsApi.createPayment.mockResolvedValue({
        result: {
          payment: {
            id: 'payment-123',
            status: 'COMPLETED',
            sourceType: 'CARD',
            cardDetails: {
              status: 'CAPTURED',
              card: {
                cardBrand: 'VISA',
                last4: '1111',
              },
              authResultCode: 'nsNnBt',
            },
            totalMoney: {
              amount: BigInt(2500),
              currency: 'USD',
            },
            approvedMoney: {
              amount: BigInt(2500),
              currency: 'USD',
            },
            receiptNumber: 'payment-123',
            receiptUrl: 'https://squareup.com/receipt/preview/payment-123',
            orderId: 'order-123',
            createdAt: '2024-12-01T12:00:00Z',
            updatedAt: '2024-12-01T12:00:00Z',
          },
        },
      });

      const result = await createPayment(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment?.id).toBe('payment-123');
      expect(result.payment?.status).toBe('COMPLETED');
      expect(result.payment?.receiptUrl).toBeDefined();
      expect(mockPaymentsApi.createPayment).toHaveBeenCalledWith({
        body: expect.objectContaining({
          source_id: 'card-nonce-ok',
          amount_money: {
            amount: 2500,
            currency: 'USD',
          },
          idempotency_key: paymentRequest.idempotency_key,
          order_id: 'order-123',
        }),
      });
    });

    it('should handle payment authorization and delayed capture', async () => {
      const authRequest = {
        source_id: 'card-nonce-ok',
        amount_money: {
          amount: 5000, // $50.00
          currency: 'USD',
        },
        idempotency_key: uuidv4(),
        order_id: 'order-456',
        autocomplete: false, // Authorization only
      };

      // Mock authorization response
      mockPaymentsApi.createPayment.mockResolvedValue({
        result: {
          payment: {
            id: 'payment-456',
            status: 'APPROVED',
            sourceType: 'CARD',
            cardDetails: {
              status: 'AUTHORIZED',
              card: {
                cardBrand: 'MASTERCARD',
                last4: '5555',
              },
            },
            totalMoney: {
              amount: BigInt(5000),
              currency: 'USD',
            },
            approvedMoney: {
              amount: BigInt(5000),
              currency: 'USD',
            },
            orderId: 'order-456',
            createdAt: '2024-12-01T12:00:00Z',
          },
        },
      });

      // Mock capture response
      mockPaymentsApi.completePayment.mockResolvedValue({
        result: {
          payment: {
            id: 'payment-456',
            status: 'COMPLETED',
            cardDetails: {
              status: 'CAPTURED',
            },
            updatedAt: '2024-12-01T12:30:00Z',
          },
        },
      });

      // Step 1: Authorize payment
      const authResult = await createPayment(authRequest);
      expect(authResult.success).toBe(true);
      expect(authResult.payment?.status).toBe('APPROVED');

      // Step 2: Capture payment
      const captureResult = await mockPaymentsApi.completePayment({
        paymentId: 'payment-456',
        body: {},
      });

      expect(captureResult.result.payment.status).toBe('COMPLETED');
      expect(captureResult.result.payment.cardDetails.status).toBe('CAPTURED');
    });

    it('should handle payment failures with detailed error information', async () => {
      const failedPaymentRequest = {
        source_id: 'card-nonce-declined',
        amount_money: {
          amount: 1000,
          currency: 'USD',
        },
        idempotency_key: uuidv4(),
        order_id: 'order-789',
      };

      // Mock payment decline
      mockPaymentsApi.createPayment.mockResolvedValue({
        result: {
          payment: {
            id: 'payment-789',
            status: 'FAILED',
            sourceType: 'CARD',
            cardDetails: {
              status: 'FAILED',
              authResultCode: 'cvv_failure',
            },
            totalMoney: {
              amount: BigInt(1000),
              currency: 'USD',
            },
            orderId: 'order-789',
          },
        },
        errors: [
          {
            category: 'PAYMENT_METHOD_ERROR',
            code: 'CVV_FAILURE',
            detail: 'CVV check failed',
          },
        ],
      });

      const result = await createPayment(failedPaymentRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('CVV check failed');
      expect(result.errorCode).toBe('CVV_FAILURE');
    });

    it('should handle 3D Secure authentication flow', async () => {
      const securePaymentRequest = {
        source_id: 'card-nonce-requires-verification',
        amount_money: {
          amount: 10000, // $100.00 - triggers 3DS
          currency: 'USD',
        },
        idempotency_key: uuidv4(),
        order_id: 'order-3ds',
        verification_token: '3ds-verification-token',
      };

      // Mock 3DS challenge response
      mockPaymentsApi.createPayment.mockResolvedValue({
        result: {
          payment: {
            id: 'payment-3ds',
            status: 'PENDING',
            sourceType: 'CARD',
            cardDetails: {
              status: 'AUTHORIZED',
              authResultCode: '3ds_required',
              avsStatus: 'AVS_ACCEPTED',
              cvvStatus: 'CVV_ACCEPTED',
            },
            totalMoney: {
              amount: BigInt(10000),
              currency: 'USD',
            },
            orderId: 'order-3ds',
            delayAction: 'CANCEL',
            delayDuration: 'PT10M', // 10 minutes to complete 3DS
          },
        },
      });

      const result = await createPayment(securePaymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment?.status).toBe('PENDING');
      expect(result.requires3DS).toBe(true);
      expect(result.payment?.delayAction).toBe('CANCEL');
    });
  });

  describe('Gift Card Payment Processing', () => {
    it('should process gift card payment with balance validation', async () => {
      const giftCardRequest = {
        giftCardNonce: 'gift-card-nonce-ok',
        amountMoney: {
          amount: 2500, // $25.00
          currency: 'USD',
        },
        orderId: 'order-gc-123',
      };

      // Mock gift card retrieval
      mockGiftCardsApi.retrieveGiftCardFromNonce.mockResolvedValue({
        result: {
          giftCard: {
            id: 'gift-card-123',
            type: 'DIGITAL',
            ganSource: 'SQUARE',
            state: 'ACTIVE',
            balanceMoney: {
              amount: BigInt(5000), // $50.00 balance
              currency: 'USD',
            },
            createdAt: '2024-11-01T10:00:00Z',
          },
        },
      });

      // Mock payment creation with gift card
      mockPaymentsApi.createPayment.mockResolvedValue({
        result: {
          payment: {
            id: 'payment-gc-123',
            status: 'COMPLETED',
            sourceType: 'GIFT_CARD',
            giftCardDetails: {
              status: 'CAPTURED',
            },
            totalMoney: {
              amount: BigInt(2500),
              currency: 'USD',
            },
            approvedMoney: {
              amount: BigInt(2500),
              currency: 'USD',
            },
            orderId: 'order-gc-123',
          },
        },
      });

      const result = await processGiftCardPayment(giftCardRequest);

      expect(result.success).toBe(true);
      expect(result.payment?.status).toBe('COMPLETED');
      expect(result.remainingBalance).toBe(2500); // $25.00 remaining
      expect(mockGiftCardsApi.retrieveGiftCardFromNonce).toHaveBeenCalled();
      expect(mockPaymentsApi.createPayment).toHaveBeenCalled();
    });

    it('should handle insufficient gift card balance', async () => {
      const insufficientGiftCardRequest = {
        giftCardNonce: 'gift-card-nonce-low-balance',
        amountMoney: {
          amount: 7500, // $75.00 - more than balance
          currency: 'USD',
        },
        orderId: 'order-gc-456',
      };

      // Mock gift card with low balance
      mockGiftCardsApi.retrieveGiftCardFromNonce.mockResolvedValue({
        result: {
          giftCard: {
            id: 'gift-card-456',
            type: 'DIGITAL',
            state: 'ACTIVE',
            balanceMoney: {
              amount: BigInt(2500), // Only $25.00 balance
              currency: 'USD',
            },
          },
        },
      });

      const result = await processGiftCardPayment(insufficientGiftCardRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient gift card balance');
      expect(result.availableBalance).toBe(2500);
      expect(result.requestedAmount).toBe(7500);
    });

    it('should handle expired or inactive gift cards', async () => {
      const expiredGiftCardRequest = {
        giftCardNonce: 'gift-card-nonce-expired',
        amountMoney: {
          amount: BigInt(1000),
          currency: 'USD',
        },
        orderId: 'order-gc-expired',
      };

      // Mock expired gift card
      mockGiftCardsApi.retrieveGiftCardFromNonce.mockResolvedValue({
        result: {
          giftCard: {
            id: 'gift-card-expired',
            type: 'DIGITAL',
            state: 'DEACTIVATED',
            balanceMoney: {
              amount: BigInt(5000),
              currency: 'USD',
            },
          },
        },
      });

      const result = await processGiftCardPayment(expiredGiftCardRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gift card is not active');
      expect(result.giftCardState).toBe('DEACTIVATED');
    });
  });

  describe('Split Payment Processing', () => {
    it('should process split payment with multiple payment methods', async () => {
      const splitPaymentRequest = {
        payments: [
          {
            type: 'GIFT_CARD',
            sourceId: 'gift-card-nonce-ok',
            amountMoney: {
              amount: BigInt(3000), // $30.00
              currency: 'USD',
            },
          },
          {
            type: 'CARD',
            sourceId: 'card-nonce-ok',
            amountMoney: {
              amount: BigInt(2000), // $20.00
              currency: 'USD',
            },
          },
        ],
        totalAmount: BigInt(5000), // $50.00
        orderId: 'order-split-123',
      };

      // Mock gift card payment
      mockGiftCardsApi.retrieveGiftCardFromNonce.mockResolvedValue({
        result: {
          giftCard: {
            id: 'gift-card-split',
            state: 'ACTIVE',
            balanceMoney: {
              amount: BigInt(5000),
              currency: 'USD',
            },
          },
        },
      });

      // Mock both payments
      mockPaymentsApi.createPayment
        .mockResolvedValueOnce({
          result: {
            payment: {
              id: 'payment-gc-split',
              status: 'COMPLETED',
              sourceType: 'GIFT_CARD',
              totalMoney: { amount: BigInt(3000), currency: 'USD' },
              orderId: 'order-split-123',
            },
          },
        })
        .mockResolvedValueOnce({
          result: {
            payment: {
              id: 'payment-card-split',
              status: 'COMPLETED',
              sourceType: 'CARD',
              totalMoney: { amount: BigInt(2000), currency: 'USD' },
              orderId: 'order-split-123',
            },
          },
        });

      // Process split payment
      const processSplitPayment = async (request: typeof splitPaymentRequest) => {
        const results = [];
        let totalProcessed = BigInt(0);

        for (const payment of request.payments) {
          if (payment.type === 'GIFT_CARD') {
            const gcResult = await processGiftCardPayment({
              giftCardNonce: payment.sourceId,
              amountMoney: payment.amountMoney,
              orderId: request.orderId,
            });
            results.push(gcResult);
            if (gcResult.success) {
              totalProcessed += payment.amountMoney.amount;
            }
          } else if (payment.type === 'CARD') {
            const cardResult = await createPayment({
              sourceId: payment.sourceId,
              amountMoney: payment.amountMoney,
              idempotencyKey: uuidv4(),
              orderId: request.orderId,
            });
            results.push(cardResult);
            if (cardResult.success) {
              totalProcessed += payment.amountMoney.amount;
            }
          }
        }

        return {
          success: totalProcessed === request.totalAmount,
          payments: results,
          totalProcessed: Number(totalProcessed),
          totalRequired: Number(request.totalAmount),
        };
      };

      const result = await processSplitPayment(splitPaymentRequest);

      expect(result.success).toBe(true);
      expect(result.payments).toHaveLength(2);
      expect(result.totalProcessed).toBe(5000);
      expect(result.payments.every(p => p.success)).toBe(true);
    });
  });

  describe('Webhook Processing Integration', () => {
    it('should process payment completed webhook', async () => {
      const webhookPayload = {
        merchant_id: 'test-merchant-id',
        type: 'payment.updated',
        event_id: 'webhook-event-123',
        created_at: '2024-12-01T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-webhook-123',
          object: {
            payment: {
              id: 'payment-webhook-123',
              status: 'COMPLETED',
              source_type: 'CARD',
              total_money: {
                amount: 2500,
                currency: 'USD',
              },
              order_id: 'order-webhook-123',
              created_at: '2024-12-01T11:55:00Z',
              updated_at: '2024-12-01T12:00:00Z',
            },
          },
        },
      };

      // Mock payment retrieval for verification
      mockPaymentsApi.getPayment.mockResolvedValue({
        result: {
          payment: {
            id: 'payment-webhook-123',
            status: 'COMPLETED',
            sourceType: 'CARD',
            totalMoney: {
              amount: BigInt(2500),
              currency: 'USD',
            },
            orderId: 'order-webhook-123',
            updatedAt: '2024-12-01T12:00:00Z',
          },
        },
      });

      const result = await handlePaymentWebhook(webhookPayload);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('payment.updated');
      expect(result.paymentId).toBe('payment-webhook-123');
      expect(result.action).toBe('order_completed');
      expect(mockPaymentsApi.getPayment).toHaveBeenCalledWith({
        paymentId: 'payment-webhook-123',
      });
    });

    it('should handle payment failed webhook', async () => {
      const failedWebhookPayload = {
        merchant_id: 'test-merchant-id',
        type: 'payment.updated',
        event_id: 'webhook-event-failed',
        created_at: '2024-12-01T12:00:00Z',
        data: {
          type: 'payment',
          id: 'payment-failed-123',
          object: {
            payment: {
              id: 'payment-failed-123',
              status: 'FAILED',
              source_type: 'CARD',
              total_money: {
                amount: 1500,
                currency: 'USD',
              },
              order_id: 'order-failed-123',
              card_details: {
                status: 'FAILED',
                auth_result_code: 'insufficient_funds',
              },
            },
          },
        },
      };

      const result = await handlePaymentWebhook(failedWebhookPayload);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('payment.updated');
      expect(result.paymentStatus).toBe('FAILED');
      expect(result.action).toBe('order_payment_failed');
      expect(result.failureReason).toBe('insufficient_funds');
    });

    it('should handle refund webhook events', async () => {
      const refundWebhookPayload = {
        merchant_id: 'test-merchant-id',
        type: 'refund.updated',
        event_id: 'webhook-refund-123',
        created_at: '2024-12-01T15:00:00Z',
        data: {
          type: 'refund',
          id: 'refund-123',
          object: {
            refund: {
              id: 'refund-123',
              status: 'COMPLETED',
              amount_money: {
                amount: 1000,
                currency: 'USD',
              },
              payment_id: 'payment-refund-123',
              order_id: 'order-refund-123',
              reason: 'Customer requested refund',
              created_at: '2024-12-01T14:55:00Z',
              updated_at: '2024-12-01T15:00:00Z',
            },
          },
        },
      };

      const result = await handlePaymentWebhook(refundWebhookPayload);

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('refund.updated');
      expect(result.refundId).toBe('refund-123');
      expect(result.action).toBe('process_refund');
      expect(result.refundAmount).toBe(1000);
      expect(result.refundReason).toBe('Customer requested refund');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle Square API network errors with retry', async () => {
      const paymentRequest = {
        sourceId: 'card-nonce-ok',
        amountMoney: {
          amount: BigInt(1500),
          currency: 'USD',
        },
        idempotencyKey: uuidv4(),
        orderId: 'order-retry-123',
      };

      // Mock network error then success
      mockPaymentsApi.createPayment
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          result: {
            payment: {
              id: 'payment-retry-123',
              status: 'COMPLETED',
              totalMoney: {
                amount: BigInt(1500),
                currency: 'USD',
              },
              orderId: 'order-retry-123',
            },
          },
        });

      // Implement retry logic
      const createPaymentWithRetry = async (request: any, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await createPayment(request);
          } catch (error) {
            if (attempt === maxRetries) throw error;
            await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          }
        }
      };

      const result = await createPaymentWithRetry(paymentRequest);

      expect(result.success).toBe(true);
      expect(result.payment?.id).toBe('payment-retry-123');
      expect(mockPaymentsApi.createPayment).toHaveBeenCalledTimes(2);
    });

    it('should handle idempotency key conflicts', async () => {
      const duplicateRequest = {
        sourceId: 'card-nonce-ok',
        amountMoney: {
          amount: BigInt(2000),
          currency: 'USD',
        },
        idempotencyKey: 'duplicate-key-123',
        orderId: 'order-duplicate',
      };

      // Mock idempotency conflict
      mockPaymentsApi.createPayment.mockResolvedValue({
        result: {
          payment: {
            id: 'payment-original-123',
            status: 'COMPLETED',
            totalMoney: {
              amount: BigInt(2000),
              currency: 'USD',
            },
            orderId: 'order-duplicate',
            createdAt: '2024-12-01T10:00:00Z',
          },
        },
        errors: [
          {
            category: 'IDEMPOTENCY_ERROR',
            code: 'IDEMPOTENCY_KEY_REUSED',
            detail: 'Idempotency key already used',
          },
        ],
      });

      const result = await createPayment(duplicateRequest);

      expect(result.success).toBe(true); // Should still return the original payment
      expect(result.payment?.id).toBe('payment-original-123');
      expect(result.isIdempotent).toBe(true);
    });

    it('should handle rate limiting with exponential backoff', async () => {
      const rateLimitedRequest = {
        sourceId: 'card-nonce-ok',
        amountMoney: {
          amount: BigInt(1000),
          currency: 'USD',
        },
        idempotencyKey: uuidv4(),
        orderId: 'order-rate-limited',
      };

      // Mock rate limit error then success
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).statusCode = 429;

      mockPaymentsApi.createPayment
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          result: {
            payment: {
              id: 'payment-rate-limited-123',
              status: 'COMPLETED',
              totalMoney: {
                amount: BigInt(1000),
                currency: 'USD',
              },
              orderId: 'order-rate-limited',
            },
          },
        });

      // Implement rate limit handling
      const handleRateLimit = async (request: any) => {
        try {
          return await createPayment(request);
        } catch (error: any) {
          if (error.statusCode === 429) {
            // Wait for rate limit reset
            await new Promise(resolve => setTimeout(resolve, 2000));
            return await createPayment(request);
          }
          throw error;
        }
      };

      const result = await handleRateLimit(rateLimitedRequest);

      expect(result.success).toBe(true);
      expect(result.payment?.id).toBe('payment-rate-limited-123');
      expect(mockPaymentsApi.createPayment).toHaveBeenCalledTimes(2);
    });
  });

  describe('Environment Configuration', () => {
    it('should validate Square configuration on initialization', () => {
      const validateSquareConfig = () => {
        const requiredEnvVars = [
          'SQUARE_ACCESS_TOKEN',
          'SQUARE_APPLICATION_ID',
          'SQUARE_ENVIRONMENT',
        ];

        const missingVars = requiredEnvVars.filter(
          varName => !process.env[varName]
        );

        if (missingVars.length > 0) {
          throw new Error(`Missing required Square configuration: ${missingVars.join(', ')}`);
        }

        if (!['sandbox', 'production'].includes(process.env.SQUARE_ENVIRONMENT!)) {
          throw new Error('SQUARE_ENVIRONMENT must be either "sandbox" or "production"');
        }

        return {
          environment: process.env.SQUARE_ENVIRONMENT as 'sandbox' | 'production',
          applicationId: process.env.SQUARE_APPLICATION_ID!,
          isProduction: process.env.SQUARE_ENVIRONMENT === 'production',
        };
      };

      const config = validateSquareConfig();

      expect(config.environment).toBe('sandbox');
      expect(config.applicationId).toBe('test-app-id');
      expect(config.isProduction).toBe(false);
    });

    it('should handle production vs sandbox environment differences', () => {
      const getSquareClient = (environment: 'sandbox' | 'production') => {
        return new Square.SquareClient({
          accessToken: process.env.SQUARE_ACCESS_TOKEN!,
          environment: environment,
        });
      };

      const sandboxClient = getSquareClient('sandbox');
      const prodClient = getSquareClient('production');

      expect(MockSquare.SquareClient).toHaveBeenCalledTimes(2);
      expect(MockSquare.SquareClient).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        environment: 'sandbox',
      });
      expect(MockSquare.SquareClient).toHaveBeenCalledWith({
        accessToken: 'test-access-token',
        environment: 'production',
      });
    });
  });
}); 