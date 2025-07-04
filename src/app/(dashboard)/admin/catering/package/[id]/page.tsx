import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import CateringPackageForm from '@/components/Catering/CateringPackageForm';
import { getCateringPackageById } from '@/actions/catering';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCateringPackagePage({ params }: PageProps) {
  let cateringPackage = null;
  let errorMessage = '';

  try {
    const { id } = await params;
    cateringPackage = await getCateringPackageById(id);
    
    if (!cateringPackage) {
      notFound();
    }
  } catch (error) {
    console.error('Error fetching catering package:', error);
    errorMessage = 'Failed to load package data';
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
            <h1 className="text-3xl font-bold">Edit Catering Package</h1>
            <p className="text-gray-600 mt-2">
              Modify &quot;{cateringPackage?.name}&quot;
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {cateringPackage && <CateringPackageForm package={cateringPackage} isEditing={true} />}
    </div>
  );
} 