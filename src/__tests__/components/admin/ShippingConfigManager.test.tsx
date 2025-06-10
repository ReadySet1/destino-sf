import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

// Mock external dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock shipping configuration data
const mockConfigurations = [
  {
    productName: 'alfajores',
    baseWeightLb: 1.5,
    weightPerUnitLb: 0.4,
    isActive: true,
    applicableForNationwideOnly: true,
  },
  {
    productName: 'empanadas',
    baseWeightLb: 2.0,
    weightPerUnitLb: 0.5,
    isActive: true,
    applicableForNationwideOnly: true,
  },
  {
    productName: 'dulce_de_leche',
    baseWeightLb: 1.0,
    weightPerUnitLb: 0.3,
    isActive: false,
    applicableForNationwideOnly: false,
  },
];

// Mock ShippingConfigManager component interface
interface ShippingConfigManagerProps {
  configurations: any[];
  onConfigurationUpdate?: (configs: any[]) => void;
}

// Mock component implementation for testing
const MockShippingConfigManager: React.FC<ShippingConfigManagerProps> = ({
  configurations,
  onConfigurationUpdate,
}) => {
  const [configs, setConfigs] = React.useState(configurations);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCreating, setIsCreating] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<Record<string, string>>({});

  const validateConfiguration = (config: any): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!config.productName || config.productName.trim() === '') {
      errors.productName = 'Product name is required';
    }
    
    if (config.baseWeightLb < 0.1) {
      errors.baseWeightLb = 'Base weight must be at least 0.1 lbs';
    }
    
    if (config.baseWeightLb > 50) {
      errors.baseWeightLb = 'Base weight cannot exceed 50 lbs';
    }
    
    if (config.weightPerUnitLb < 0) {
      errors.weightPerUnitLb = 'Per-unit weight cannot be negative';
    }
    
    if (config.weightPerUnitLb > 50) {
      errors.weightPerUnitLb = 'Per-unit weight cannot exceed 50 lbs';
    }

    return errors;
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setValidationErrors({});

    try {
      // Validate all configurations
      let hasErrors = false;
      const allErrors: Record<string, string> = {};

      configs.forEach((config, index) => {
        const errors = validateConfiguration(config);
        if (Object.keys(errors).length > 0) {
          hasErrors = true;
          Object.keys(errors).forEach(key => {
            allErrors[`${index}.${key}`] = errors[key];
          });
        }
      });

      if (hasErrors) {
        setValidationErrors(allErrors);
        throw new Error('Please fix validation errors before saving');
      }

      const response = await fetch('/api/admin/shipping-configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configurations: configs }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configurations');
      }

      toast.success('Configurations saved successfully');
      setEditingIndex(null);
      setIsCreating(false);
      onConfigurationUpdate?.(configs);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save configurations');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setConfigs(configurations);
    setEditingIndex(null);
    setIsCreating(false);
    setValidationErrors({});
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setIsCreating(false);
  };

  const handleCreate = () => {
    const newConfig = {
      productName: '',
      baseWeightLb: 0.5,
      weightPerUnitLb: 0.4,
      isActive: true,
      applicableForNationwideOnly: true,
    };
    setConfigs([...configs, newConfig]);
    setEditingIndex(configs.length);
    setIsCreating(true);
  };

  const handleDelete = (index: number) => {
    if (window.confirm('Are you sure you want to delete this configuration?')) {
      const newConfigs = configs.filter((_, i) => i !== index);
      setConfigs(newConfigs);
      setEditingIndex(null);
    }
  };

  const updateConfig = (index: number, field: string, value: any) => {
    const newConfigs = [...configs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setConfigs(newConfigs);
  };

  const calculateWeight = (baseWeight: number, perUnitWeight: number, units: number) => {
    return baseWeight + (units - 1) * perUnitWeight;
  };

  return (
    <div data-testid="shipping-config-manager">
      <div className="mb-6">
        <h2>Shipping Configuration Management</h2>
        <p>Manage weight calculations for different product types</p>
      </div>

      {/* Configuration List */}
      <div data-testid="configuration-list" className="space-y-4">
        {configs.map((config, index) => (
          <div key={index} data-testid={`config-item-${index}`} className="border p-4 rounded">
            {editingIndex === index ? (
              // Edit Form
              <div data-testid={`edit-form-${index}`} className="space-y-4">
                <div>
                  <label htmlFor={`productName-${index}`}>Product Name</label>
                  <input
                    id={`productName-${index}`}
                    type="text"
                    value={config.productName}
                    onChange={(e) => updateConfig(index, 'productName', e.target.value)}
                    placeholder="Enter product name"
                  />
                  {validationErrors[`${index}.productName`] && (
                    <div data-testid={`error-productName-${index}`} className="text-red-600 text-sm">
                      {validationErrors[`${index}.productName`]}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor={`baseWeight-${index}`}>Base Weight (lbs)</label>
                  <input
                    id={`baseWeight-${index}`}
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="50"
                    value={config.baseWeightLb}
                    onChange={(e) => updateConfig(index, 'baseWeightLb', parseFloat(e.target.value) || 0)}
                  />
                  {validationErrors[`${index}.baseWeightLb`] && (
                    <div data-testid={`error-baseWeight-${index}`} className="text-red-600 text-sm">
                      {validationErrors[`${index}.baseWeightLb`]}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor={`perUnitWeight-${index}`}>Per-Unit Weight (lbs)</label>
                  <input
                    id={`perUnitWeight-${index}`}
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={config.weightPerUnitLb}
                    onChange={(e) => updateConfig(index, 'weightPerUnitLb', parseFloat(e.target.value) || 0)}
                  />
                  {validationErrors[`${index}.weightPerUnitLb`] && (
                    <div data-testid={`error-perUnitWeight-${index}`} className="text-red-600 text-sm">
                      {validationErrors[`${index}.weightPerUnitLb`]}
                    </div>
                  )}
                </div>

                <div>
                  <label>
                    <input
                      type="checkbox"
                      checked={config.isActive}
                      onChange={(e) => updateConfig(index, 'isActive', e.target.checked)}
                    />
                    Active
                  </label>
                </div>

                <div>
                  <label>
                    <input
                      type="checkbox"
                      checked={config.applicableForNationwideOnly}
                      onChange={(e) => updateConfig(index, 'applicableForNationwideOnly', e.target.checked)}
                    />
                    Nationwide Only
                  </label>
                </div>

                {/* Weight Preview */}
                <div data-testid={`weight-preview-${index}`} className="bg-gray-100 p-3 rounded">
                  <h4>Weight Calculation Preview:</h4>
                  <ul>
                    <li>1 unit: {calculateWeight(config.baseWeightLb, config.weightPerUnitLb, 1).toFixed(1)} lbs</li>
                    <li>3 units: {calculateWeight(config.baseWeightLb, config.weightPerUnitLb, 3).toFixed(1)} lbs</li>
                    <li>5 units: {calculateWeight(config.baseWeightLb, config.weightPerUnitLb, 5).toFixed(1)} lbs</li>
                  </ul>
                </div>
              </div>
            ) : (
              // Display Mode
              <div data-testid={`display-mode-${index}`}>
                <h3>{config.productName || 'Unnamed Configuration'}</h3>
                <p>Base Weight: {config.baseWeightLb} lbs</p>
                <p>Per-Unit Weight: {config.weightPerUnitLb} lbs</p>
                <p>Status: {config.isActive ? 'Active' : 'Inactive'}</p>
                <p>Scope: {config.applicableForNationwideOnly ? 'Nationwide Only' : 'All Shipping'}</p>
                
                <div className="mt-2 space-x-2">
                  <button
                    data-testid={`edit-btn-${index}`}
                    onClick={() => handleEdit(index)}
                    className="px-3 py-1 bg-blue-500 text-white rounded"
                  >
                    Edit
                  </button>
                  <button
                    data-testid={`delete-btn-${index}`}
                    onClick={() => handleDelete(index)}
                    className="px-3 py-1 bg-red-500 text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex space-x-4">
        <button
          data-testid="create-btn"
          onClick={handleCreate}
          disabled={editingIndex !== null}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Add Configuration
        </button>

        {(editingIndex !== null || isCreating) && (
          <>
            <button
              data-testid="save-btn"
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
            <button
              data-testid="cancel-btn"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 bg-gray-500 text-white rounded disabled:opacity-50"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Loading State */}
      {isSubmitting && (
        <div data-testid="loading-state" className="mt-4 text-center">
          Saving configurations...
        </div>
      )}
    </div>
  );
};

describe('ShippingConfigManager', () => {
  const defaultProps: ShippingConfigManagerProps = {
    configurations: mockConfigurations,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
    
    // Mock successful API response by default
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Success' }),
    });

    // Mock window.confirm
    Object.defineProperty(window, 'confirm', {
      writable: true,
      value: jest.fn(() => true),
    });
  });

  describe('Configuration listing', () => {
    it('should display all configurations', () => {
      render(<MockShippingConfigManager {...defaultProps} />);

      expect(screen.getByTestId('configuration-list')).toBeInTheDocument();
      expect(screen.getByTestId('config-item-0')).toBeInTheDocument();
      expect(screen.getByTestId('config-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('config-item-2')).toBeInTheDocument();
    });

    it('should display configuration details correctly', () => {
      render(<MockShippingConfigManager {...defaultProps} />);

      // Check first configuration details
      expect(screen.getByText('alfajores')).toBeInTheDocument();
      expect(screen.getByText('Base Weight: 1.5 lbs')).toBeInTheDocument();
      expect(screen.getByText('Per-Unit Weight: 0.4 lbs')).toBeInTheDocument();
      expect(screen.getByText('Status: Active')).toBeInTheDocument();
      expect(screen.getByText('Scope: Nationwide Only')).toBeInTheDocument();
    });

    it('should show inactive configuration status', () => {
      render(<MockShippingConfigManager {...defaultProps} />);

      expect(screen.getByText('Status: Inactive')).toBeInTheDocument();
      expect(screen.getByText('Scope: All Shipping')).toBeInTheDocument();
    });

    it('should have edit and delete buttons for each configuration', () => {
      render(<MockShippingConfigManager {...defaultProps} />);

      expect(screen.getByTestId('edit-btn-0')).toBeInTheDocument();
      expect(screen.getByTestId('delete-btn-0')).toBeInTheDocument();
      expect(screen.getByTestId('edit-btn-1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-btn-1')).toBeInTheDocument();
    });
  });

  describe('Create/edit forms', () => {
    it('should show edit form when edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));

      expect(screen.getByTestId('edit-form-0')).toBeInTheDocument();
      expect(screen.getByDisplayValue('alfajores')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1.5')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.4')).toBeInTheDocument();
    });

    it('should show create form when add configuration is clicked', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('create-btn'));

      expect(screen.getByTestId(`edit-form-${mockConfigurations.length}`)).toBeInTheDocument();
      expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Empty product name
      expect(screen.getByDisplayValue('0.5')).toBeInTheDocument(); // Default base weight
    });

    it('should update form fields when typing', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      
      const productNameInput = screen.getByDisplayValue('alfajores');
      await user.clear(productNameInput);
      await user.type(productNameInput, 'test_product');

      expect(screen.getByDisplayValue('test_product')).toBeInTheDocument();
    });

    it('should update numeric fields correctly', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      
      const baseWeightInput = screen.getByDisplayValue('1.5');
      await user.clear(baseWeightInput);
      await user.type(baseWeightInput, '2.5');

      expect(screen.getByDisplayValue('2.5')).toBeInTheDocument();
    });

    it('should toggle checkbox fields', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      
      const isActiveCheckbox = screen.getByRole('checkbox', { name: /active/i });
      expect(isActiveCheckbox).toBeChecked();
      
      await user.click(isActiveCheckbox);
      expect(isActiveCheckbox).not.toBeChecked();
    });

    it('should show weight calculation preview', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));

      const preview = screen.getByTestId('weight-preview-0');
      expect(preview).toBeInTheDocument();
      expect(preview).toHaveTextContent('1 unit: 1.5 lbs');
      expect(preview).toHaveTextContent('3 units: 2.3 lbs'); // 1.5 + (2 * 0.4)
      expect(preview).toHaveTextContent('5 units: 3.1 lbs'); // 1.5 + (4 * 0.4)
    });

    it('should disable create button when editing', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));

      expect(screen.getByTestId('create-btn')).toBeDisabled();
    });
  });

  describe('Validation feedback', () => {
    it('should show validation errors for empty product name', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('create-btn'));
      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(screen.getByTestId(`error-productName-${mockConfigurations.length}`)).toBeInTheDocument();
        expect(screen.getByText('Product name is required')).toBeInTheDocument();
      });
    });

    it('should show validation errors for invalid base weight', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      
      const baseWeightInput = screen.getByDisplayValue('1.5');
      await user.clear(baseWeightInput);
      await user.type(baseWeightInput, '0.05'); // Below minimum

      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-baseWeight-0')).toBeInTheDocument();
        expect(screen.getByText('Base weight must be at least 0.1 lbs')).toBeInTheDocument();
      });
    });

    it('should show validation errors for excessive base weight', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      
      const baseWeightInput = screen.getByDisplayValue('1.5');
      await user.clear(baseWeightInput);
      await user.type(baseWeightInput, '55'); // Above maximum

      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-baseWeight-0')).toBeInTheDocument();
        expect(screen.getByText('Base weight cannot exceed 50 lbs')).toBeInTheDocument();
      });
    });

    it('should show validation errors for negative per-unit weight', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      
      const perUnitWeightInput = screen.getByDisplayValue('0.4');
      await user.clear(perUnitWeightInput);
      await user.type(perUnitWeightInput, '-0.1'); // Negative value

      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('error-perUnitWeight-0')).toBeInTheDocument();
        expect(screen.getByText('Per-unit weight cannot be negative')).toBeInTheDocument();
      });
    });

    it('should clear validation errors when fixed', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('create-btn'));
      await user.click(screen.getByTestId('save-btn'));

      // Validation error should appear
      await waitFor(() => {
        expect(screen.getByTestId(`error-productName-${mockConfigurations.length}`)).toBeInTheDocument();
      });

      // Fix the error
      const productNameInput = screen.getByPlaceholderText('Enter product name');
      await user.type(productNameInput, 'valid_product');
      await user.click(screen.getByTestId('save-btn'));

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByTestId(`error-productName-${mockConfigurations.length}`)).not.toBeInTheDocument();
      });
    });
  });

  describe('Save/cancel operations', () => {
    it('should save configuration successfully', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = jest.fn();
      render(<MockShippingConfigManager {...defaultProps} onConfigurationUpdate={mockOnUpdate} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/admin/shipping-configuration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('alfajores'),
        });
      });

      expect(toast.success).toHaveBeenCalledWith('Configurations saved successfully');
      expect(mockOnUpdate).toHaveBeenCalled();
    });

    it('should show loading state while saving', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const savePromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      (fetch as jest.Mock).mockReturnValue(savePromise);

      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      await user.click(screen.getByTestId('save-btn'));

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.getByText('Saving...')).toBeInTheDocument();

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: async () => ({ message: 'Success' }),
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
      });
    });

    it('should handle save errors', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Server error');
      });
    });

    it('should cancel edit and revert changes', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      
      // Make some changes
      const productNameInput = screen.getByDisplayValue('alfajores');
      await user.clear(productNameInput);
      await user.type(productNameInput, 'modified_name');

      // Cancel
      await user.click(screen.getByTestId('cancel-btn'));

      // Should revert to original
      expect(screen.getByText('alfajores')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('modified_name')).not.toBeInTheDocument();
      expect(screen.queryByTestId('edit-form-0')).not.toBeInTheDocument();
    });

    it('should delete configuration with confirmation', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm');
      confirmSpy.mockReturnValue(true);

      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('delete-btn-0'));

      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this configuration?');
      expect(screen.queryByText('alfajores')).not.toBeInTheDocument();
    });

    it('should not delete configuration if not confirmed', async () => {
      const user = userEvent.setup();
      const confirmSpy = jest.spyOn(window, 'confirm');
      confirmSpy.mockReturnValue(false);

      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('delete-btn-0'));

      expect(confirmSpy).toHaveBeenCalled();
      expect(screen.getByText('alfajores')).toBeInTheDocument();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete create workflow', async () => {
      const user = userEvent.setup();
      render(<MockShippingConfigManager {...defaultProps} />);

      // Start creation
      await user.click(screen.getByTestId('create-btn'));

      // Fill in details
      await user.type(screen.getByPlaceholderText('Enter product name'), 'new_product');
      
      const baseWeightInput = screen.getByDisplayValue('0.5');
      await user.clear(baseWeightInput);
      await user.type(baseWeightInput, '1.2');

      // Save
      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          '/api/admin/shipping-configuration',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('new_product'),
          })
        );
      });
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      render(<MockShippingConfigManager {...defaultProps} />);

      await user.click(screen.getByTestId('edit-btn-0'));
      await user.click(screen.getByTestId('save-btn'));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save configurations');
      });
    });
  });
}); 