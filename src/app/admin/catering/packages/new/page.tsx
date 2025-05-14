import React from 'react';
import { CateringPackageForm } from '@/components/Catering';

export default function NewCateringPackagePage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create New Catering Package</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <CateringPackageForm />
      </div>
    </div>
  );
} 