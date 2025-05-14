import React from 'react';
import { notFound } from 'next/navigation';
import { CateringItemForm } from '@/components/Catering';
import { db } from '@/lib/db';
import { CateringItem } from '@/types/catering';

interface PageProps {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function EditCateringItemPage({ params }: PageProps) {
  const { id } = params;

  // Fetch the catering item from the database
  const item = await db.cateringItem.findUnique({
    where: {
      id,
    },
  });

  // If the item doesn't exist, redirect to the 404 page
  if (!item) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Edit Catering Item</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <CateringItemForm item={item as unknown as CateringItem} isEditing />
      </div>
    </div>
  );
} 