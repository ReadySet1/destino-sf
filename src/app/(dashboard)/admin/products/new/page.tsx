import { prisma } from '@/lib/db';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';
import ProductForm from './ProductForm';

export default async function NewProductPage() {
  // Fetch categories for the dropdown
  const categories = await prisma.category.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return <ProductForm categories={categories} />;
}
