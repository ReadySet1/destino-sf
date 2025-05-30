import { Suspense } from 'react';
import { ManualOrderForm } from './components/ManualOrderForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const metadata = {
  title: 'Manual Order - Admin Dashboard',
  description: 'Create and manage manual orders for cash payments',
};

export default function ManualOrderPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manual Order Management</h1>
      <p className="text-gray-600 mb-6">
        Create and manage orders for cash payments, or update existing orders.
      </p>
      
      <Suspense fallback={<div className="text-center py-10"><LoadingSpinner size="lg" /></div>}>
        <ManualOrderForm />
      </Suspense>
    </div>
  );
} 