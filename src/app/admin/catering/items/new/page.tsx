import React from 'react';
import { CateringItemForm } from '@/components/Catering';

export default function NewCateringItemPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Create New Catering Item</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <CateringItemForm />
      </div>
    </div>
  );
} 