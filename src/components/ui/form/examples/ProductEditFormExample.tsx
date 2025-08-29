// Example: Product Edit Form using the Form Design System
// This shows how to refactor existing forms to use the new components

import { FormContainer } from '@/components/ui/form/FormContainer';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormField } from '@/components/ui/form/FormField';
import { FormInput } from '@/components/ui/form/FormInput';
import { FormTextarea } from '@/components/ui/form/FormTextarea';
import { FormSelect } from '@/components/ui/form/FormSelect';
import { FormCheckbox } from '@/components/ui/form/FormCheckbox';
import { FormGrid } from '@/components/ui/form/FormGrid';
import { FormStack } from '@/components/ui/form/FormStack';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';

interface ProductEditFormExampleProps {
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    categoryId: string;
    squareId: string | null;
    active: boolean;
    featured: boolean;
    isAvailable: boolean | null;
    isPreorder: boolean | null;
    visibility: string | null;
    itemState: string | null;
    variants: Array<{
      id: string;
      name: string;
      price: number | null;
      squareVariantId: string | null;
    }>;
  };
  categories: Array<{
    id: string;
    name: string;
  }>;
  initialImageUrls: string[];
  updateProduct: (formData: FormData) => Promise<void>;
}

/**
 * Example of how to use the Form Design System
 * Refactored from the original product edit form
 */
export default function ProductEditFormExample({
  product,
  categories,
  initialImageUrls,
  updateProduct
}: ProductEditFormExampleProps) {
  return (
    <FormContainer>
      <FormHeader
        title="Edit Product"
        description="Update product information, pricing, and availability settings"
        backUrl="/admin/products"
        backLabel="Back to Products"
      />

      <form action={updateProduct}>
        <input type="hidden" name="productId" value={product.id} />
        
        <FormStack spacing={10}>
          {/* Basic Information */}
          <FormSection
            title="Basic Information"
            description="Essential product details that customers will see"
            icon={FormIcons.info}
          >
            <FormStack>
              <FormField 
                label="Product Name" 
                required
                helpText="Enter a descriptive product name"
              >
                <FormInput
                  name="name"
                  defaultValue={product.name}
                  placeholder="Enter a descriptive product name"
                  required
                />
              </FormField>

              <FormField 
                label="Description"
                helpText="Help customers understand what makes this product special"
              >
                <FormTextarea
                  name="description"
                  defaultValue={product.description || ''}
                  placeholder="Describe your product features, ingredients, or other important details..."
                />
              </FormField>

              <FormGrid cols={2}>
                <FormField label="Price" required>
                  <FormInput
                    variant="currency"
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={product.price.toString()}
                    required
                  />
                </FormField>

                <FormField label="Category" required>
                  <FormSelect
                    name="categoryId"
                    defaultValue={product.categoryId}
                    placeholder="Choose a category"
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormField>
              </FormGrid>
            </FormStack>
          </FormSection>

          {/* Square Integration */}
          <FormSection
            title="Square Integration"
            description="Connect this product to your Square catalog for inventory sync"
            icon={FormIcons.shield}
            variant="blue"
          >
            <FormField 
              label="Square Catalog Item ID"
              helpText="The unique identifier from Square's catalog. Used for syncing inventory and pricing automatically."
            >
              <FormInput
                variant="monospace"
                name="squareId"
                defaultValue={product.squareId || ''}
                placeholder="e.g., 2HKY7CZ4YFOBQMT7NLS2EKV2S"
              />
            </FormField>
          </FormSection>

          {/* Product Images */}
          <FormSection
            title="Product Images"
            description="Upload high-quality images to showcase your product"
            icon={FormIcons.image}
            variant="green"
          >
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
              <div className="space-y-6">
                <div className="mx-auto w-20 h-20 bg-gray-200 rounded-xl flex items-center justify-center">
                  {FormIcons.image}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Image Upload Component</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Drag and drop images here, or click to browse files
                  </p>
                  <p className="text-sm text-blue-600 bg-blue-100 inline-block px-4 py-2 rounded-lg font-medium">
                    Current images: {initialImageUrls.length > 0 ? `${initialImageUrls.length} image(s)` : 'None'}
                  </p>
                </div>
                <input type="hidden" name="imageUrls" value={JSON.stringify(initialImageUrls)} />
              </div>
            </div>
          </FormSection>

          {/* Product Status */}
          <FormSection
            title="Product Status"
            description="Control how this product appears and behaves on your site"
            icon={FormIcons.check}
            variant="purple"
          >
            <FormGrid cols={2}>
              <FormCheckbox
                name="active"
                label="Active Product"
                description="Active products are included in your catalog and can be sold to customers"
                defaultChecked={product.active}
              />

              <FormCheckbox
                name="featured"
                label="Featured Product"
                description="Featured products appear prominently on your homepage and category pages"
                defaultChecked={product.featured}
              />
            </FormGrid>
          </FormSection>

          {/* Availability Override */}
          <FormSection
            title="Manual Availability Override"
            description="Square's 'Site visibility' settings are not accessible through their API. Use these controls to manually override availability when needed."
            icon={FormIcons.warning}
            variant="amber"
          >
            <FormGrid cols={2}>
              <FormStack>
                <FormCheckbox
                  name="isAvailable"
                  label="Available for Purchase"
                  description="When checked, customers can add this item to their cart and complete purchases"
                  defaultChecked={product.isAvailable ?? true}
                />

                <FormCheckbox
                  name="isPreorder"
                  label="Pre-order Item"
                  description="Allow customers to pre-order this item before it becomes generally available"
                  defaultChecked={product.isPreorder ?? false}
                />
              </FormStack>

              <FormStack>
                <FormField 
                  label="Site Visibility"
                  helpText="Controls whether this product appears in your public catalog and search results"
                >
                  <FormSelect
                    name="visibility"
                    defaultValue={product.visibility || 'PUBLIC'}
                  >
                    <option value="PUBLIC">Public (Visible to all customers)</option>
                    <option value="PRIVATE">Private (Hidden from customers)</option>
                  </FormSelect>
                </FormField>

                <FormField 
                  label="Item State"
                  helpText="Sets the operational state of this product for inventory management"
                >
                  <FormSelect
                    name="itemState"
                    defaultValue={product.itemState || 'ACTIVE'}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SEASONAL">Seasonal</option>
                    <option value="ARCHIVED">Archived</option>
                  </FormSelect>
                </FormField>
              </FormStack>
            </FormGrid>
          </FormSection>

          {/* Product Variants */}
          {product.variants && product.variants.length > 0 && (
            <FormSection
              title={`Product Variants (${product.variants.length})`}
              description="Variants are managed through Square and synced automatically"
              icon={FormIcons.grid}
              variant="indigo"
            >
              <FormStack spacing={4}>
                {product.variants.map((variant) => (
                  <div key={variant.id} className="flex items-center justify-between p-6 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{variant.name}</h3>
                      {variant.squareVariantId && (
                        <p className="text-sm text-gray-500">
                          Square ID: <span className="font-mono text-gray-700 bg-white px-2 py-1 rounded">{variant.squareVariantId}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-6">
                      <span className="text-2xl font-bold text-gray-900">
                        {variant.price ? `$${Number(variant.price).toFixed(2)}` : 'No price'}
                      </span>
                    </div>
                  </div>
                ))}
              </FormStack>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800 leading-relaxed">
                      <strong>Note:</strong> Product variants are managed through Square Dashboard. 
                      Any changes to variants should be made in Square and then synced to this system using the product sync feature.
                    </p>
                  </div>
                </div>
              </div>
            </FormSection>
          )}

          {/* Form Actions */}
          <FormActions>
            <FormButton variant="secondary" href="/admin/products">
              Cancel Changes
            </FormButton>
            <FormButton
              type="submit"
              leftIcon={FormIcons.save}
            >
              Update Product
            </FormButton>
          </FormActions>
        </FormStack>
      </form>
    </FormContainer>
  );
}
