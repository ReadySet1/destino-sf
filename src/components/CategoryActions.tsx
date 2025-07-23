'use client';

import { toast } from 'react-hot-toast';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ActionResult } from '@/app/(dashboard)/admin/categories/actions';

export function useCategory() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleServerAction = async (action: Promise<ActionResult>) => {
    startTransition(async () => {
      try {
        const result = await action;

        if (result.success) {
          toast.success(result.message || 'Action successful!');
          if (result.redirectPath) {
            router.push(result.redirectPath);
          }
        } else {
          toast.error(result.message || 'An error occurred.');
        }
      } catch (error) {
        console.error('Unexpected error during server action:', error);
        toast.error(error instanceof Error ? error.message : 'An unexpected error occurred.');
      }
    });
  };

  return { handleServerAction, isPending };
}
