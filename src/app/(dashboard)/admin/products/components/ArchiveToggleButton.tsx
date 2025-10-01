// src/app/(dashboard)/admin/products/components/ArchiveToggleButton.tsx
'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ArchiveToggleButtonProps {
  productId: string;
  productName: string;
  isArchived: boolean;
  variant?: 'default' | 'icon';
  onSuccess?: () => void;
}

export function ArchiveToggleButton({
  productId,
  productName,
  isArchived,
  variant = 'default',
  onSuccess
}: ArchiveToggleButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleToggleArchive = async () => {
    const action = isArchived ? 'restore' : 'archive';
    const confirmMessage = isArchived
      ? `Are you sure you want to restore "${productName}"? This will make it available for purchase again.`
      : `Are you sure you want to archive "${productName}"? This will hide it from customers. You can restore it later if needed.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/admin/products/${productId}/archive`, {
        method: isArchived ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update archive status');
      }

      toast.success(data.message);
      router.refresh(); // Refresh server component data
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleToggleArchive}
        disabled={isLoading}
        className="h-8 w-8 p-0"
        title={isArchived ? 'Restore product' : 'Archive product'}
      >
        {isArchived ? (
          <ArchiveRestore className="h-4 w-4" />
        ) : (
          <Archive className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isArchived ? 'outline' : 'destructive'}
      size="sm"
      onClick={handleToggleArchive}
      disabled={isLoading}
    >
      {isArchived ? (
        <>
          <ArchiveRestore className="h-4 w-4 mr-2" />
          {isLoading ? 'Restoring...' : 'Restore'}
        </>
      ) : (
        <>
          <Archive className="h-4 w-4 mr-2" />
          {isLoading ? 'Archiving...' : 'Archive'}
        </>
      )}
    </Button>
  );
}
