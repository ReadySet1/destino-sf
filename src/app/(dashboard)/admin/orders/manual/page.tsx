import { Suspense } from 'react';
import { ManualOrderForm } from './components/ManualOrderForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const metadata = {
  title: 'Manual Order - Admin Dashboard',
  description: 'Create and manage manual orders for cash payments',
};

export default function ManualOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <ManualOrderForm />
    </Suspense>
  );
}
