'use client';

import { toast } from 'react-hot-toast';
import { useTransition } from 'react';

export function useCategory() {
  const [isPending, startTransition] = useTransition();

  const handleServerAction = async (action: Promise<any>) => {
    try {
      await startTransition(async () => {
        const result = await action;
        return result;
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
      throw error;
    }
  };

  return { handleServerAction, isPending };
} 