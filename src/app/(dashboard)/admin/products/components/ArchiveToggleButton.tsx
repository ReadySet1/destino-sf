// src/app/(dashboard)/admin/products/components/ArchiveToggleButton.tsx
'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';

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
  onSuccess,
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
        headers: { 'Content-Type': 'application/json' },
      });

      // Check if response has content before parsing JSON
      let data: { success?: boolean; message?: string; error?: string } | null = null;
      const contentType = response.headers.get('content-type');
      const hasJsonContent = contentType?.includes('application/json');

      // Only attempt to parse JSON if the response indicates JSON content
      if (hasJsonContent) {
        const text = await response.text();

        // Verify we have actual content to parse
        if (text && text.trim().length > 0) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            logger.error('JSON parse error in archive toggle', {
              parseError,
              responseText: text,
              productId,
              action,
            });
            throw new Error('Server returned invalid JSON response');
          }
        } else {
          logger.warn('Empty response body received from server', {
            productId,
            productName,
            action,
          });
          // For successful responses without content, create a default success object
          if (response.ok) {
            data = {
              success: true,
              message: `Product "${productName}" has been ${action}d successfully`,
            };
          } else {
            throw new Error('Server returned empty response');
          }
        }
      } else {
        // Non-JSON response (shouldn't happen but handle gracefully)
        if (response.ok) {
          data = {
            success: true,
            message: `Product "${productName}" has been ${action}d successfully`,
          };
        } else {
          throw new Error(`Server returned non-JSON response (${response.status})`);
        }
      }

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update archive status');
      }

      toast.success(data?.message || `Product "${productName}" has been ${action}d successfully`);
      router.refresh(); // Refresh server component data
      onSuccess?.();
    } catch (error) {
      logger.error('Archive toggle error', {
        error,
        productId,
        productName,
        action,
      });
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
        {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
