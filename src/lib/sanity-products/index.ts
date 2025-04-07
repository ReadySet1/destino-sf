// src/lib/sanity-products/index.ts

import { client } from '@/sanity/lib/client';
import { cache } from 'react';

interface SanityImage {
  url: string;
}

interface SanityCategory {
  _id: string;
  name: string;
  slug: { current: string };
  description?: string;
  image?: {
    asset: {
      _ref: string;
      _type: 'reference';
    };
  };
}

export interface SanityProduct {
  _id: string;
  name: string;
  slug: { current: string };
  description: string;
  price: number;
  squareId: string;
  featured?: boolean;
  categoryId?: string;
  category?: string | SanityCategory;
  images: SanityImage[];
  variants?: unknown[];
}

// Fetch all products with their categories
export const getAllProducts = cache(async (): Promise<SanityProduct[]> => {
  const products = await client.fetch<SanityProduct[]>(`
    *[_type == "product"] {
      _id,
      name,
      slug,
      description,
      price,
      squareId,
      featured,
      "categoryId": category._ref,
      "category": category->name,
      "images": images[] {
        "url": asset->url
      },
      variants
    }
  `);

  return products.map(product => ({
    ...product,
    images: product.images?.map(img => ({ url: img.url })) || [],
  }));
});

// Fetch product by slug
export const getProductBySlug = cache(async (slug: string): Promise<SanityProduct | null> => {
  const product = await client.fetch<SanityProduct | null>(
    `
    *[_type == "product" && slug.current == $slug][0] {
      _id,
      name,
      slug,
      description,
      price,
      squareId,
      "categoryId": category._ref,
      "category": category->{
        _id,
        name,
        slug
      },
      "images": images[] {
        "url": asset->url
      },
      variants
    }
  `,
    { slug }
  );

  if (!product) return null;

  return {
    ...product,
    images: product.images?.map(img => ({ url: img.url })) || [],
  };
});

// Fetch all categories
export const getAllCategories = cache(async (): Promise<SanityCategory[]> => {
  const categories = await client.fetch<SanityCategory[]>(`
    *[_type == "productCategory"] | order(order asc) {
      _id,
      name,
      slug,
      description,
      image
    }
  `);

  return categories;
});

// Fetch products by category
export const getProductsByCategory = cache(async (categoryId: string): Promise<SanityProduct[]> => {
  const products = await client.fetch<SanityProduct[]>(
    `
    *[_type == "product" && category._ref == $categoryId] {
      _id,
      name,
      slug,
      description,
      price,
      squareId,
      "categoryId": category._ref,
      "category": category->name,
      "images": images[] {
        "url": asset->url
      },
      variants
    }
  `,
    { categoryId }
  );

  return products.map(product => ({
    ...product,
    images: product.images?.map(img => ({ url: img.url })) || [],
  }));
});

// Fetch featured products for homepage
export const getFeaturedProducts = cache(async (limit = 8) => {
  const products = await client.fetch<SanityProduct[]>(
    `
    *[_type == "product" && featured == true] | order(_createdAt desc)[0...$limit] {
      _id,
      name,
      slug,
      description,
      price,
      squareId,
      "category": category->name,
      "images": images[] {
        "url": asset->url
      },
      "slug": slug
    }
  `,
    { limit: limit - 1 }
  );

  return products.map(product => ({
    ...product,
    images: product.images?.map(img => img.url) || [],
  }));
});
