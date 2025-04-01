import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { client } from "@/sanity/lib/client";
import type { Category, Prisma } from "@prisma/client";

export default async function CategoriesPage() {
  // Fetch categories for the list
  const categories = await prisma.category.findMany({
    orderBy: {
      order: "asc",
    },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  async function createCategory(formData: FormData) {
    "use server";
    
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const order = parseInt(formData.get("order") as string || "0");
    
    // Simple validation
    if (!name) {
      console.error("Invalid category data");
      return;
    }

    try {
      // Step 1: Create the category in the database
      await prisma.category.create({
        data: {
          name,
          description,
          order,
        },
      });

      // Step 2: Create the category in Sanity - uncomment and fix this section
      const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');
      
      await client.create({
        _type: 'productCategory',
        name,
        slug: {
          _type: 'slug',
          current: slug || `category-${Date.now()}`
        },
        description: description || '',
        order,
      });

      console.log(`Category "${name}" created successfully`);
      
      // Redirect to refresh the page - return instead of throwing
      return redirect("/admin/categories");
    } catch (error) {
      // Don't log redirect "errors" as they're normal
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // This is actually a redirect, not an error
        throw error;
      }
      
      console.error("Error creating category:", error);
      throw new Error(`Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function deleteCategory(formData: FormData) {
    "use server";
    
    const id = formData.get("id") as string;
    
    if (!id) {
      return;
    }

    try {
      // Only allow deletion if no products are using this category
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              products: true,
            },
          },
        },
      });

      if (!category) {
        throw new Error(`Category not found.`);
      }

      if (category._count.products && category._count.products > 0) {
        throw new Error(`Cannot delete category '${category.name}' because it has ${category._count.products} products.`);
      }

      // Delete from database
      await prisma.category.delete({
        where: { id },
      });

      // Also find and delete from Sanity (if it exists) - uncomment this section
      const sanityCategoryId = await client.fetch(
        `*[_type == "productCategory" && name == $name][0]._id`,
        { name: category?.name }
      );
      
      if (sanityCategoryId) {
        await client.delete(sanityCategoryId);
      }

      console.log(`Category "${category.name}" deleted successfully`);
      
      // Redirect to refresh the page
      return redirect("/admin/categories");
    } catch (error) {
      // Don't log redirect "errors" as they're normal
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // This is actually a redirect, not an error
        throw error;
      }
      
      console.error("Error deleting category:", error);
      // Pass through specific error messages, but use a generic one for unexpected errors
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to delete category. An unexpected error occurred.");
      }
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Category Management</h1>
        <Link
          href="/admin/products"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to Products
        </Link>
      </div>

      {/* Categories List */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Categories</h2>
        
        {categories.length === 0 ? (
          <p className="text-gray-500">No categories created yet. Create your first category below.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Display Order
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.map((category: Category & { _count: Prisma.CategoryCountOutputType }) => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {category.description || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {category.order}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {category._count.products} products
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <form action={deleteCategory} className="inline">
                        <input type="hidden" name="id" value={category.id} />
                        <button 
                          type="submit"
                          className={`text-red-600 hover:text-red-900 ml-4 ${category._count.products > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={category._count.products > 0}
                          title={category._count.products > 0 ? `Cannot delete category with ${category._count.products} products` : "Delete category"}
                        >
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Category Form */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Add New Category</h2>
        
        <form action={createCategory}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Category Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div>
              <label htmlFor="order" className="block text-sm font-medium text-gray-700">
                Display Order
              </label>
              <input
                type="number"
                name="order"
                id="order"
                min="0"
                defaultValue="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div className="col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              ></textarea>
            </div>

            <div className="col-span-2">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Create Category
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 