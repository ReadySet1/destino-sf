import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { Decimal } from "@prisma/client/runtime/library";
import { redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { DeleteButton } from "./components/DeleteButton";

export const revalidate = 0; // Disable static generation
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Product Management',
  description: 'Manage your products',
  tags: ['products']
};

type ProductWithCategory = {
  id: string;
  name: string;
  price: number | string | Decimal;
  description: string | null;
  images: string[];
  category: { name: string };
  featured: boolean;
  active: boolean;
};

export default async function ProductsPage() {
  // Fetch products with their categories
  const productsFromDb = await prisma.product.findMany({
    orderBy: {
      name: "asc",
    },
    include: {
      category: true,
    },
  });

  // Transform the products to match our expected type
  const products = productsFromDb.map((product: ProductWithCategory) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    description: product.description,
    images: product.images,
    category: {
      name: product.category?.name || 'Uncategorized'
    },
    featured: product.featured,
    active: product.active,
  }));
  
  async function deleteProduct(formData: FormData) {
    "use server";
    
    const id = formData.get("id") as string;
    
    if (!id) {
      return;
    }

    try {
      // Find the product first to get its details for Sanity deletion
      const product = await prisma.product.findUnique({
        where: { id },
      });

      if (!product) {
        throw new Error(`Product not found.`);
      }

      // Delete from database
      await prisma.product.delete({
        where: { id },
      });
      
      // Try to delete from Sanity if it exists
      try {
        // Find the product in Sanity by name or squareId
        const sanityProductId = await client.fetch(
          `*[_type == "product" && (name == $name || squareId == $squareId)][0]._id`,
          { name: product.name, squareId: product.squareId }
        );
        
        if (sanityProductId) {
          await client.delete(sanityProductId);
          console.log(`Product deleted from Sanity: ${sanityProductId}`);
        }
      } catch (sanityError) {
        // Log the error but continue - the product is already deleted from our database
        console.error("Error deleting product from Sanity (continuing anyway):", sanityError);
      }

      console.log(`Product "${product.name}" deleted successfully`);
      
      // Redirect to refresh the page
      return redirect("/admin/products");
    } catch (error) {
      // Don't log redirect "errors" as they're normal
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // This is actually a redirect, not an error
        throw error;
      }
      
      console.error("Error deleting product:", error);
      // Pass through specific error messages, but use a generic one for unexpected errors
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to delete product. An unexpected error occurred.");
      }
    }
  }

  async function editProduct(formData: FormData) {
    "use server";
    
    const id = formData.get("id") as string;
    
    if (!id) {
      return;
    }

    try {
      // Redirect to the edit page for this product
      return redirect(`/admin/products/${id}`);
    } catch (error) {
      // Don't log redirect "errors" as they're normal
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // This is actually a redirect, not an error
        throw error;
      }
      
      console.error("Error navigating to edit product:", error);
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error("Failed to navigate to edit product. An unexpected error occurred.");
      }
    }
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-2xl font-bold">Product Management</h1>
        <div className="grid grid-cols-1 md:grid-cols-[2fr,2fr,1fr] gap-3 w-full items-start">
          <select className="border rounded p-2 w-full min-w-0">
            <option value="all">All Categories</option>
            {/* Categories would be populated from DB */}
          </select>
          <input
            type="text"
            placeholder="Search products..."
            className="border rounded p-2 w-full min-w-0"
          />
          <div className="flex flex-col md:flex-row gap-2 w-full">
            <Link
              href="/admin/categories"
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-center w-full md:w-1/2 break-words whitespace-nowrap"
            >
              Manage Categories
            </Link>
            <Link
              href="/admin/products/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-center w-full md:w-1/2 break-words whitespace-nowrap"
            >
              Add Product
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="w-1/4 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="hidden sm:table-cell w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="hidden sm:table-cell w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="hidden sm:table-cell w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Featured
                </th>
                <th className="w-32 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {product.images && product.images.length > 0 && product.images[0] ? (
                      <div className="h-12 w-12 relative">
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          className="object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-xs text-gray-500">No image</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 break-words max-w-[150px]">
                    {product.name}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-500">
                    {product.category.name}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                    ${Number(product.price).toFixed(2)}
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {product.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="hidden sm:table-cell px-4 py-4 text-sm text-gray-500">
                    {product.featured ? 'Yes' : 'No'}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 whitespace-nowrap">
                    <form action={editProduct} className="inline">
                      <input type="hidden" name="id" value={product.id} />
                      <button type="submit" className="text-indigo-600 hover:text-indigo-900 mr-2">
                        Edit
                      </button>
                    </form>
                    <form action={deleteProduct} className="inline">
                      <input type="hidden" name="id" value={product.id} />
                      <input type="hidden" name="productName" value={product.name} />
                      <DeleteButton productName={product.name} />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 