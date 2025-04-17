// src/app/(store)/products/page.tsx

import { prisma } from '@/lib/prisma';
import ProductCard from "@/components/Products/ProductCard";
import { Category, Product, Variant } from '@/types/product';
import { CategoryHeader } from '@/components/Products/CategoryHeader';
import { Decimal } from '@prisma/client/runtime/library';

// Type for the accumulator in the reduce function - using Prisma types directly
type ProductCategoryMap = Record<string, Product[]>; // Grouping Prisma Products by category name

// Helper function to normalize image data from database
// (Ensure this function exists or paste it here if needed)
function normalizeImages(images: any): string[] {
  if (!images) return [];
  if (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string') {
    return images.filter(url => url && url.trim() !== '');
  }
  if (typeof images === 'string') {
    try {
      if (images.startsWith('http')) return [images];
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter(url => url && typeof url === 'string');
      }
      return [];
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Helper function to convert Decimal to number
const convertDecimalToNumber = (decimal: unknown): number => {
  // Check if it's already a number
  if (typeof decimal === 'number') {
    return isNaN(decimal) ? 0 : decimal;
  }
  // Check if it looks like a Decimal object (has toFixed method)
  if (decimal !== null && typeof decimal === 'object' && 'toFixed' in decimal && typeof decimal.toFixed === 'function') {
    // Convert Decimal to string, then parse as float
    const num = parseFloat(decimal.toFixed());
    return isNaN(num) ? 0 : num;
  }
   // Check if it's a string representation of a number
   if (typeof decimal === 'string') {
     const num = parseFloat(decimal);
     return isNaN(num) ? 0 : num;
   }
  // Default to 0 if it's none of the above or conversion failed
  console.warn(`[convertDecimalToNumber] Could not convert value:`, decimal, `(Type: ${typeof decimal})`);
  return 0;
};

export default async function ProductsPage() {
  // Fetch products only from the database
  const dbProducts = await prisma.product.findMany({
    where: {
      active: true, // Fetch only active products
    },
    include: {
      category: true, // Include category data
      variants: true, // Include variant data
    },
    orderBy: [
      // Order by category order first, then by product name
      { category: { order: 'asc' } }, 
      { name: 'asc' }
    ]
  });

  // Log the raw dbProducts before mapping
  console.log('[ProductsPage] Raw dbProducts count:', dbProducts.length);
  if (dbProducts.length > 0) {
    console.log('[ProductsPage] First raw dbProduct:', JSON.stringify(dbProducts[0], null, 2));
    console.log('[ProductsPage] First raw dbProduct price type:', typeof dbProducts[0].price, 'value:', dbProducts[0].price);
    if(dbProducts[0].variants && dbProducts[0].variants.length > 0) {
      console.log('[ProductsPage] First raw dbProduct variant price type:', typeof dbProducts[0].variants[0].price, 'value:', dbProducts[0].variants[0].price);
    }
  }

  // Transform Prisma products to the Product interface
  const allProducts: Product[] = dbProducts.map((p) => {
    // Log price before conversion
    console.log(`[ProductsPage Map] Processing product: ${p.name}, Raw price: ${p.price}, Type: ${typeof p.price}`);
    const mappedProduct = {
      id: p.id,
      squareId: p.squareId || '',
      name: p.name,
      description: p.description,
      price: convertDecimalToNumber(p.price), // Use helper function
      images: normalizeImages(p.images), // Normalize images
      categoryId: p.categoryId || '',
      category: p.category ? { // Map Prisma category
        id: p.category.id,
        name: p.category.name,
        description: p.category.description,
        order: p.category.order ?? 0,
        createdAt: p.category.createdAt,
        updatedAt: p.category.updatedAt,
        // Add slug and other fields if they exist and are needed
        slug: p.category.slug || undefined 
      } : undefined,
      variants: p.variants.map((v): Variant => {
        // Log variant price before conversion
        console.log(`[ProductsPage Map] Processing variant: ${v.name} for ${p.name}, Raw price: ${v.price}, Type: ${typeof v.price}`);
        return {
          id: v.id,
          name: v.name,
          price: v.price ? convertDecimalToNumber(v.price) : null,
          squareVariantId: v.squareVariantId,
          productId: p.id,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        };
      }),
      featured: p.featured || false,
      active: p.active,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      // Add slug if it exists on the product model
      slug: p.slug || p.id // Fallback to ID if slug is not present
    };
    // Log price after conversion
    console.log(`[ProductsPage Map] Mapped product: ${mappedProduct.name}, Mapped price: ${mappedProduct.price}`);
    return mappedProduct;
  });

  // Group products by category name
  const productsByCategory: ProductCategoryMap = allProducts.reduce((acc, product) => {
    const categoryName = product.category?.name || 'Uncategorized';
    
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    // Ensure a default image if none are present
    const productWithDefaultImage = {
        ...product,
        images: product.images.length > 0 ? product.images : ['/images/menu/empanadas.png'],
    };
    acc[categoryName].push(productWithDefaultImage);
    return acc;
  }, {} as ProductCategoryMap);

  return (
    <div className="min-h-screen bg-background">
      <main className="flex-1">
        {Object.entries(productsByCategory).map(([category, products]) => (
          <div key={category}>
            {category.toLowerCase() === 'alfajores' ? (
              <>
                <CategoryHeader 
                  title={category}
                  description={
                    "Indulge in the delicate delight of our signature Alfajores. These classic South American butter cookies boast a tender, crumbly texture, lovingly filled with creamy dulce de leche. Explore a variety of tempting flavors, from traditional favorites to unique seasonal creations – the perfect sweet treat for yourself or a thoughtful gift."
                  }
                />
                <div className="container mx-auto px-4 py-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product) => (
                      <ProductCard key={product.id} product={product as Product} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="container mx-auto px-4 mb-12">
                <h2 className="text-2xl font-semibold mb-6">{category}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product as Product} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
} 