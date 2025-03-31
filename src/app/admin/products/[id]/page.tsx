import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { client } from "@/sanity/lib/client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditProductPage({ params }: PageProps) {
  // Explicitly await the params object to ensure id is resolved
  const resolvedParams = await params;
  const productId = resolvedParams.id;
  
  // Fetch the product to edit
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    notFound();
  }

  // Fetch categories for the dropdown
  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  async function updateProduct(formData: FormData) {
    "use server";
    
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const categoryId = formData.get("categoryId") as string;
    const images = (formData.get("images") as string).split(",").map(img => img.trim());
    const featured = formData.has("featured");
    const active = formData.has("active");
    let squareId = formData.get("squareId") as string;
    // Get productId from the form data
    const productId = formData.get("productId") as string;

    // Simple validation
    if (!name || !price || isNaN(price) || !productId) {
      console.error("Invalid product data");
      return;
    }

    try {
      // Update the product in the database
      const _updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          name,
          description,
          price,
          categoryId,
          images,
          featured,
          active,
          squareId,
        },
      });

      // Try to update in Sanity if it exists
      try {
        // Find the product in Sanity by name or squareId
        const sanityProductId = await client.fetch(
          `*[_type == "product" && (name == $name || squareId == $squareId)][0]._id`,
          { name, squareId }
        );
        
        if (sanityProductId) {
          // First get the category name from the database for the Sanity reference
          const dbCategory = await prisma.category.findUnique({
            where: { id: categoryId }
          });
          
          // Find the Sanity category document by name
          let categorySanityId = null;
          if (dbCategory) {
            categorySanityId = await client.fetch(
              `*[_type == "productCategory" && name == $categoryName][0]._id`,
              { categoryName: dbCategory.name }
            );
          }
          
          // Update the product in Sanity
          await client
            .patch(sanityProductId)
            .set({
              name,
              description: description || '',
              price,
              featured,
              squareId,
              images: images.map(url => ({
                _type: 'image',
                url
              })),
              ...(categorySanityId && {
                category: {
                  _type: 'reference',
                  _ref: categorySanityId
                }
              })
            })
            .commit();
            
          console.log(`Product updated in Sanity: ${sanityProductId}`);
        } else {
          console.log("Product not found in Sanity. Consider creating it.");
        }
      } catch (sanityError) {
        // Log the error but continue - the product is already updated in our database
        console.error("Error updating product in Sanity (continuing anyway):", sanityError);
      }

      // In a real application, you would also update in Square
      // This would typically use the squareId to make an API call to Square Catalog API
      
      console.log(`Product "${name}" updated successfully in database`);
      
      // Redirect to product list after update
      return redirect("/admin/products");
    } catch (error) {
      // Check if this is a redirect "error" - if so, don't treat it as an error
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        // This is actually a redirect, not an error - let it proceed
        throw error;
      }
      
      console.error("Error updating product:", error);
      // In a real app, you'd handle this error properly and show it to the user
      throw new Error("Failed to update product. Please try again.");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Edit Product</h1>
        <Link
          href="/admin/products"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <form action={updateProduct}>
          <input type="hidden" name="productId" value={productId} />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                defaultValue={product.name}
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
                rows={4}
                defaultValue={product.description || ""}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              ></textarea>
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price ($)
              </label>
              <input
                type="number"
                name="price"
                id="price"
                step="0.01"
                min="0"
                required
                defaultValue={Number(product.price).toString()}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div>
              <label htmlFor="squareId" className="block text-sm font-medium text-gray-700">
                Square ID
              </label>
              <input
                type="text"
                name="squareId"
                id="squareId"
                placeholder="Square catalog item ID"
                defaultValue={product.squareId || ""}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
            </div>

            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                name="categoryId"
                id="categoryId"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                required
                defaultValue={product.categoryId}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                Images URLs (comma-separated)
              </label>
              <input
                type="text"
                name="images"
                id="images"
                placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                defaultValue={product.images.join(", ")}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter image URLs separated by commas
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="featured"
                id="featured"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                defaultChecked={product.featured}
              />
              <label htmlFor="featured" className="block text-sm font-medium text-gray-700">
                Featured Product
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="active"
                id="active"
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                defaultChecked={product.active}
              />
              <label htmlFor="active" className="block text-sm font-medium text-gray-700">
                Active Product
              </label>
            </div>

            <div className="col-span-2 flex justify-end space-x-4 mt-6">
              <Link
                href="/admin/products"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Update Product
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 