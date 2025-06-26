import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SpotlightPickModal } from '@/components/admin/SpotlightPicks/SpotlightPickModal';
import { SpotlightPick } from '@/types/spotlight';

// Mock the toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock child components
jest.mock('@/components/admin/SpotlightPicks/ProductSelector', () => {
  return function MockProductSelector({ onProductSelect, selectedProduct }: any) {
    return (
      <div data-testid="product-selector">
        Product Selector
        <button
          data-testid="select-product-btn"
          onClick={() => onProductSelect({
            id: 'product-123',
            name: 'Test Product',
            price: 10.99,
            images: ['test-image.jpg'],
          })}
        >
          Select Product
        </button>
        {selectedProduct && (
          <div data-testid="selected-product">{selectedProduct.name}</div>
        )}
      </div>
    );
  };
});

jest.mock('@/components/admin/SpotlightPicks/ImageUploader', () => {
  return function MockImageUploader({ onImageUpload, currentImageUrl }: any) {
    return (
      <div data-testid="image-uploader">
        Image Uploader
        <button
          data-testid="upload-image-btn"
          onClick={() => onImageUpload('https://example.com/uploaded-image.jpg')}
        >
          Upload Image
        </button>
        {currentImageUrl && (
          <div data-testid="current-image">{currentImageUrl}</div>
        )}
      </div>
    );
  };
});

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Package: () => <div data-testid="package-icon">Package</div>,
  Image: () => <div data-testid="image-icon">Image</div>,
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  X: () => <div data-testid="x-icon">X</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
}));

describe('SpotlightPickModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();
  const mockCategories = [
    { id: 'cat-1', name: 'Alfajores', slug: 'alfajores' },
    { id: 'cat-2', name: 'Empanadas', slug: 'empanadas' },
  ];

  const mockExistingPick: SpotlightPick = {
    id: 'pick-1',
    position: 1,
    productId: 'product-123',
    customTitle: null,
    customDescription: null,
    customImageUrl: null,
    customPrice: null,
    personalizeText: 'Perfect for your special occasion',
    customLink: null,
    showNewFeatureModal: false,
    newFeatureTitle: null,
    newFeatureDescription: null,
    newFeatureBadgeText: null,
    isCustom: false,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    product: {
      id: 'product-123',
      name: 'Dulce de Leche Alfajores',
      description: 'Traditional Argentine cookies',
      images: ['https://example.com/alfajor.jpg'],
      price: 12.99,
      slug: 'alfajores-dulce-de-leche',
      category: {
        name: 'ALFAJORES',
        slug: 'alfajores',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe('Modal Rendering', () => {
    it('should render modal when open', () => {
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      expect(screen.getByText('Edit Spotlight Pick - Position 1')).toBeInTheDocument();
      expect(screen.getByText('Configure what appears in position 1 of the spotlight picks section')).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
      render(
        <SpotlightPickModal
          isOpen={false}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      expect(screen.queryByText('Edit Spotlight Pick - Position 1')).not.toBeInTheDocument();
    });
  });

  describe('Content Type Toggle', () => {
    it('should default to product-based mode', () => {
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      expect(screen.getByText('Use Existing Product')).toBeInTheDocument();
      expect(screen.getByTestId('product-selector')).toBeInTheDocument();
      expect(screen.queryByText('Custom Content')).toBeInTheDocument();
    });

    it('should switch to custom mode when custom option is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Click custom content option
      const customOption = screen.getByText('Custom Content').closest('div');
      await user.click(customOption!);

      expect(screen.getByLabelText('Title *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Personalize Text')).toBeInTheDocument();
      expect(screen.getByLabelText('Price ($)')).toBeInTheDocument();
      expect(screen.getByTestId('image-uploader')).toBeInTheDocument();
    });
  });

  describe('Product-Based Mode', () => {
    it('should handle product selection', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Select a product
      const selectProductBtn = screen.getByTestId('select-product-btn');
      await user.click(selectProductBtn);

      expect(screen.getByTestId('selected-product')).toHaveTextContent('Test Product');
    });

    it('should submit product-based spotlight pick', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Select a product
      const selectProductBtn = screen.getByTestId('select-product-btn');
      await user.click(selectProductBtn);

      // Submit form
      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          position: 1,
          isCustom: false,
          productId: 'product-123',
          isActive: true,
        });
      });
    });
  });

  describe('Custom Mode', () => {
    it('should handle custom form input', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Switch to custom mode
      const customOption = screen.getByText('Custom Content').closest('div');
      await user.click(customOption!);

      // Fill in custom fields
      await user.type(screen.getByLabelText('Title *'), 'Custom Title');
      await user.type(screen.getByLabelText('Description'), 'Custom Description');
      await user.type(screen.getByLabelText('Personalize Text'), 'Custom Personalize Text');
      await user.type(screen.getByLabelText('Price ($)'), '25.99');

      // Upload image
      const uploadImageBtn = screen.getByTestId('upload-image-btn');
      await user.click(uploadImageBtn);

      expect(screen.getByTestId('current-image')).toHaveTextContent('https://example.com/uploaded-image.jpg');
    });

    it('should submit custom spotlight pick', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Switch to custom mode
      const customOption = screen.getByText('Custom Content').closest('div');
      await user.click(customOption!);

      // Fill in custom fields
      await user.type(screen.getByLabelText('Title *'), 'Custom Title');
      await user.type(screen.getByLabelText('Description'), 'Custom Description');
      await user.type(screen.getByLabelText('Personalize Text'), 'Custom Personalize Text');
      await user.type(screen.getByLabelText('Price ($)'), '25.99');

      // Submit form
      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          position: 1,
          isCustom: true,
          customTitle: 'Custom Title',
          customDescription: 'Custom Description',
          customPrice: 25.99,
          personalizeText: 'Custom Personalize Text',
          isActive: true,
        });
      });
    });
  });

  describe('Form Validation', () => {
    it('should show error for custom mode without title', async () => {
      const { toast } = await import('sonner');
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Switch to custom mode
      const customOption = screen.getByText('Custom Content').closest('div');
      await user.click(customOption!);

      // Try to submit without title
      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      expect(toast.error).toHaveBeenCalledWith('Custom title is required');
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should show error for product mode without product selection', async () => {
      const { toast } = await import('sonner');
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Try to submit without selecting product
      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      expect(toast.error).toHaveBeenCalledWith('Please select a product');
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Editing Existing Pick', () => {
    it('should initialize form with existing pick data', () => {
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={mockExistingPick}
          position={1}
          categories={mockCategories}
        />
      );

      // Should show product selector since it's a product-based pick
      expect(screen.getByTestId('product-selector')).toBeInTheDocument();
      expect(screen.getByTestId('selected-product')).toHaveTextContent('Dulce de Leche Alfajores');
    });

    it('should initialize form with custom pick data', () => {
      const customPick: SpotlightPick = {
        ...mockExistingPick,
        isCustom: true,
        productId: null,
        customTitle: 'Custom Title',
        customDescription: 'Custom Description',
        personalizeText: 'Custom Personalize Text',
        product: null,
      };

      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={customPick}
          position={1}
          categories={mockCategories}
        />
      );

      // Should show custom form fields with existing data
      expect(screen.getByDisplayValue('Custom Title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Custom Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Custom Personalize Text')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should disable save button when loading', async () => {
      const user = userEvent.setup();
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Select a product and submit
      const selectProductBtn = screen.getByTestId('select-product-btn');
      await user.click(selectProductBtn);

      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      // Button should be disabled while loading
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('should handle save errors gracefully', async () => {
      const user = userEvent.setup();
      const error = new Error('Failed to save');
      mockOnSave.mockRejectedValue(error);
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Select a product and submit
      const selectProductBtn = screen.getByTestId('select-product-btn');
      await user.click(selectProductBtn);

      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Should handle error without crashing
      expect(console.error).toHaveBeenCalledWith('Error saving spotlight pick:', error);
    });
  });

  describe('Custom Link Functionality', () => {
    it('should render custom link input field', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Switch to custom mode to see custom link field
      const customOption = screen.getByText('Custom Content').closest('div');
      await user.click(customOption!);

      expect(screen.getByLabelText('Custom Link')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('https://example.com or /internal-path')).toBeInTheDocument();
    });

    it('should save custom link data', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Switch to custom mode
      const customOption = screen.getByText('Custom Content').closest('div');
      await user.click(customOption!);

      // Fill in required fields and custom link
      await user.type(screen.getByLabelText('Title *'), 'Custom Title');
      await user.type(screen.getByLabelText('Custom Link'), 'https://special-promotion.com');

      // Submit form
      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            customLink: 'https://special-promotion.com',
          })
        );
      });
    });

    it('should initialize custom link field with existing data', () => {
      const customLinkPick: SpotlightPick = {
        ...mockExistingPick,
        isCustom: true,
        productId: null,
        customTitle: 'Link Product',
        customLink: 'https://existing-link.com',
        product: null,
      };

      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={customLinkPick}
          position={1}
          categories={mockCategories}
        />
      );

      expect(screen.getByDisplayValue('https://existing-link.com')).toBeInTheDocument();
    });
  });

  describe('New Features Modal Functionality', () => {
    it('should render new features modal settings section', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Should see new features modal section
      expect(screen.getByText('New Feature Modal Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure if this spotlight pick should show a new feature announcement modal')).toBeInTheDocument();
    });

    it('should show/hide new feature fields based on checkbox', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // New feature fields should not be visible initially
      expect(screen.queryByLabelText('Feature Title')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Feature Description')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Badge Text')).not.toBeInTheDocument();

      // Enable new feature modal
      const newFeatureCheckbox = screen.getByLabelText('Show New Feature Modal');
      await user.click(newFeatureCheckbox);

      // Now the fields should be visible
      expect(screen.getByLabelText('Feature Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Feature Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Badge Text')).toBeInTheDocument();
    });

    it('should save new features modal data', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Switch to custom mode to access all fields
      const customOption = screen.getByText('Custom Content').closest('div');
      await user.click(customOption!);

      // Fill in required fields
      await user.type(screen.getByLabelText('Title *'), 'New Feature Product');

      // Enable new feature modal
      const newFeatureCheckbox = screen.getByLabelText('Show New Feature Modal');
      await user.click(newFeatureCheckbox);

      // Fill in new feature fields
      await user.type(screen.getByLabelText('Feature Title'), 'Amazing New Feature');
      await user.type(screen.getByLabelText('Feature Description'), 'This will revolutionize your experience');
      await user.type(screen.getByLabelText('Badge Text'), 'BETA');

      // Submit form
      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            showNewFeatureModal: true,
            newFeatureTitle: 'Amazing New Feature',
            newFeatureDescription: 'This will revolutionize your experience',
            newFeatureBadgeText: 'BETA',
          })
        );
      });
    });

    it('should initialize new feature fields with existing data', () => {
      const newFeaturePick: SpotlightPick = {
        ...mockExistingPick,
        isCustom: true,
        productId: null,
        customTitle: 'Feature Product',
        showNewFeatureModal: true,
        newFeatureTitle: 'Existing Feature',
        newFeatureDescription: 'Existing description',
        newFeatureBadgeText: 'NEW',
        product: null,
      };

      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={newFeaturePick}
          position={1}
          categories={mockCategories}
        />
      );

      // Checkbox should be checked
      expect(screen.getByLabelText('Show New Feature Modal')).toBeChecked();
      
      // Fields should have existing values
      expect(screen.getByDisplayValue('Existing Feature')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('NEW')).toBeInTheDocument();
    });

    it('should validate required feature title when new feature modal is enabled', async () => {
      const { toast } = await import('sonner');
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Switch to custom mode
      const customOption = screen.getByText('Custom Content').closest('div');
      await user.click(customOption!);

      // Fill in required title
      await user.type(screen.getByLabelText('Title *'), 'Test Product');

      // Enable new feature modal but don't fill title
      const newFeatureCheckbox = screen.getByLabelText('Show New Feature Modal');
      await user.click(newFeatureCheckbox);

      // Try to submit without feature title
      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      expect(toast.error).toHaveBeenCalledWith('Feature title is required when new feature modal is enabled');
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Combined Features', () => {
    it('should save spotlight pick with both custom link and new features modal', async () => {
      const user = userEvent.setup();
      
      render(
        <SpotlightPickModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          currentPick={null}
          position={1}
          categories={mockCategories}
        />
      );

      // Switch to custom mode
      const customOption = screen.getByText('Custom Content').closest('div');
      await user.click(customOption!);

      // Fill in basic fields
      await user.type(screen.getByLabelText('Title *'), 'Ultimate Feature');
      await user.type(screen.getByLabelText('Custom Link'), 'https://ultimate-feature.com');

      // Enable new feature modal
      const newFeatureCheckbox = screen.getByLabelText('Show New Feature Modal');
      await user.click(newFeatureCheckbox);

      // Fill in new feature fields
      await user.type(screen.getByLabelText('Feature Title'), 'Revolutionary Product');
      await user.type(screen.getByLabelText('Feature Description'), 'This will change everything!');
      await user.type(screen.getByLabelText('Badge Text'), 'REVOLUTIONARY');

      // Submit form
      const saveButton = screen.getByText('Save Spotlight Pick');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            customTitle: 'Ultimate Feature',
            customLink: 'https://ultimate-feature.com',
            showNewFeatureModal: true,
            newFeatureTitle: 'Revolutionary Product',
            newFeatureDescription: 'This will change everything!',
            newFeatureBadgeText: 'REVOLUTIONARY',
          })
        );
      });
    });
  });
}); 