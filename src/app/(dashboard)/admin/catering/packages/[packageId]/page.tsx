import React from 'react';
import { notFound } from 'next/navigation';
import { CateringPackageForm } from '@/components/Catering';
import { getCateringPackageById } from '@/actions/catering';

interface PageProps {
  params: Promise<{
    packageId: string;
  }>;
}

export const dynamic = 'force-dynamic';

export default async function EditCateringPackagePage({ params }: PageProps) {
  const { packageId } = await params;

  // Fetch the catering package
  const cateringPackage = await getCateringPackageById(packageId);

  // If the package doesn't exist, redirect to the 404 page
  if (!cateringPackage) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Edit Catering Package</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <CateringPackageForm package={cateringPackage} isEditing />
      </div>
    </div>
  );
} 