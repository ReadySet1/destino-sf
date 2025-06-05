import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CateringPackageForm from '@/components/Catering/CateringPackageForm';

export default function NewCateringPackagePage() {
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
            <h1 className="text-3xl font-bold">Add New Catering Package</h1>
            <p className="text-gray-600 mt-2">
              Create a new package for your catering menu
            </p>
          </div>
        </div>
      </div>

      <CateringPackageForm />
    </div>
  );
} 