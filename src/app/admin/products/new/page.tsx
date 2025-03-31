import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createSanityProduct } from "@/lib/sanity/createProduct";
import { createSquareProduct } from "@/lib/square/catalog";

export default async function NewProductPage() {
  // Fetch categories for the dropdown
  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  async function createProduct(formData: FormData) {
    "use server";
    
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const categoryId = formData.get("categoryId") as string;
    const images = (formData.get("images") as string).split(",").map(img => img.trim());
    const featured = formData.has("featured");
    const active = formData.has("active");
    let squareId = formData.get("squareId") as string;

    // Simple validation
    if (!name || !price || isNaN(price)) {
      console.error("Invalid product data");
      return;
    }

    try {
      // Step 1: Create the product in Square (or get temporary ID in development)
      if (!squareId) {
        squareId = await createSquareProduct({
          name,
          description,
          price,
          categoryId,
          variations: [] // No variations for now, could be added later
        });
      }

      // Step 2: Create the product in the database
      const _dbProduct = await prisma.product.create({
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

      // Step 3: Try to create the product in Sanity, but don't fail if it doesn't work
      try {
        await createSanityProduct({
          name,
          description,
          price,
          categoryId,
          squareId,
          images,
          featured
        });
        console.log(`Product "${name}" created successfully in all systems`);
      } catch (sanityError) {
        // Log the error but continue - the product is already in our database
        console.error("Error creating product in Sanity (continuing anyway):", sanityError);
        console.log(`Product "${name}" created in database and Square, but not in Sanity`);
      }
      
      // Redirect to product list after all operations (successful or partially successful)
      return redirect("/admin/products");
    } catch (error) {
      // Check if this is a redirect "error" - if so, don't treat it as an error
      if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        // This is actually a redirect, not an error - let it proceed
        throw error;
      }
      
      console.error("Error creating product:", error);
      // In a real app, you'd handle this error properly and show it to the user
      throw new Error("Failed to create product. Please try again.");
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Add New Product</h1>
        <Link
          href="/admin/products"
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <form action={createProduct}>
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave blank for automatic ID generation
              </p>
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
                defaultChecked
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
                Create Product
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 