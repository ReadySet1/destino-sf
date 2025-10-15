# Form Design System

A comprehensive design system for consistent admin form layouts and components.

## Overview

This design system provides reusable components that maintain consistent styling, spacing, and behavior across all admin forms. It's based on the improved product edit form design.

## Components

### Layout Components

#### `FormContainer`

Main wrapper for all admin forms. Provides full-screen background and responsive container.

```tsx
import { FormContainer } from '@/components/ui/form';

<FormContainer>{/* Form content */}</FormContainer>;
```

#### `FormHeader`

Standard header with title, description, and optional back button/actions.

```tsx
import { FormHeader } from '@/components/ui/form';

<FormHeader
  title="Edit Product"
  description="Update product information and settings"
  backUrl="/admin/products"
  backLabel="Back to Products"
/>;
```

#### `FormSection`

Sectioned content areas with colored headers and icons.

```tsx
import { FormSection, FormIcons } from '@/components/ui/form';

<FormSection
  title="Basic Information"
  description="Essential product details"
  icon={FormIcons.info}
  variant="default"
>
  {/* Section content */}
</FormSection>;
```

**Variants:**

- `default` - Gray header
- `blue` - Blue header (for integrations)
- `green` - Green header (for uploads/media)
- `purple` - Purple header (for settings)
- `amber` - Amber header (for warnings)
- `indigo` - Indigo header (for advanced features)

### Form Elements

#### `FormField`

Wrapper for form inputs with labels, help text, and error states.

```tsx
import { FormField, FormInput } from '@/components/ui/form';

<FormField
  label="Product Name"
  required
  helpText="Enter a descriptive name for your product"
  error={errors.name}
>
  <FormInput name="name" placeholder="Enter product name" defaultValue={product.name} />
</FormField>;
```

#### `FormInput`

Standard text input with variants for different use cases.

```tsx
import { FormInput } from '@/components/ui/form';

{
  /* Default input */
}
<FormInput name="name" placeholder="Product name" />;

{
  /* Currency input with $ prefix */
}
<FormInput variant="currency" name="price" placeholder="0.00" />;

{
  /* Monospace input for codes/IDs */
}
<FormInput variant="monospace" name="squareId" placeholder="ABC123" />;
```

#### `FormTextarea`

Multi-line text input with consistent styling.

```tsx
import { FormTextarea } from '@/components/ui/form';

<FormTextarea name="description" placeholder="Product description..." rows={5} />;
```

#### `FormSelect`

Dropdown select with placeholder support.

```tsx
import { FormSelect } from '@/components/ui/form';

<FormSelect name="category" placeholder="Choose a category">
  <option value="1">Category 1</option>
  <option value="2">Category 2</option>
</FormSelect>;
```

#### `FormCheckbox`

Checkbox with label and description.

```tsx
import { FormCheckbox } from '@/components/ui/form';

<FormCheckbox
  name="active"
  label="Active Product"
  description="Active products are visible to customers"
  defaultChecked={product.active}
/>;
```

### Layout Utilities

#### `FormGrid`

Responsive grid for organizing form fields.

```tsx
import { FormGrid } from '@/components/ui/form';

<FormGrid cols={2} gap={8}>
  <FormField label="Price">
    <FormInput variant="currency" name="price" />
  </FormField>
  <FormField label="Category">
    <FormSelect name="category">...</FormSelect>
  </FormField>
</FormGrid>;
```

#### `FormStack`

Vertical stack with consistent spacing.

```tsx
import { FormStack } from '@/components/ui/form';

<FormStack spacing={8}>
  <FormField>...</FormField>
  <FormField>...</FormField>
  <FormField>...</FormField>
</FormStack>;
```

#### `FormActions`

Container for form action buttons.

```tsx
import { FormActions, FormButton, FormIcons } from '@/components/ui/form';

<FormActions>
  <FormButton variant="secondary" href="/admin/products">
    Cancel Changes
  </FormButton>
  <FormButton type="submit" leftIcon={FormIcons.save}>
    Update Product
  </FormButton>
</FormActions>;
```

#### `FormButton`

Consistent button styling with variants and icons.

```tsx
import { FormButton, FormIcons } from '@/components/ui/form';

{
  /* Primary button */
}
<FormButton type="submit" leftIcon={FormIcons.save}>
  Save Changes
</FormButton>;

{
  /* Secondary button as link */
}
<FormButton variant="secondary" href="/admin/products">
  Cancel
</FormButton>;

{
  /* Danger button */
}
<FormButton variant="danger" onClick={deleteItem}>
  Delete
</FormButton>;
```

## Complete Example

```tsx
import {
  FormContainer,
  FormHeader,
  FormSection,
  FormField,
  FormInput,
  FormTextarea,
  FormSelect,
  FormCheckbox,
  FormGrid,
  FormStack,
  FormActions,
  FormButton,
  FormIcons,
} from '@/components/ui/form';

export default function EditProductForm() {
  return (
    <FormContainer>
      <FormHeader
        title="Edit Product"
        description="Update product information and settings"
        backUrl="/admin/products"
      />

      <form className="space-y-10">
        <FormSection
          title="Basic Information"
          description="Essential product details"
          icon={FormIcons.info}
        >
          <FormStack>
            <FormField label="Product Name" required>
              <FormInput name="name" placeholder="Enter product name" />
            </FormField>

            <FormField label="Description">
              <FormTextarea name="description" placeholder="Describe your product..." />
            </FormField>

            <FormGrid cols={2}>
              <FormField label="Price" required>
                <FormInput variant="currency" name="price" placeholder="0.00" />
              </FormField>

              <FormField label="Category" required>
                <FormSelect name="category" placeholder="Choose category">
                  <option value="1">Food</option>
                  <option value="2">Beverages</option>
                </FormSelect>
              </FormField>
            </FormGrid>
          </FormStack>
        </FormSection>

        <FormSection
          title="Product Status"
          description="Control product visibility"
          icon={FormIcons.check}
          variant="purple"
        >
          <FormGrid cols={2}>
            <FormCheckbox
              name="active"
              label="Active Product"
              description="Product is visible to customers"
            />
            <FormCheckbox
              name="featured"
              label="Featured Product"
              description="Show prominently on homepage"
            />
          </FormGrid>
        </FormSection>

        <FormActions>
          <FormButton variant="secondary" href="/admin/products">
            Cancel Changes
          </FormButton>
          <FormButton type="submit" leftIcon={FormIcons.save}>
            Update Product
          </FormButton>
        </FormActions>
      </form>
    </FormContainer>
  );
}
```

## Design Tokens

### Colors

- **Primary**: Indigo (indigo-600, indigo-700)
- **Secondary**: Gray (gray-300, gray-700)
- **Success**: Green (green-600)
- **Warning**: Amber (amber-600)
- **Danger**: Red (red-600)

### Spacing

- **Form sections**: `space-y-10` (40px)
- **Field groups**: `space-y-8` (32px)
- **Form fields**: `space-y-6` (24px)
- **Section padding**: `px-8 py-8` (32px)
- **Input padding**: `py-3 px-4` (12px 16px)

### Typography

- **Form titles**: `text-3xl font-bold`
- **Section titles**: `text-xl font-semibold`
- **Field labels**: `text-sm font-semibold`
- **Help text**: `text-sm text-gray-500`
- **Input text**: `text-base`

### Border Radius

- **Containers**: `rounded-xl` (12px)
- **Inputs**: `rounded-lg` (8px)
- **Buttons**: `rounded-lg` (8px)

This design system ensures consistency across all admin forms while maintaining flexibility for different use cases.
