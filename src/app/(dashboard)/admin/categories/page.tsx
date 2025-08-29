import { getCategories } from './actions';
import DeleteCategoryForm from './DeleteCategoryForm';
import { FormContainer } from '@/components/ui/form/FormContainer';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormIcons } from '@/components/ui/form/FormIcons';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <FormContainer>
      <FormHeader
        title="Category Management"
        description="Organize your products with custom categories"
        backUrl="/admin/products"
        backLabel="Back to Products"
      />

      {/* Warning about Square categories */}
      <FormSection
        title="Category Information"
        description="Categories are managed locally and used for organizing products in your store. While products sync from Square, categories are independent and help you structure your online catalog."
        icon={FormIcons.info}
        variant="blue"
      >
        <div className="text-sm text-blue-700">
          <p className="mb-2">
            <strong>Local Management:</strong> Categories are created and managed within this system.
          </p>
          <p>
            <strong>Product Organization:</strong> Use categories to structure your online catalog for better customer navigation.
          </p>
        </div>
      </FormSection>

      {/* Categories List */}
      <FormSection
        title={`Categories (${categories.length})`}
        description="View and manage your product categories"
        icon={FormIcons.grid}
      >
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              {FormIcons.grid}
            </div>
            <p className="text-gray-500 text-lg mb-2">No categories created yet</p>
            <p className="text-gray-400 text-sm">Create your first category to organize your products</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Display Order
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Products
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map(category => (
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{category.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {category.description || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{category.order}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {category._count.products} products
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <DeleteCategoryForm
                        categoryId={category.id}
                        categoryName={category.name}
                        productCount={category._count.products}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>
    </FormContainer>
  );
}
