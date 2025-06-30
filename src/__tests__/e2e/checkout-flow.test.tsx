import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import CheckoutPage from '@/app/checkout/page';
import { useCartStore } from '@/store/useCartStore';
import { createOrder } from '@/app/actions/orders';
import { createPayment } from '@/lib/square/payments-api';
import { getShippingRates, createShippingLabel } from '@/app/actions/shipping';

// Mock dependencies
jest.mock('@/store/useCartStore');
jest.mock('@/app/actions/orders');
jest.mock('@/lib/square/payments-api');
jest.mock('@/app/actions/shipping');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

const mockUseCartStore = useCartStore as jest.MockedFunction<typeof useCartStore>;
const mockCreateOrder = createOrder as jest.MockedFunction<typeof createOrder>;
const mockCreatePayment = createPayment as jest.MockedFunction<typeof createPayment>;
const mockGetShippingRates = getShippingRates as jest.MockedFunction<typeof getShippingRates>;
const mockCreateShippingLabel = createShippingLabel as jest.MockedFunction<typeof createShippingLabel>;

describe('Checkout Flow - End-to-End Testing', () => {
  const mockCartItems = [
    {
      id: '1',
      name: 'Dulce de Leche Alfajores',
      price: 15.99,
      quantity: 2,
      image: '/images/alfajores.jpg',
      category: 'alfajores',
    },
    {
      id: '2',
      name: 'Beef Empanadas',
      price: 12.99,
      quantity: 3,
      image: '/images/empanadas.jpg',
      category: 'empanadas',
    },
  ];

  const mockCartStore = {
    items: mockCartItems,
    total: 70.95, // (15.99 * 2) + (12.99 * 3)
    itemCount: 5,
    clearCart: jest.fn(),
    updateQuantity: jest.fn(),
    removeItem: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCartStore.mockReturnValue(mockCartStore);

    // Mock successful shipping rates
    mockGetShippingRates.mockResolvedValue({
      success: true,
      rates: [
        {
          id: 'rate-usps-ground',
          name: 'USPS Ground (Est. 3 days)',
          amount: 8.50,
          carrier: 'USPS',
          serviceLevelToken: 'usps_ground',
          estimatedDays: 3,
          currency: 'USD',
        },
        {
          id: 'rate-usps-priority',
          name: 'USPS Priority Mail (Est. 2 days)',
          amount: 12.75,
          carrier: 'USPS',
          serviceLevelToken: 'usps_priority',
          estimatedDays: 2,
          currency: 'USD',
        },
      ],
      addressValidation: {
        isValid: true,
        messages: [],
      },
    });
  });

  describe('Complete Pickup Order Flow', () => {
    it('should complete pickup order with credit card payment', async () => {
      const user = userEvent.setup();

      // Mock successful order creation
      mockCreateOrder.mockResolvedValue({
        success: true,
        order: {
          id: 'order-pickup-123',
          status: 'CONFIRMED',
          total: 77.16, // Including tax
          fulfillmentType: 'PICKUP',
          pickupTime: '2024-12-02T14:00:00Z',
          createdAt: '2024-12-01T12:00:00Z',
        },
      });

      // Mock successful payment
      mockCreatePayment.mockResolvedValue({
        success: true,
        payment: {
          id: 'payment-pickup-123',
          status: 'COMPLETED',
          receiptUrl: 'https://squareup.com/receipt/preview/payment-pickup-123',
        },
      });

      render(<CheckoutPage />);

      // Step 1: Verify cart items are displayed
      expect(screen.getByText('Dulce de Leche Alfajores')).toBeInTheDocument();
      expect(screen.getByText('Beef Empanadas')).toBeInTheDocument();
      expect(screen.getByText('$70.95')).toBeInTheDocument(); // Subtotal

      // Step 2: Select pickup fulfillment
      const pickupOption = screen.getByLabelText(/pickup/i);
      await user.click(pickupOption);

      // Step 3: Fill customer information
      await user.type(screen.getByLabelText(/name/i), 'John Doe');
      await user.type(screen.getByLabelText(/email/i), 'john@example.com');
      await user.type(screen.getByLabelText(/phone/i), '555-0123');

      // Step 4: Select pickup time
      const pickupTimeSelect = screen.getByLabelText(/pickup time/i);
      await user.selectOptions(pickupTimeSelect, '2024-12-02T14:00:00Z');

      // Step 5: Add special instructions
      await user.type(
        screen.getByLabelText(/special instructions/i),
        'Extra napkins please'
      );

      // Step 6: Select payment method
      const creditCardOption = screen.getByLabelText(/credit card/i);
      await user.click(creditCardOption);

      // Step 7: Enter payment details (mock Square payment form)
      const cardForm = screen.getByTestId('square-payment-form');
      expect(cardForm).toBeInTheDocument();

      // Step 8: Review order totals
      expect(screen.getByText(/subtotal.*\$70\.95/i)).toBeInTheDocument();
      expect(screen.getByText(/tax.*\$6\.21/i)).toBeInTheDocument();
      expect(screen.getByText(/total.*\$77\.16/i)).toBeInTheDocument();

      // Step 9: Place order
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      // Step 10: Verify order creation
      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledWith({
          cartItems: mockCartItems,
          customer: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '555-0123',
          },
          fulfillmentType: 'PICKUP',
          pickupTime: '2024-12-02T14:00:00Z',
          specialInstructions: 'Extra napkins please',
          paymentMethod: 'CREDIT_CARD',
          total: 77.16,
        });
      });

      // Step 11: Verify payment processing
      await waitFor(() => {
        expect(mockCreatePayment).toHaveBeenCalledWith({
          sourceId: expect.any(String),
          amountMoney: {
            amount: BigInt(7716), // $77.16 in cents
            currency: 'USD',
          },
          orderId: 'order-pickup-123',
          idempotencyKey: expect.any(String),
        });
      });

      // Step 12: Verify success message and order confirmation
      await waitFor(() => {
        expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/order-pickup-123/i)).toBeInTheDocument();
        expect(screen.getByText(/pickup.*december 2.*2:00 pm/i)).toBeInTheDocument();
      });

      // Step 13: Verify cart is cleared
      expect(mockCartStore.clearCart).toHaveBeenCalled();
    });

    it('should handle pickup order with gift card payment', async () => {
      const user = userEvent.setup();

      // Mock gift card payment
      mockCreatePayment.mockResolvedValue({
        success: true,
        payment: {
          id: 'payment-giftcard-123',
          status: 'COMPLETED',
          remainingBalance: 2284, // $22.84 remaining
        },
      });

      mockCreateOrder.mockResolvedValue({
        success: true,
        order: {
          id: 'order-giftcard-123',
          status: 'CONFIRMED',
          total: 77.16,
          fulfillmentType: 'PICKUP',
        },
      });

      render(<CheckoutPage />);

      // Fill required fields
      await user.type(screen.getByLabelText(/name/i), 'Jane Smith');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/phone/i), '555-0456');

      // Select pickup
      const pickupOption = screen.getByLabelText(/pickup/i);
      await user.click(pickupOption);

      // Select gift card payment
      const giftCardOption = screen.getByLabelText(/gift card/i);
      await user.click(giftCardOption);

      // Enter gift card details
      await user.type(screen.getByLabelText(/gift card code/i), 'GC123456789');

      // Place order
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      await waitFor(() => {
        expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/remaining gift card balance.*\$22\.84/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Delivery Order Flow', () => {
    it('should complete delivery order with address validation', async () => {
      const user = userEvent.setup();

      mockCreateOrder.mockResolvedValue({
        success: true,
        order: {
          id: 'order-delivery-123',
          status: 'CONFIRMED',
          total: 85.66, // Including delivery fee and tax
          fulfillmentType: 'DELIVERY',
          deliveryAddress: {
            street: '456 Market St',
            city: 'San Francisco',
            state: 'CA',
            postalCode: '94105',
          },
          estimatedDelivery: '2024-12-02T18:00:00Z',
        },
      });

      mockCreatePayment.mockResolvedValue({
        success: true,
        payment: {
          id: 'payment-delivery-123',
          status: 'COMPLETED',
        },
      });

      render(<CheckoutPage />);

      // Select delivery fulfillment
      const deliveryOption = screen.getByLabelText(/delivery/i);
      await user.click(deliveryOption);

      // Fill customer information
      await user.type(screen.getByLabelText(/name/i), 'Sarah Johnson');
      await user.type(screen.getByLabelText(/email/i), 'sarah@example.com');
      await user.type(screen.getByLabelText(/phone/i), '555-0789');

      // Fill delivery address
      await user.type(screen.getByLabelText(/street address/i), '456 Market St');
      await user.type(screen.getByLabelText(/city/i), 'San Francisco');
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA');
      await user.type(screen.getByLabelText(/zip code/i), '94105');

      // Select delivery time
      const deliveryTimeSelect = screen.getByLabelText(/delivery time/i);
      await user.selectOptions(deliveryTimeSelect, '2024-12-02T18:00:00Z');

      // Add delivery instructions
      await user.type(
        screen.getByLabelText(/delivery instructions/i),
        'Leave at front door'
      );

      // Verify delivery fee is calculated
      await waitFor(() => {
        expect(screen.getByText(/delivery fee.*\$8\.50/i)).toBeInTheDocument();
        expect(screen.getByText(/total.*\$85\.66/i)).toBeInTheDocument();
      });

      // Select payment method and place order
      const creditCardOption = screen.getByLabelText(/credit card/i);
      await user.click(creditCardOption);

      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            fulfillmentType: 'DELIVERY',
            deliveryAddress: {
              street: '456 Market St',
              city: 'San Francisco',
              state: 'CA',
              postalCode: '94105',
            },
            deliveryTime: '2024-12-02T18:00:00Z',
            deliveryInstructions: 'Leave at front door',
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/estimated delivery.*december 2.*6:00 pm/i)).toBeInTheDocument();
      });
    });
  });

  describe('Complete Shipping Order Flow', () => {
    it('should complete nationwide shipping order with label generation', async () => {
      const user = userEvent.setup();

      mockCreateOrder.mockResolvedValue({
        success: true,
        order: {
          id: 'order-shipping-123',
          status: 'CONFIRMED',
          total: 91.20, // Including shipping and tax
          fulfillmentType: 'NATIONWIDE_SHIPPING',
          shippingAddress: {
            recipientName: 'Mike Wilson',
            street: '789 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            postalCode: '90210',
          },
        },
      });

      mockCreatePayment.mockResolvedValue({
        success: true,
        payment: {
          id: 'payment-shipping-123',
          status: 'COMPLETED',
        },
      });

      mockCreateShippingLabel.mockResolvedValue({
        success: true,
        label: {
          transactionId: 'transaction-shipping-123',
          trackingNumber: '9405511899564540000123',
          labelUrl: 'https://shippo-delivery.s3.amazonaws.com/label-123.pdf',
          trackingUrl: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=9405511899564540000123',
          estimatedDelivery: '2024-12-05T17:00:00Z',
        },
      });

      render(<CheckoutPage />);

      // Select shipping fulfillment
      const shippingOption = screen.getByLabelText(/nationwide shipping/i);
      await user.click(shippingOption);

      // Fill customer information
      await user.type(screen.getByLabelText(/name/i), 'Mike Wilson');
      await user.type(screen.getByLabelText(/email/i), 'mike@example.com');
      await user.type(screen.getByLabelText(/phone/i), '555-0321');

      // Fill shipping address
      await user.type(screen.getByLabelText(/recipient name/i), 'Mike Wilson');
      await user.type(screen.getByLabelText(/street address/i), '789 Oak Ave');
      await user.type(screen.getByLabelText(/city/i), 'Los Angeles');
      await user.selectOptions(screen.getByLabelText(/state/i), 'CA');
      await user.type(screen.getByLabelText(/zip code/i), '90210');

      // Wait for shipping rates to load
      await waitFor(() => {
        expect(screen.getByText(/USPS Ground.*\$8\.50/i)).toBeInTheDocument();
        expect(screen.getByText(/USPS Priority Mail.*\$12\.75/i)).toBeInTheDocument();
      });

      // Select shipping method
      const uspsGroundOption = screen.getByLabelText(/USPS Ground/i);
      await user.click(uspsGroundOption);

      // Verify shipping cost is included in total
      await waitFor(() => {
        expect(screen.getByText(/shipping.*\$8\.50/i)).toBeInTheDocument();
        expect(screen.getByText(/total.*\$91\.20/i)).toBeInTheDocument();
      });

      // Select payment method and place order
      const creditCardOption = screen.getByLabelText(/credit card/i);
      await user.click(creditCardOption);

      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalledWith(
          expect.objectContaining({
            fulfillmentType: 'NATIONWIDE_SHIPPING',
            shippingAddress: {
              recipientName: 'Mike Wilson',
              street: '789 Oak Ave',
              city: 'Los Angeles',
              state: 'CA',
              postalCode: '90210',
            },
            selectedShippingRate: 'rate-usps-ground',
          })
        );
      });

      await waitFor(() => {
        expect(mockCreateShippingLabel).toHaveBeenCalledWith(
          'rate-usps-ground',
          expect.objectContaining({
            orderId: 'order-shipping-123',
            customerEmail: 'mike@example.com',
            fulfillmentType: 'nationwide_shipping',
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/tracking number.*9405511899564540000123/i)).toBeInTheDocument();
        expect(screen.getByText(/estimated delivery.*december 5/i)).toBeInTheDocument();
      });
    });
  });

  describe('Split Payment Flow', () => {
    it('should handle split payment with gift card and credit card', async () => {
      const user = userEvent.setup();

      // Mock partial gift card payment
      mockCreatePayment
        .mockResolvedValueOnce({
          success: true,
          payment: {
            id: 'payment-giftcard-partial',
            status: 'COMPLETED',
            amount: 5000, // $50.00
            remainingBalance: 0,
          },
        })
        .mockResolvedValueOnce({
          success: true,
          payment: {
            id: 'payment-card-remaining',
            status: 'COMPLETED',
            amount: 2716, // $27.16
          },
        });

      mockCreateOrder.mockResolvedValue({
        success: true,
        order: {
          id: 'order-split-123',
          status: 'CONFIRMED',
          total: 77.16,
          payments: [
            { method: 'GIFT_CARD', amount: 50.00 },
            { method: 'CREDIT_CARD', amount: 27.16 },
          ],
        },
      });

      render(<CheckoutPage />);

      // Fill basic information
      await user.type(screen.getByLabelText(/name/i), 'Split Payment User');
      await user.type(screen.getByLabelText(/email/i), 'split@example.com');
      await user.type(screen.getByLabelText(/phone/i), '555-0999');

      // Select pickup
      const pickupOption = screen.getByLabelText(/pickup/i);
      await user.click(pickupOption);

      // Select split payment option
      const splitPaymentOption = screen.getByLabelText(/split payment/i);
      await user.click(splitPaymentOption);

      // Add gift card
      await user.type(screen.getByLabelText(/gift card code/i), 'GC987654321');
      const addGiftCardButton = screen.getByRole('button', { name: /add gift card/i });
      await user.click(addGiftCardButton);

      // Verify gift card balance is applied
      await waitFor(() => {
        expect(screen.getByText(/gift card applied.*\$50\.00/i)).toBeInTheDocument();
        expect(screen.getByText(/remaining balance.*\$27\.16/i)).toBeInTheDocument();
      });

      // Add credit card for remaining balance
      const addCreditCardButton = screen.getByRole('button', { name: /add credit card/i });
      await user.click(addCreditCardButton);

      // Place order
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      await waitFor(() => {
        expect(mockCreatePayment).toHaveBeenCalledTimes(2);
        expect(screen.getByText(/order confirmed/i)).toBeInTheDocument();
        expect(screen.getByText(/paid with gift card.*\$50\.00/i)).toBeInTheDocument();
        expect(screen.getByText(/paid with credit card.*\$27\.16/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle payment failures gracefully', async () => {
      const user = userEvent.setup();

      // Mock payment failure
      mockCreatePayment.mockResolvedValue({
        success: false,
        error: 'Your card was declined',
        errorCode: 'CARD_DECLINED',
      });

      render(<CheckoutPage />);

      // Fill form and attempt order
      await user.type(screen.getByLabelText(/name/i), 'Payment Fail User');
      await user.type(screen.getByLabelText(/email/i), 'fail@example.com');
      await user.type(screen.getByLabelText(/phone/i), '555-0000');

      const pickupOption = screen.getByLabelText(/pickup/i);
      await user.click(pickupOption);

      const creditCardOption = screen.getByLabelText(/credit card/i);
      await user.click(creditCardOption);

      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      // Verify error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/your card was declined/i)).toBeInTheDocument();
        expect(screen.getByText(/please try a different payment method/i)).toBeInTheDocument();
      });

      // Verify order was not created
      expect(mockCreateOrder).not.toHaveBeenCalled();

      // Verify user can retry with different payment method
      const giftCardOption = screen.getByLabelText(/gift card/i);
      await user.click(giftCardOption);

      expect(screen.queryByText(/your card was declined/i)).not.toBeInTheDocument();
    });

    it('should handle shipping rate failures', async () => {
      const user = userEvent.setup();

      // Mock shipping rate failure
      mockGetShippingRates.mockResolvedValue({
        success: false,
        error: 'Unable to calculate shipping rates for this address',
        addressValidation: {
          isValid: false,
          messages: ['Address not found'],
        },
      });

      render(<CheckoutPage />);

      // Select shipping
      const shippingOption = screen.getByLabelText(/nationwide shipping/i);
      await user.click(shippingOption);

      // Fill invalid address
      await user.type(screen.getByLabelText(/street address/i), '999 Nonexistent St');
      await user.type(screen.getByLabelText(/city/i), 'Nowhere');
      await user.selectOptions(screen.getByLabelText(/state/i), 'XX');
      await user.type(screen.getByLabelText(/zip code/i), '00000');

      // Trigger address validation
      const validateButton = screen.getByRole('button', { name: /validate address/i });
      await user.click(validateButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to calculate shipping rates/i)).toBeInTheDocument();
        expect(screen.getByText(/address not found/i)).toBeInTheDocument();
      });

      // Verify place order button is disabled
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      expect(placeOrderButton).toBeDisabled();
    });

    it('should handle network connectivity issues', async () => {
      const user = userEvent.setup();

      // Mock network error
      mockCreateOrder.mockRejectedValue(new Error('Network request failed'));

      render(<CheckoutPage />);

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'Network Error User');
      await user.type(screen.getByLabelText(/email/i), 'network@example.com');
      await user.type(screen.getByLabelText(/phone/i), '555-1111');

      const pickupOption = screen.getByLabelText(/pickup/i);
      await user.click(pickupOption);

      const creditCardOption = screen.getByLabelText(/credit card/i);
      await user.click(creditCardOption);

      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/please check your connection and try again/i)).toBeInTheDocument();
      });

      // Verify retry button is available
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields before submission', async () => {
      const user = userEvent.setup();

      render(<CheckoutPage />);

      // Try to place order without filling required fields
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      // Verify validation errors
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/phone is required/i)).toBeInTheDocument();
      expect(screen.getByText(/fulfillment type is required/i)).toBeInTheDocument();

      // Verify order was not attempted
      expect(mockCreateOrder).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const user = userEvent.setup();

      render(<CheckoutPage />);

      // Enter invalid email
      await user.type(screen.getByLabelText(/email/i), 'invalid-email');

      // Try to submit
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    it('should validate phone number format', async () => {
      const user = userEvent.setup();

      render(<CheckoutPage />);

      // Enter invalid phone
      await user.type(screen.getByLabelText(/phone/i), '123');

      // Try to submit
      const placeOrderButton = screen.getByRole('button', { name: /place order/i });
      await user.click(placeOrderButton);

      expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument();
    });
  });
}); 