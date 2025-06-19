import { createPayment, handleGiftCardPaymentError, formatGiftCardErrorMessage } from '@/lib/square/payments-api';
import https from 'https';

// Mock the https module
jest.mock('https');
jest.mock('@/utils/logger');

const mockHttps = https as jest.Mocked<typeof https>;

// Mock request object
const mockRequest = {
  write: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
};

// Test fixtures
const validPaymentRequest = {
  source_id: 'card-nonce-12345',
  idempotency_key: 'unique-key-123',
  amount_money: {
    amount: 7500,
    currency: 'USD',
  },
  app_fee_money: {
    amount: 100,
    currency: 'USD',
  },
  autocomplete: true,
  order_id: 'square-order-456',
  location_id: 'location-123',
};

const mockSuccessfulPayment = {
  payment: {
    id: 'payment-789',
    status: 'COMPLETED',
    amount_money: {
      amount: 7500,
      currency: 'USD',
    },
    source_type: 'CARD',
    order_id: 'square-order-456',
    created_at: '2024-01-16T14:00:00Z',
  },
};

const mockGiftCardInsufficientFundsError = {
  errors: [
    {
      code: 'INSUFFICIENT_FUNDS',
      detail: 'Gift card does not have sufficient funds',
      field: 'source_id',
    },
    {
      code: 'GIFT_CARD_AVAILABLE_AMOUNT',
      available_amount: {
        amount: 2500,
        currency: 'USD',
      },
    },
  ],
};

describe('Square Payments API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default environment variables
    process.env.USE_SQUARE_SANDBOX = 'true';
    process.env.SQUARE_SANDBOX_TOKEN = 'sandbox-token-123';
    process.env.SQUARE_ACCESS_TOKEN = 'access-token-456';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createPayment', () => {
    beforeEach(() => {
      // Setup mock HTTP request
      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn(),
        };

        // Simulate successful response
        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          // Simulate data and end events
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler(JSON.stringify(mockSuccessfulPayment));
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });
    });

    test('should create payment successfully with card', async () => {
      const result = await createPayment(validPaymentRequest);

      expect(result).toEqual({
        result: {
          payment: mockSuccessfulPayment.payment,
        },
      });

      // Verify HTTPS request configuration
      expect(mockHttps.request).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'sandbox.squareup.com',
          path: '/v2/payments',
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sandbox-token-123',
            'Square-Version': '2025-05-21',
            'Content-Type': 'application/json',
          }),
        }),
        expect.any(Function)
      );

      // Verify request body was written
      expect(mockRequest.write).toHaveBeenCalledWith(
        JSON.stringify(validPaymentRequest)
      );
      expect(mockRequest.end).toHaveBeenCalled();
    });

    test('should create payment successfully with gift card', async () => {
      const giftCardRequest = {
        ...validPaymentRequest,
        source_id: 'gift-card-nonce-67890',
      };

      const giftCardPayment = {
        payment: {
          ...mockSuccessfulPayment.payment,
          source_type: 'GIFT_CARD',
        },
      };

      // Mock gift card payment response
      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn(),
        };

        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler(JSON.stringify(giftCardPayment));
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });

      const result = await createPayment(giftCardRequest);

      expect(result).toEqual({
        result: {
          payment: giftCardPayment.payment,
        },
      });
    });

    test('should handle gift card insufficient funds error', async () => {
      // Mock insufficient funds error response
      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 400,
          on: jest.fn(),
        };

        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler(JSON.stringify(mockGiftCardInsufficientFundsError));
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });

      const result = await createPayment({
        ...validPaymentRequest,
        source_id: 'gift-card-insufficient-funds',
      });

      expect(result).toEqual({
        errors: mockGiftCardInsufficientFundsError.errors,
      });
    });

    test('should handle authentication errors', async () => {
      const authError = {
        errors: [
          {
            code: 'UNAUTHORIZED',
            detail: 'Invalid access token',
          },
        ],
      };

      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 401,
          on: jest.fn(),
        };

        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler(JSON.stringify(authError));
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });

      const result = await createPayment(validPaymentRequest);

      expect(result).toEqual({
        errors: authError.errors,
      });
    });

    test('should handle network errors', async () => {
      mockHttps.request.mockImplementation(() => {
        setTimeout(() => {
          const errorHandler = mockRequest.on.mock.calls.find(call => call[0] === 'error')?.[1];
          if (errorHandler) {
            errorHandler(new Error('Network timeout'));
          }
        }, 0);

        return mockRequest as any;
      });

      await expect(createPayment(validPaymentRequest)).rejects.toThrow('Network timeout');
    });

    test('should handle malformed JSON response', async () => {
      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn(),
        };

        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler('invalid-json-response');
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });

      await expect(createPayment(validPaymentRequest)).rejects.toThrow('Failed to parse response');
    });
  });

  describe('Environment configuration', () => {
    test('should use sandbox environment when USE_SQUARE_SANDBOX is true', async () => {
      process.env.USE_SQUARE_SANDBOX = 'true';
      process.env.SQUARE_SANDBOX_TOKEN = 'sandbox-token-123';

      // Mock successful response
      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn(),
        };

        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler(JSON.stringify(mockSuccessfulPayment));
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });

      await createPayment(validPaymentRequest);

      expect(mockHttps.request).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'sandbox.squareup.com',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sandbox-token-123',
          }),
        }),
        expect.any(Function)
      );
    });

    test('should use production environment when USE_SQUARE_SANDBOX is false', async () => {
      process.env.USE_SQUARE_SANDBOX = 'false';
      process.env.NODE_ENV = 'production';
      process.env.SQUARE_PRODUCTION_TOKEN = 'production-token-456';

      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn(),
        };

        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler(JSON.stringify(mockSuccessfulPayment));
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });

      await createPayment(validPaymentRequest);

      expect(mockHttps.request).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'connect.squareup.com',
          headers: expect.objectContaining({
            'Authorization': 'Bearer production-token-456',
          }),
        }),
        expect.any(Function)
      );
    });

    test('should throw error when access token is missing', async () => {
      delete process.env.SQUARE_SANDBOX_TOKEN;
      delete process.env.SQUARE_ACCESS_TOKEN;
      delete process.env.SQUARE_PRODUCTION_TOKEN;

      await expect(createPayment(validPaymentRequest)).rejects.toThrow(
        'Square access token not configured'
      );
    });
  });

  describe('handleGiftCardPaymentError', () => {
    test('should identify gift card insufficient funds error', () => {
      const errors = [
        {
          category: 'PAYMENT_METHOD_ERROR',
          code: 'GIFT_CARD_INSUFFICIENT_FUNDS',
          detail: 'Gift card has insufficient funds',
          field: 'source_id',
        },
      ];

      const result = handleGiftCardPaymentError(errors);

      expect(result).toEqual({
        isGiftCardError: true,
        insufficientFunds: true,
        availableAmount: undefined,
      });
    });

    test('should return false for non-gift card errors', () => {
      const errors = [
        {
          category: 'PAYMENT_METHOD_ERROR',
          code: 'CARD_DECLINED',
          detail: 'Card was declined',
        },
      ];

      const result = handleGiftCardPaymentError(errors);

      expect(result).toEqual({
        isGiftCardError: false,
        insufficientFunds: false,
        availableAmount: undefined,
      });
    });

    test('should handle empty errors array', () => {
      const result = handleGiftCardPaymentError([]);

      expect(result).toEqual({
        isGiftCardError: false,
        insufficientFunds: false,
        availableAmount: undefined,
      });
    });
  });

  describe('formatGiftCardErrorMessage', () => {
    test('should format gift card error message correctly', () => {
      const availableAmount = { amount: 2500, currency: 'USD' };
      const requestedAmount = { amount: 7500, currency: 'USD' };

      const message = formatGiftCardErrorMessage(availableAmount, requestedAmount);

      expect(message).toContain('Gift card has insufficient funds');
      expect(message).toContain('$25.00');
      expect(message).toContain('$75.00');
    });

    test('should handle different currencies', () => {
      const availableAmount = { amount: 1000, currency: 'CAD' };
      const requestedAmount = { amount: 2000, currency: 'CAD' };

      const message = formatGiftCardErrorMessage(availableAmount, requestedAmount);

      expect(message).toContain('Gift card has insufficient funds');
      expect(message).toContain('$10.00');
      expect(message).toContain('$20.00');
    });

    test('should handle zero amounts', () => {
      const availableAmount = { amount: 0, currency: 'USD' };
      const requestedAmount = { amount: 1000, currency: 'USD' };

      const message = formatGiftCardErrorMessage(availableAmount, requestedAmount);

      expect(message).toContain('$0.00');
      expect(message).toContain('$10.00');
    });
  });

  describe('Payment flow edge cases', () => {
    test('should handle partial payment scenarios', async () => {
      const partialPaymentRequest = {
        ...validPaymentRequest,
        amount_money: {
          amount: 5000, // Less than order total
          currency: 'USD',
        },
      };

      const partialPaymentResponse = {
        payment: {
          ...mockSuccessfulPayment.payment,
          amount_money: {
            amount: 5000,
            currency: 'USD',
          },
          status: 'APPROVED',
        },
      };

      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn(),
        };

        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler(JSON.stringify(partialPaymentResponse));
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });

      const result = await createPayment(partialPaymentRequest);

      expect(result.result?.payment.amount_money.amount).toBe(5000);
      expect(result.result?.payment.status).toBe('APPROVED');
    });

    test('should handle payment with tip', async () => {
      const paymentWithTip = {
        ...validPaymentRequest,
        tip_money: {
          amount: 1000, // $10.00 tip
          currency: 'USD',
        },
      };

      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn(),
        };

        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler(JSON.stringify(mockSuccessfulPayment));
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });

      const result = await createPayment(paymentWithTip);

      expect(result.result?.payment).toBeDefined();
      expect(mockRequest.write).toHaveBeenCalledWith(
        JSON.stringify(paymentWithTip)
      );
    });

    test('should handle delayed capture payments', async () => {
      const delayedCaptureRequest = {
        ...validPaymentRequest,
        autocomplete: false,
        delay_duration: 'PT1H', // 1 hour delay
      };

      mockHttps.request.mockImplementation((options, callback) => {
        const mockResponse = {
          statusCode: 200,
          on: jest.fn(),
        };

        setTimeout(() => {
          if (callback) callback(mockResponse as any);
          
          const dataHandler = mockResponse.on.mock.calls.find(call => call[0] === 'data')?.[1];
          const endHandler = mockResponse.on.mock.calls.find(call => call[0] === 'end')?.[1];
          
          if (dataHandler) {
            dataHandler(JSON.stringify({
              payment: {
                ...mockSuccessfulPayment.payment,
                status: 'APPROVED', // Not yet captured
              },
            }));
          }
          if (endHandler) {
            endHandler();
          }
        }, 0);

        return mockRequest as any;
      });

      const result = await createPayment(delayedCaptureRequest);

      expect(result.result?.payment.status).toBe('APPROVED');
    });
  });
}); 