import { client } from '@/sanity/lib/client';
import { prisma } from '@/lib/prisma';
import type { SanityDocumentStub } from 'next-sanity';

interface SanityImage {
  _type: 'image';
  url: string;
}

interface SanityProductDocument extends SanityDocumentStub {
  _type: 'product';
  name: string;
  squareId: string;
  slug: {
    _type: 'slug';
    current: string;
  };
  description: string;
  price: number;
  category: {
    _type: 'reference';
    _ref: string;
  };
  images: SanityImage[];
  featured: boolean;
  variants: unknown[];
}

interface SanityCategoryDocument extends SanityDocumentStub {
  _type: 'productCategory';
  name: string;
  slug: {
    _type: 'slug';
    current: string;
  };
  description: string;
}

/**
 * Creates a new product in Sanity CMS
 * @param product Product data to create
 * @returns The created Sanity document ID
 */
export async function createSanityProduct({
  name,
  description,
  price,
  categoryId,
  squareId,
  images = [],
  featured = false,
}: {
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  squareId: string;
  images?: string[];
  featured?: boolean;
}): Promise<string> {
  console.log('Creating product in Sanity:', name);

  try {
    // First get the category name from the database
    const dbCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!dbCategory) {
      throw new Error(`Category with ID ${categoryId} not found in database`);
    }

    // Find the Sanity category document by name
    const sanityCategory = await client.fetch<string | null>(
      `*[_type == "productCategory" && name == $categoryName][0]._id`,
      { categoryName: dbCategory.name }
    );

    // If Sanity category doesn't exist, create it
    let categorySanityId = sanityCategory;
    if (!categorySanityId) {
      // Create a slug from the category name
      const categorySlug = dbCategory.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');

      // Create the category in Sanity
      const newCategory = await client.create<SanityCategoryDocument>({
        _type: 'productCategory',
        name: dbCategory.name,
        slug: {
          _type: 'slug',
          current: categorySlug || `category-${Date.now()}`,
        },
        description: '',
      });

      categorySanityId = newCategory._id;
      console.log(`Created category "${dbCategory.name}" in Sanity with ID: ${categorySanityId}`);
    }

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');

    // Create the product in Sanity
    const result = await client.create<SanityProductDocument>({
      _type: 'product',
      name,
      squareId,
      slug: {
        _type: 'slug',
        current: slug || `product-${Date.now()}`,
      },
      description: description || '',
      price,
      category: {
        _type: 'reference',
        _ref: categorySanityId,
      },
      // Convert URL strings to Sanity image objects if needed
      // This assumes images are already URLs
      images: images.map(url => ({
        _type: 'image',
        url,
      })),
      featured,
      // Default to empty variants array
      variants: [],
    });

    console.log(`Successfully created product in Sanity with ID: ${result._id}`);
    return result._id;
  } catch (error) {
    console.error('Error creating product in Sanity:', error);
    throw error;
  }
}
