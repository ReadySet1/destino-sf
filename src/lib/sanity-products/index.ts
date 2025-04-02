// src/lib/sanity-products/index.ts

import { client } from '@/sanity/lib/client';
import { cache } from 'react';

interface SanityImage {
  url: string;
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
  category?: string | { _id: string; name: string; slug: { current: string } };
  images: SanityImage[];
  variants?: unknown[];
}

// Fetch all products with their categories
export const getAllProducts = cache(async () => {
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
  
  return products.map((product) => ({
    ...product,
    images: product.images?.map((img) => img.url) || [],
  }));
});

// Fetch product by slug
export const getProductBySlug = cache(async (slug: string) => {
  const product = await client.fetch<SanityProduct | null>(`
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
  `, { slug });
  
  if (!product) return null;
  
  return {
    ...product,
    images: product.images?.map((img) => img.url) || [],
  };
});

// Fetch all categories
export const getAllCategories = cache(async () => {
  const categories = await client.fetch(`
    *[_type == "productCategory"] | order(order asc) {
      _id,
      name,
      slug,
      description
    }
  `);
  
  return categories;
});

// Fetch products by category
export const getProductsByCategory = cache(async (categoryId: string) => {
  const products = await client.fetch<SanityProduct[]>(`
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
  `, { categoryId });
  
  return products.map((product) => ({
    ...product,
    images: product.images?.map((img) => img.url) || [],
  }));
});

// Fetch featured products for homepage
export const getFeaturedProducts = cache(async (limit = 8) => {
  const products = await client.fetch<SanityProduct[]>(`
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
  `, { limit: limit - 1 });
  
  return products.map((product) => ({
    ...product,
    images: product.images?.map((img) => img.url) || [],
  }));
});
