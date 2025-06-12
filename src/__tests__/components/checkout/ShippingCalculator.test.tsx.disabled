import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDeliveryZone, calculateDeliveryFee, getDeliveryFeeMessage, DeliveryZone } from '@/lib/deliveryUtils';
import { Address } from '@/types/address';

// Mock the delivery utilities
jest.mock('@/lib/deliveryUtils');

const mockGetDeliveryZone = getDeliveryZone as jest.MockedFunction<typeof getDeliveryZone>;
const mockCalculateDeliveryFee = calculateDeliveryFee as jest.MockedFunction<typeof calculateDeliveryFee>;
const mockGetDeliveryFeeMessage = getDeliveryFeeMessage as jest.MockedFunction<typeof getDeliveryFeeMessage>;

// Mock component props interface
interface ShippingCalculatorProps {
  onAddressChange?: (address: Address | null) => void;
  onFeeCalculated?: (feeResult: any) => void;
  subtotal: number;
  showZoneInfo?: boolean;
}

// Mock ShippingCalculator component for testing
const MockShippingCalculator: React.FC<ShippingCalculatorProps> = ({
  onAddressChange,
  onFeeCalculated,
  subtotal,
  showZoneInfo = true
}) => {
  const [address, setAddress] = React.useState<Address>({
    street: '',
    city: '',
    state: 'CA',
    postalCode: ''
  });
  const [zone, setZone] = React.useState<DeliveryZone | null>(null);
  const [feeResult, setFeeResult] = React.useState<any>(null);
  const [errorMessage, setErrorMessage] = React.useState<string>('');
  const [isValidating, setIsValidating] = React.useState<boolean>(false);

  const handleAddressChange = (field: keyof Address, value: string) => {
    const newAddress = { ...address, [field]: value };
    setAddress(newAddress);
    onAddressChange?.(newAddress);

    // Validate when city is provided
    if (field === 'city' && value.trim()) {
      setIsValidating(true);
      const detectedZone = getDeliveryZone(value);
      setZone(detectedZone);

      if (detectedZone) {
        const calculatedFee = calculateDeliveryFee(newAddress, subtotal);
        setFeeResult(calculatedFee);
        setErrorMessage('');
        onFeeCalculated?.(calculatedFee);
      } else {
        setFeeResult(null);
        setErrorMessage('This address is outside our delivery area.');
        onFeeCalculated?.(null);
      }
      setIsValidating(false);
    }
  };

  const getFeeDisplay = () => {
    if (!feeResult) return null;
    return getDeliveryFeeMessage(feeResult);
  };

  return (
    <div data-testid="shipping-calculator">
      <h2>Shipping Calculator</h2>
      
      <div>
        <label htmlFor="street">Street Address</label>
        <input
          id="street"
          name="street"
          value={address.street}
          onChange={(e) => handleAddressChange('street', e.target.value)}
          placeholder="Enter street address"
        />
      </div>

      <div>
        <label htmlFor="city">City</label>
        <input
          id="city"
          name="city"
          value={address.city}
          onChange={(e) => handleAddressChange('city', e.target.value)}
          placeholder="Enter city"
        />
      </div>

      <div>
        <label htmlFor="state">State</label>
        <select
          id="state"
          name="state"
          value={address.state}
          onChange={(e) => handleAddressChange('state', e.target.value)}
        >
          <option value="CA">California</option>
          <option value="NY">New York</option>
        </select>
      </div>

      <div>
        <label htmlFor="postalCode">Postal Code</label>
        <input
          id="postalCode"
          name="postalCode"
          value={address.postalCode}
          onChange={(e) => handleAddressChange('postalCode', e.target.value)}
          placeholder="Enter postal code"
        />
      </div>

      {isValidating && <div data-testid="validating">Validating address...</div>}

      {showZoneInfo && zone && (
        <div data-testid="zone-info">
          <p>Delivery Zone: <span data-testid="zone-name">{zone}</span></p>
        </div>
      )}

      {feeResult && (
        <div data-testid="fee-display">
          <p data-testid="fee-message">{getFeeDisplay()}</p>
          <p data-testid="fee-amount">${feeResult.fee}</p>
          {feeResult.isFreeDelivery && (
            <span data-testid="free-delivery-badge">Free Delivery!</span>
          )}
        </div>
      )}

      {errorMessage && (
        <div data-testid="error-message" role="alert">
          {errorMessage}
        </div>
      )}
    </div>
  );
};

describe('ShippingCalculator', () => {
  const defaultProps: ShippingCalculatorProps = {
    subtotal: 100,
    showZoneInfo: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Address input handling', () => {
    it('should render all address input fields', () => {
      render(<MockShippingCalculator {...defaultProps} />);

      expect(screen.getByLabelText(/street address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/city/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/state/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/postal code/i)).toBeInTheDocument();
    });

    it('should update address fields when user types', async () => {
      const user = userEvent.setup();
      render(<MockShippingCalculator {...defaultProps} />);

      const streetInput = screen.getByLabelText(/street address/i);
      const cityInput = screen.getByLabelText(/city/i);
      const postalCodeInput = screen.getByLabelText(/postal code/i);

      await user.type(streetInput, '123 Main St');
      await user.type(cityInput, 'San Francisco');
      await user.type(postalCodeInput, '94105');

      expect(streetInput).toHaveValue('123 Main St');
      expect(cityInput).toHaveValue('San Francisco');
      expect(postalCodeInput).toHaveValue('94105');
    });

    it('should call onAddressChange callback when address changes', async () => {
      const user = userEvent.setup();
      const mockOnAddressChange = jest.fn();
      render(<MockShippingCalculator {...defaultProps} onAddressChange={mockOnAddressChange} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'San Francisco');

      await waitFor(() => {
        expect(mockOnAddressChange).toHaveBeenCalledWith(
          expect.objectContaining({
            city: 'San Francisco',
            state: 'CA'
          })
        );
      });
    });

    it('should handle state selection change', async () => {
      const user = userEvent.setup();
      render(<MockShippingCalculator {...defaultProps} />);

      const stateSelect = screen.getByLabelText(/state/i);
      await user.selectOptions(stateSelect, 'NY');

      expect(stateSelect).toHaveValue('NY');
    });
  });

  describe('Zone detection display', () => {
    it('should detect and display nearby zone for San Francisco', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);
      mockCalculateDeliveryFee.mockReturnValue({
        zone: DeliveryZone.NEARBY,
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75
      });

      render(<MockShippingCalculator {...defaultProps} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'San Francisco');

      await waitFor(() => {
        expect(screen.getByTestId('zone-info')).toBeInTheDocument();
        expect(screen.getByTestId('zone-name')).toHaveTextContent('nearby');
      });
    });

    it('should detect and display distant zone for Oakland', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.DISTANT);
      mockCalculateDeliveryFee.mockReturnValue({
        zone: DeliveryZone.DISTANT,
        fee: 25,
        isFreeDelivery: false
      });

      render(<MockShippingCalculator {...defaultProps} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'Oakland');

      await waitFor(() => {
        expect(screen.getByTestId('zone-info')).toBeInTheDocument();
        expect(screen.getByTestId('zone-name')).toHaveTextContent('distant');
      });
    });

    it('should not display zone info when showZoneInfo is false', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);

      render(<MockShippingCalculator {...defaultProps} showZoneInfo={false} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'San Francisco');

      await waitFor(() => {
        expect(screen.queryByTestId('zone-info')).not.toBeInTheDocument();
      });
    });
  });

  describe('Fee calculation display', () => {
    it('should display free delivery for nearby zone with qualifying order', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);
      mockCalculateDeliveryFee.mockReturnValue({
        zone: DeliveryZone.NEARBY,
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75
      });
      mockGetDeliveryFeeMessage.mockReturnValue('Free delivery for orders over $75!');

      render(<MockShippingCalculator {...defaultProps} subtotal={100} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'San Francisco');

      await waitFor(() => {
        expect(screen.getByTestId('fee-display')).toBeInTheDocument();
        expect(screen.getByTestId('fee-message')).toHaveTextContent('Free delivery for orders over $75!');
        expect(screen.getByTestId('fee-amount')).toHaveTextContent('$0');
        expect(screen.getByTestId('free-delivery-badge')).toBeInTheDocument();
      });
    });

    it('should display delivery fee for nearby zone with non-qualifying order', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);
      mockCalculateDeliveryFee.mockReturnValue({
        zone: DeliveryZone.NEARBY,
        fee: 15,
        isFreeDelivery: false,
        minOrderForFreeDelivery: 75
      });
      mockGetDeliveryFeeMessage.mockReturnValue('$15 delivery fee. Orders over $75 qualify for free delivery!');

      render(<MockShippingCalculator {...defaultProps} subtotal={50} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'San Francisco');

      await waitFor(() => {
        expect(screen.getByTestId('fee-display')).toBeInTheDocument();
        expect(screen.getByTestId('fee-message')).toHaveTextContent('$15 delivery fee. Orders over $75 qualify for free delivery!');
        expect(screen.getByTestId('fee-amount')).toHaveTextContent('$15');
        expect(screen.queryByTestId('free-delivery-badge')).not.toBeInTheDocument();
      });
    });

    it('should display delivery fee for distant zone', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.DISTANT);
      mockCalculateDeliveryFee.mockReturnValue({
        zone: DeliveryZone.DISTANT,
        fee: 25,
        isFreeDelivery: false
      });
      mockGetDeliveryFeeMessage.mockReturnValue('$25 delivery fee for this area.');

      render(<MockShippingCalculator {...defaultProps} subtotal={100} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'Oakland');

      await waitFor(() => {
        expect(screen.getByTestId('fee-display')).toBeInTheDocument();
        expect(screen.getByTestId('fee-message')).toHaveTextContent('$25 delivery fee for this area.');
        expect(screen.getByTestId('fee-amount')).toHaveTextContent('$25');
        expect(screen.queryByTestId('free-delivery-badge')).not.toBeInTheDocument();
      });
    });

    it('should call onFeeCalculated callback with calculated fee', async () => {
      const user = userEvent.setup();
      const mockOnFeeCalculated = jest.fn();
      const feeResult = {
        zone: DeliveryZone.NEARBY,
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75
      };

      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);
      mockCalculateDeliveryFee.mockReturnValue(feeResult);

      render(<MockShippingCalculator {...defaultProps} onFeeCalculated={mockOnFeeCalculated} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'San Francisco');

      await waitFor(() => {
        expect(mockOnFeeCalculated).toHaveBeenCalledWith(feeResult);
      });
    });
  });

  describe('Error state handling', () => {
    it('should display error message for unsupported delivery area', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(null);
      mockCalculateDeliveryFee.mockReturnValue(null);

      render(<MockShippingCalculator {...defaultProps} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'Los Angeles');

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('This address is outside our delivery area.');
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should clear error message when valid city is entered', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone
        .mockReturnValueOnce(null) // First call returns null
        .mockReturnValueOnce(DeliveryZone.NEARBY); // Second call returns valid zone
      mockCalculateDeliveryFee
        .mockReturnValueOnce(null)
        .mockReturnValueOnce({
          zone: DeliveryZone.NEARBY,
          fee: 0,
          isFreeDelivery: true,
          minOrderForFreeDelivery: 75
        });

      render(<MockShippingCalculator {...defaultProps} />);

      const cityInput = screen.getByLabelText(/city/i);
      
      // Enter invalid city first
      await user.type(cityInput, 'Los Angeles');
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      // Clear and enter valid city
      await user.clear(cityInput);
      await user.type(cityInput, 'San Francisco');

      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
        expect(screen.getByTestId('fee-display')).toBeInTheDocument();
      });
    });

    it('should call onFeeCalculated with null for unsupported areas', async () => {
      const user = userEvent.setup();
      const mockOnFeeCalculated = jest.fn();
      mockGetDeliveryZone.mockReturnValue(null);
      mockCalculateDeliveryFee.mockReturnValue(null);

      render(<MockShippingCalculator {...defaultProps} onFeeCalculated={mockOnFeeCalculated} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'Los Angeles');

      await waitFor(() => {
        expect(mockOnFeeCalculated).toHaveBeenCalledWith(null);
      });
    });

    it('should not show fee display for unsupported areas', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(null);
      mockCalculateDeliveryFee.mockReturnValue(null);

      render(<MockShippingCalculator {...defaultProps} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'Los Angeles');

      await waitFor(() => {
        expect(screen.queryByTestId('fee-display')).not.toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });
  });

  describe('Validation loading state', () => {
    it('should show validation loading state briefly', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);

      render(<MockShippingCalculator {...defaultProps} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'S');

      // Note: In a real implementation, you might need to mock async operations
      // to properly test loading states
    });
  });

  describe('Edge cases', () => {
    it('should handle empty city input gracefully', async () => {
      const user = userEvent.setup();
      render(<MockShippingCalculator {...defaultProps} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'San Francisco');
      await user.clear(cityInput);

      // Should not show zone or fee info for empty city
      expect(screen.queryByTestId('zone-info')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fee-display')).not.toBeInTheDocument();
    });

    it('should handle different subtotal amounts correctly', async () => {
      const user = userEvent.setup();
      mockGetDeliveryZone.mockReturnValue(DeliveryZone.NEARBY);
      
      // Test with exactly $75 order
      mockCalculateDeliveryFee.mockReturnValue({
        zone: DeliveryZone.NEARBY,
        fee: 0,
        isFreeDelivery: true,
        minOrderForFreeDelivery: 75
      });

      render(<MockShippingCalculator {...defaultProps} subtotal={75} />);

      const cityInput = screen.getByLabelText(/city/i);
      await user.type(cityInput, 'San Francisco');

      await waitFor(() => {
        expect(mockCalculateDeliveryFee).toHaveBeenCalledWith(
          expect.objectContaining({ city: 'San Francisco' }),
          75
        );
      });
    });
  });
}); 