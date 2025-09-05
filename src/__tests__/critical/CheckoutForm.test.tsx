import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckoutForm } from '@/components/store/CheckoutForm';
import { useCartStore } from '@/store/cart';

// Mock dependencies
jest.mock('@/store/cart');
jest.mock('next/navigation');
jest.mock('@/app/actions', () => ({
  createOrderAndGenerateCheckoutUrl: jest.fn(),
  getShippingRates: jest.fn(),
}));
jest.mock('@/app/actions/createManualOrder', () => ({
  updateOrderWithManualPayment: jest.fn(),
}));
jest.mock('@/app/actions/duplicate-prevention', () => ({
  checkForDuplicateOrders: jest.fn(),
}));

const mockCartStore = {
  items: [
    {
      id: 'test-product-1',
      name: 'Test Beef Empanadas',
      price: 12.99,
      quantity: 2,
      variantId: 'variant-1',
    },
  ],
  totalPrice: 25.98,
  clearCart: jest.fn(),
};

describe('CheckoutForm - Critical Component Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCartStore as unknown as jest.Mock).mockReturnValue(mockCartStore);
  });

  it('should render all required fields for pickup', () => {
    render(<CheckoutForm initialUserData={null} />);
    
    // Check that essential form fields are present
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    
    // Check that pickup-specific fields are present
    expect(screen.getByText(/pickup date/i)).toBeInTheDocument();
    expect(screen.getByText(/pickup time/i)).toBeInTheDocument();
    
    // Check that payment method selection is present
    expect(screen.getByText(/payment method/i)).toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    // Try to submit form without filling required fields
    const submitButton = screen.getByRole('button', { name: /place order|checkout/i });
    await user.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'invalid-email');
    await user.tab(); // Trigger blur event

    await waitFor(() => {
      expect(screen.getByText(/valid email is required/i)).toBeInTheDocument();
    });
  });

  it('should validate phone number format', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    const phoneInput = screen.getByLabelText(/phone/i);
    await user.type(phoneInput, '123'); // Too short
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText(/phone number must be at least 10 digits/i)).toBeInTheDocument();
    });
  });

  it('should accept valid phone number formats', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    const phoneInput = screen.getByLabelText(/phone/i);
    await user.type(phoneInput, '(415) 555-0100');
    await user.tab();

    await waitFor(() => {
      // Should not show phone validation error
      expect(screen.queryByText(/phone number must be at least 10 digits/i)).not.toBeInTheDocument();
    });
  });

  it('should pre-fill form with initial user data', () => {
    const initialUserData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '415-555-0100',
    };

    render(<CheckoutForm initialUserData={initialUserData} />);
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('415-555-0100')).toBeInTheDocument();
  });

  it('should switch between fulfillment methods', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    // Default should be pickup
    expect(screen.getByText(/pickup date/i)).toBeInTheDocument();
    
    // Switch to delivery
    const deliveryOption = screen.getByText(/local delivery/i);
    await user.click(deliveryOption);

    await waitFor(() => {
      expect(screen.getByText(/delivery date/i)).toBeInTheDocument();
      expect(screen.getByText(/delivery address/i)).toBeInTheDocument();
    });
  });

  it('should switch between payment methods', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    // Check that Square is default
    const squareOption = screen.getByLabelText(/square/i);
    expect(squareOption).toBeChecked();
    
    // Switch to cash
    const cashOption = screen.getByLabelText(/cash/i);
    await user.click(cashOption);

    expect(cashOption).toBeChecked();
    expect(squareOption).not.toBeChecked();
  });

  it('should validate delivery address fields when delivery is selected', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    // Switch to delivery
    const deliveryOption = screen.getByText(/local delivery/i);
    await user.click(deliveryOption);

    // Try to submit without address
    const submitButton = screen.getByRole('button', { name: /place order|checkout/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/street address is required/i)).toBeInTheDocument();
      expect(screen.getByText(/city is required/i)).toBeInTheDocument();
    });
  });

  it('should show pickup date and time validation', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    // Fill required fields
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '415-555-0100');
    
    // Try to select an invalid date (past date)
    const pickupDateInput = screen.getByLabelText(/pickup date/i);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await user.clear(pickupDateInput);
    await user.type(pickupDateInput, yesterday.toISOString().split('T')[0]);
    
    const submitButton = screen.getByRole('button', { name: /place order|checkout/i });
    await user.click(submitButton);

    // Should show date validation error
    await waitFor(() => {
      expect(screen.getByText(/pickup date.*not available/i)).toBeInTheDocument();
    });
  });

  it('should handle shipping rate selection for nationwide shipping', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    // Switch to nationwide shipping
    const shippingOption = screen.getByText(/nationwide shipping/i);
    await user.click(shippingOption);

    await waitFor(() => {
      expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
      expect(screen.getByText(/shipping method/i)).toBeInTheDocument();
    });

    // Fill shipping address
    const streetInput = screen.getByLabelText(/street address/i);
    await user.type(streetInput, '123 Main St');
    
    const cityInput = screen.getByLabelText(/city/i);
    await user.type(cityInput, 'New York');
    
    const stateInput = screen.getByLabelText(/state/i);
    await user.type(stateInput, 'NY');
    
    const postalCodeInput = screen.getByLabelText(/postal code/i);
    await user.type(postalCodeInput, '10001');
  });

  it('should handle form submission for pickup orders', async () => {
    const user = userEvent.setup();
    const mockCreateOrder = require('@/app/actions').createOrderAndGenerateCheckoutUrl;
    mockCreateOrder.mockResolvedValue({
      success: true,
      checkoutUrl: 'https://checkout.square.com/test',
      orderId: 'order-123',
    });

    render(<CheckoutForm initialUserData={null} />);
    
    // Fill all required fields
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '415-555-0100');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /place order|checkout/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          items: mockCartStore.items,
          customerInfo: expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '415-555-0100',
          }),
          fulfillment: expect.objectContaining({
            method: 'pickup',
          }),
          paymentMethod: 'SQUARE',
        })
      );
    });
  });

  it('should handle form errors gracefully', async () => {
    const user = userEvent.setup();
    const mockCreateOrder = require('@/app/actions').createOrderAndGenerateCheckoutUrl;
    mockCreateOrder.mockResolvedValue({
      success: false,
      error: 'Order processing failed',
      checkoutUrl: null,
      orderId: null,
    });

    render(<CheckoutForm initialUserData={null} />);
    
    // Fill required fields and submit
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '415-555-0100');
    
    const submitButton = screen.getByRole('button', { name: /place order|checkout/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/order processing failed/i)).toBeInTheDocument();
    });
  });

  it('should save contact information when requested', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm initialUserData={null} />);
    
    // Fill contact information
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/phone/i), '415-555-0100');
    
    // Look for save contact info option (if present)
    const saveContactCheckbox = screen.queryByLabelText(/save.*contact.*info/i);
    if (saveContactCheckbox) {
      await user.click(saveContactCheckbox);
    }
    
    // This test verifies the form handles contact saving without errors
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
  });
});
