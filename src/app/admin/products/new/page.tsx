import { prisma } from "@/lib/prisma";
import ProductForm from "./ProductForm";

export default async function NewProductPage() {
  // Fetch categories for the dropdown
  const categories = await prisma.category.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return <ProductForm categories={categories} />;
} 