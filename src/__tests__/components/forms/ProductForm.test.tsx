// src/__tests__/components/forms/ProductForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import CateringPackageForm from '@/components/Catering/CateringPackageForm';
import { createCateringPackage, updateCateringPackage } from '@/actions/catering';
import { CateringPackageType } from '@/types/catering';

// Mock external dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/actions/catering', () => ({
  createCateringPackage: jest.fn(),
  updateCateringPackage: jest.fn(),
}));

jest.mock('react-hook-form', () => ({
  useForm: () => ({
    control: {},
    handleSubmit: jest.fn((onSubmit) => onSubmit),
    formState: { errors: {}, isSubmitting: false },
    setValue: jest.fn(),
    watch: jest.fn(),
    reset: jest.fn(),
  }),
}));

// Mock UI components with proper accessibility features
jest.mock('@/components/ui/form', () => {
  const React = require('react');
  
  const FormItemContext = React.createContext({ id: 'test-id' });
  
  return {
    Form: ({ children, ...props }: any) => <form {...props} role="form">{children}</form>,
    FormField: ({ children, render, name, defaultValue }: any) => {
      const field = {
        name,
        value: defaultValue || '',
        onChange: jest.fn(),
        onBlur: jest.fn(),
        ref: React.createRef(),
      };
      return render({ field });
    },
    FormItem: ({ children }: any) => {
      const id = React.useId();
      return (
        <FormItemContext.Provider value={{ id }}>
          <div className="form-item">{children}</div>
        </FormItemContext.Provider>
      );
    },
    FormLabel: ({ children }: any) => {
      const { id } = React.useContext(FormItemContext);
      return <label htmlFor={`${id}-form-item`}>{children}</label>;
    },
    FormControl: ({ children }: any) => {
      const { id } = React.useContext(FormItemContext);
      
      // Use a ref to track if we've assigned an ID yet
      const hasAssignedId = React.useRef(false);
      
      const assignIdToElement = (element: any): any => {
        if (React.isValidElement(element)) {
          // Check if it's our mocked Input or Textarea component and we haven't assigned ID yet
          if (!hasAssignedId.current && (element.props?.['data-testid'] === 'input' || element.props?.['data-testid'] === 'textarea')) {
            hasAssignedId.current = true;
            return React.cloneElement(element, { id: `${id}-form-item` });
          }
          // If it has children, recursively process them
          if (element.props?.children) {
            const processedChildren = React.Children.map(element.props.children, (child: any) => {
              return assignIdToElement(child);
            });
            return React.cloneElement(element, { children: processedChildren });
          }
        }
        return element;
      };
      
      return (
        <div className="form-control">
          {assignIdToElement(children)}
        </div>
      );
    },
    FormDescription: ({ children }: any) => <div className="form-description">{children}</div>,
    FormMessage: ({ children }: any) => <div className="form-message">{children}</div>,
  };
});

jest.mock('@/components/ui/input', () => ({
  Input: React.forwardRef<HTMLInputElement, any>(function Input({ ...props }, ref) {
    return <input ref={ref} {...props} data-testid={props['data-testid'] || 'input'} />;
  }),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: React.forwardRef<HTMLTextAreaElement, any>(function Textarea({ ...props }, ref) {
    return <textarea ref={ref} {...props} data-testid={props['data-testid'] || 'textarea'} />;
  }),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue }: any) => (
    <select onChange={(e) => onValueChange?.(e.target.value)} defaultValue={defaultValue}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: React.forwardRef<HTMLInputElement, any>(function Checkbox({ checked, onCheckedChange, ...props }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
    );
  }),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type = 'button', disabled, variant, ...props }: any) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children }: any) => <div className="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div className="alert-description">{children}</div>,
}));

jest.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children, onValueChange, defaultValue, ...props }: any) => (
    <div role="radiogroup" {...props}>
      {children}
    </div>
  ),
  RadioGroupItem: ({ value, ...props }: any) => (
    <button
      type="button"
      role="radio"
      aria-checked="false"
      data-state="unchecked"
      value={value}
      {...props}
    />
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-variant={variant} {...props}>
      {children}
    </span>
  ),
}));

// Mock icons
jest.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  X: () => <div data-testid="x-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
}));

describe('ProductForm (CateringPackageForm)', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (createCateringPackage as jest.Mock).mockResolvedValue({ success: true });
    (updateCateringPackage as jest.Mock).mockResolvedValue({ success: true });
  });

  describe('Form Rendering', () => {
    it('should render create form with all required fields', () => {
      render(<CateringPackageForm />);

      // Check form sections
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Package Details')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();

      // Check required fields
      expect(screen.getByLabelText(/package name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price per person/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minimum people/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/image url/i)).toBeInTheDocument();

      // Check form actions
      expect(screen.getByRole('button', { name: /create package/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render edit form with pre-filled data', () => {
      const mockPackage = {
        id: 'pkg-1',
        name: 'Test Package',
        description: 'A test catering package',
        minPeople: 10,
        pricePerPerson: 15.00,
        type: CateringPackageType.BUFFET,
        imageUrl: '/images/test-package.jpg',
        isActive: true,
        dietaryOptions: ['Vegetarian', 'Gluten-Free'],
      };

      render(<CateringPackageForm package={mockPackage} isEditing />);

      // Check pre-filled values
      expect(screen.getByDisplayValue('Test Package')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A test catering package')).toBeInTheDocument();
      expect(screen.getByDisplayValue('150')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10-15 people')).toBeInTheDocument();

      // Check edit-specific elements
      expect(screen.getByRole('button', { name: /update package/i })).toBeInTheDocument();
    });

    it('should display local data notice', () => {
      render(<CateringPackageForm />);

      expect(screen.getByText('Local Catering Package Management')).toBeInTheDocument();
      expect(screen.getByText(/this form manages packages stored locally/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      // Try to submit without filling required fields
      const submitButton = screen.getByRole('button', { name: /create package/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Check for validation error messages
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should validate price field', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      const priceInput = screen.getByLabelText(/price/i);
      await user.type(priceInput, '-10');

      const submitButton = screen.getByRole('button', { name: /create package/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/price must be greater than 0/i)).toBeInTheDocument();
      });
    });

    it('should validate image URL format', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      const imageInput = screen.getByLabelText(/image url/i);
      await user.type(imageInput, 'not-a-valid-url');

      const submitButton = screen.getByRole('button', { name: /create package/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid url format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Interactions', () => {
    it('should update form fields when user types', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      const nameInput = screen.getByLabelText(/package name/i);
      await user.type(nameInput, 'New Package Name');

      expect(nameInput).toHaveValue('New Package Name');
    });

    it('should toggle active status checkbox', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      const activeCheckbox = screen.getByRole('checkbox', { name: /active package/i });
      expect(activeCheckbox).toBeChecked(); // Should be checked by default

      await user.click(activeCheckbox);
      expect(activeCheckbox).not.toBeChecked();

      await user.click(activeCheckbox);
      expect(activeCheckbox).toBeChecked();
    });

    it('should handle dietary options management', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      // Add a new dietary option
      const newOptionInput = screen.getByPlaceholderText(/add dietary option/i);
      await user.type(newOptionInput, 'Keto-Friendly');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(screen.getByText('Keto-Friendly')).toBeInTheDocument();

      // Remove dietary option
      const removeButton = screen.getByTestId('remove-keto-friendly');
      await user.click(removeButton);

      expect(screen.queryByText('Keto-Friendly')).not.toBeInTheDocument();
    });

    it('should handle predefined dietary options', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      // Click predefined options
      const vegetarianOption = screen.getByRole('button', { name: /vegetarian/i });
      await user.click(vegetarianOption);

      expect(screen.getByText('Vegetarian')).toBeInTheDocument();

      // Click again to remove
      await user.click(vegetarianOption);
      expect(screen.queryByText('Vegetarian')).not.toBeInTheDocument();
    });

    it('should preview image when URL is provided', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      const imageInput = screen.getByLabelText(/image url/i);
      await user.type(imageInput, 'https://example.com/test-image.jpg');

      await waitFor(() => {
        expect(screen.getByRole('img', { name: /package preview/i })).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should create new package successfully', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      // Fill form fields
      await user.type(screen.getByLabelText(/package name/i), 'Test Package');
      await user.type(screen.getByLabelText(/description/i), 'Test description');
      await user.type(screen.getByLabelText(/price per person/i), '100');
      await user.type(screen.getByLabelText(/minimum people/i), '8');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create package/i }));

      await waitFor(() => {
        expect(createCateringPackage).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Package',
            description: 'Test description',
            price: 100,
            servingSize: '8-10 people',
          })
        );
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/catering');
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('should update existing package successfully', async () => {
      const user = userEvent.setup();
      const mockPackage = {
        id: 'pkg-1',
        name: 'Existing Package',
        description: 'Existing description',
        minPeople: 10,
        pricePerPerson: 15.00,
        type: CateringPackageType.BUFFET,
        isActive: true,
        dietaryOptions: [],
      };

      render(<CateringPackageForm package={mockPackage} isEditing />);

      // Update name
      const nameInput = screen.getByLabelText(/package name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Package');

      // Submit form
      await user.click(screen.getByRole('button', { name: /update package/i }));

      await waitFor(() => {
        expect(updateCateringPackage).toHaveBeenCalledWith(
          'pkg-1',
          expect.objectContaining({
            name: 'Updated Package',
            description: 'Existing description',
            price: 150,
            servingSize: '10-15 people',
          })
        );
      });

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/catering');
      expect(mockRouter.refresh).toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      (createCateringPackage as jest.Mock).mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<CateringPackageForm />);

      // Fill minimal required fields
      await user.type(screen.getByLabelText(/package name/i), 'Test Package');
      await user.type(screen.getByLabelText(/price per person/i), '100');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create package/i }));

      // Check loading state
      expect(screen.getByRole('button', { name: /creating.../i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating.../i })).toBeDisabled();
    });

    it('should handle submission errors', async () => {
      const user = userEvent.setup();
      (createCateringPackage as jest.Mock).mockResolvedValue({ 
        success: false, 
        error: 'Package creation failed' 
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(<CateringPackageForm />);

      // Fill minimal fields and submit
      await user.type(screen.getByLabelText(/package name/i), 'Test Package');
      await user.type(screen.getByLabelText(/price per person/i), '100');
      await user.click(screen.getByRole('button', { name: /create package/i }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to create package:', 'Package creation failed');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Navigation and Actions', () => {
    it('should navigate back when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<CateringPackageForm />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockRouter.push).toHaveBeenCalledWith('/admin/catering');
    });

    it('should disable cancel button during submission', async () => {
      const user = userEvent.setup();
      (createCateringPackage as jest.Mock).mockReturnValue(
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      render(<CateringPackageForm />);

      // Fill and submit
      await user.type(screen.getByLabelText(/package name/i), 'Test Package');
      await user.click(screen.getByRole('button', { name: /create package/i }));

      // Check cancel button is disabled
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<CateringPackageForm />);

      expect(screen.getByLabelText(/package name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/price per person/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/minimum people/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/image url/i)).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      render(<CateringPackageForm />);

      const form = screen.getByRole('form');
      expect(form).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: /create package/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should have descriptive button text', () => {
      render(<CateringPackageForm />);

      expect(screen.getByRole('button', { name: /create package/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show proper button text for editing mode', () => {
      const mockPackage = {
        id: 'pkg-1',
        name: 'Test Package',
        description: 'Test description',
        minPeople: 10,
        pricePerPerson: 10.00,
        type: CateringPackageType.BUFFET,
        isActive: true,
        dietaryOptions: [],
      };

      render(<CateringPackageForm package={mockPackage} isEditing />);

      expect(screen.getByRole('button', { name: /update package/i })).toBeInTheDocument();
    });
  });
}); 