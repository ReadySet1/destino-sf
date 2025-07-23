'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function ProductToasts() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for operation status in URL parameters
    const status = searchParams.get('status');
    const message = searchParams.get('message');
    const productName = searchParams.get('productName');

    if (status === 'success' && productName) {
      const action = searchParams.get('action');

      if (action === 'delete') {
        toast.success('Product Deleted', {
          description: `${productName} has been successfully deleted.`,
          position: 'top-center',
          duration: 3000,
        });
      } else if (action === 'create') {
        toast.success('Product Created', {
          description: `${productName} has been successfully created.`,
          position: 'top-center',
          duration: 3000,
        });
      } else if (action === 'update') {
        toast.success('Product Updated', {
          description: `${productName} has been successfully updated.`,
          position: 'top-center',
          duration: 3000,
        });
      }
    } else if (status === 'error' && message) {
      toast.error('Operation Failed', {
        description: message,
        position: 'top-center',
        duration: 5000,
      });
    }
  }, [searchParams]);

  // This component doesn't render anything visible
  return null;
}
