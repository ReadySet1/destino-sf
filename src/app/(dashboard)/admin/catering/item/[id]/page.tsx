import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import CateringItemForm from '@/components/Catering/CateringItemForm';
import { getCateringItem } from '@/actions/catering';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCateringItemPage({ params }: PageProps) {
  let item = null;
  let errorMessage = '';

  try {
    const { id } = await params;
    const result = await getCateringItem(id);
    if (result.success) {
      item = result.data;
    } else {
      errorMessage = result.error || 'Item not found';
    }
  } catch (error) {
    console.error('Error fetching catering item:', error);
    errorMessage = 'Failed to load item data';
  }

  if (!item) {
    // If item not found, could redirect to not found or show error
    notFound();
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/catering" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Catering
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Catering Item</h1>
            <p className="text-gray-600 mt-2">Modify &quot;{item?.name}&quot;</p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {item && <CateringItemForm item={item} isEditing={true} />}
    </div>
  );
}
