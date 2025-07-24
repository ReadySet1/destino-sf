import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeliveryZoneManager from '@/components/admin/DeliveryZoneManager';

// Mock fetch globally
global.fetch = jest.fn();

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock console methods to capture logs
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(() => {}),
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('DeliveryZoneManager - Toggle Functionality', () => {
  const mockZones = [
    {
      id: 'zone-1',
      zone: 'sf_downtown',
      name: 'Downtown San Francisco',
      description: 'Downtown area',
      minimumAmount: 250.0,
      deliveryFee: 50.0,
      estimatedDeliveryTime: '1-2 hours',
      isActive: true,
      postalCodes: ['94102', '94103'],
      cities: ['San Francisco'],
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'zone-2',
      zone: 'sf_outside',
      name: 'Outside San Francisco',
      description: 'Outside SF area',
      minimumAmount: 350.0,
      deliveryFee: 75.0,
      estimatedDeliveryTime: '2-3 hours',
      isActive: false,
      postalCodes: ['94104', '94105'],
      cities: ['Daly City'],
      displayOrder: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy.log.mockClear();
    consoleSpy.error.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Load', () => {
    test('should load delivery zones on mount', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deliveryZones: mockZones }),
      });

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/delivery-zones');
      });

      expect(screen.getByText('Downtown San Francisco')).toBeInTheDocument();
      expect(screen.getByText('Outside San Francisco')).toBeInTheDocument();
    });

    test('should show loading state initially', () => {
      (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<DeliveryZoneManager />);
      expect(screen.getByText('Loading Delivery Zones...')).toBeInTheDocument();
    });

    test('should handle load errors gracefully', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(consoleSpy.error).toHaveBeenCalledWith(
          '❌ Error loading delivery zones:',
          expect.any(Error)
        );
      });
    });
  });

  describe('Toggle Functionality', () => {
    beforeEach(() => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deliveryZones: mockZones }),
      });
    });

    test('should toggle zone status optimistically', async () => {
      const user = userEvent.setup();
      
      // Mock successful API response
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Zone updated successfully' }),
      });

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Downtown San Francisco')).toBeInTheDocument();
      });

      // Find the toggle switch for the first zone
      const toggle = screen.getByRole('switch', { name: /downtown san francisco/i });
      
      // Check initial state
      expect(toggle).toBeChecked();

      // Toggle off
      await user.click(toggle);

      // Should immediately show as unchecked (optimistic update)
      expect(toggle).not.toBeChecked();

      // Verify API call was made
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/delivery-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockZones[0],
            isActive: false,
          }),
        });
      });

      // Verify optimistic update logs
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '🔄 Optimistically updating zone zone-1 to false'
      );
    });

    test('should prevent multiple rapid clicks', async () => {
      const user = userEvent.setup();
      
      // Mock slow API response
      (fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Downtown San Francisco')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', { name: /downtown san francisco/i });
      
      // Click multiple times rapidly
      await user.click(toggle);
      await user.click(toggle);
      await user.click(toggle);

      // Should only make one API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2); // 1 for initial load + 1 for toggle
      });
    });

    test('should show loading spinner during toggle', async () => {
      const user = userEvent.setup();
      
      // Mock slow API response
      (fetch as any).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Downtown San Francisco')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', { name: /downtown san francisco/i });
      
      // Click toggle
      await user.click(toggle);

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /downtown san francisco/i })).toBeDisabled();
      });
    });

    test('should rollback on API error', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Downtown San Francisco')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', { name: /downtown san francisco/i });
      
      // Check initial state
      expect(toggle).toBeChecked();

      // Toggle off
      await user.click(toggle);

      // Should immediately show as unchecked (optimistic update)
      expect(toggle).not.toBeChecked();

      // Wait for API call to fail
      await waitFor(() => {
        expect(consoleSpy.log).toHaveBeenCalledWith(
          '🔄 Rolling back optimistic update for zone: zone-1'
        );
      });

      // Should revert to checked state (rollback)
      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /downtown san francisco/i })).toBeChecked();
      });
    });

    test('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock network error
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Downtown San Francisco')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', { name: /downtown san francisco/i });
      
      // Toggle off
      await user.click(toggle);

      // Should rollback on error
      await waitFor(() => {
        expect(consoleSpy.log).toHaveBeenCalledWith(
          '🔄 Rolling back optimistic update for zone: zone-1'
        );
      });

      // Should revert to original state
      await waitFor(() => {
        expect(screen.getByRole('switch', { name: /downtown san francisco/i })).toBeChecked();
      });
    });
  });

  describe('Form Functionality', () => {
    beforeEach(() => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deliveryZones: mockZones }),
      });
    });

    test('should open add zone form', async () => {
      const user = userEvent.setup();

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Add Zone')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Zone'));

      expect(screen.getByText('Add New Zone')).toBeInTheDocument();
      expect(screen.getByLabelText('Zone Identifier')).toBeInTheDocument();
      expect(screen.getByLabelText('Zone Name')).toBeInTheDocument();
    });

    test('should open edit zone form', async () => {
      const user = userEvent.setup();

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Downtown San Francisco')).toBeInTheDocument();
      });

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      expect(screen.getByText('Edit Zone')).toBeInTheDocument();
      expect(screen.getByDisplayValue('sf_downtown')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Downtown San Francisco')).toBeInTheDocument();
    });

    test('should save zone successfully', async () => {
      const user = userEvent.setup();
      
      // Mock successful save
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Zone created successfully' }),
      });

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Add Zone')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Zone'));

      // Fill form
      await user.type(screen.getByLabelText('Zone Identifier'), 'test_zone');
      await user.type(screen.getByLabelText('Zone Name'), 'Test Zone');
      await user.type(screen.getByLabelText('Minimum Amount ($)'), '100');
      await user.type(screen.getByLabelText('Delivery Fee ($)'), '25');

      await user.click(screen.getByText('Save Zone'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/delivery-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test_zone'),
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle validation errors', async () => {
      const user = userEvent.setup();

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Add Zone')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add Zone'));

      // Try to save without required fields
      await user.click(screen.getByText('Save Zone'));

      // Should show validation error
      expect(screen.getByText('Zone name and identifier are required')).toBeInTheDocument();
    });

    test('should handle API validation errors', async () => {
      const user = userEvent.setup();
      
      // Mock API validation error
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ 
          error: 'Validation failed',
          details: [{ message: 'Zone identifier is required' }]
        }),
      });

      render(<DeliveryZoneManager />);

      await waitFor(() => {
        expect(screen.getByText('Downtown San Francisco')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', { name: /downtown san francisco/i });
      await user.click(toggle);

      // Should rollback and show error
      await waitFor(() => {
        expect(consoleSpy.log).toHaveBeenCalledWith(
          '🔄 Rolling back optimistic update for zone: zone-1'
        );
      });
    });
  });
}); 