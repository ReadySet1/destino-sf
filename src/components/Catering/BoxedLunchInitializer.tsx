'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { initializeBoxedLunchDataAction } from '@/actions/catering';
import toast from 'react-hot-toast';

interface BoxedLunchInitializerProps {
  hasPackages: boolean;
}

export const BoxedLunchInitializer: React.FC<BoxedLunchInitializerProps> = ({ hasPackages }) => {
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitialize = async () => {
    if (isInitializing) return;

    setIsInitializing(true);
    toast.loading('Initializing boxed lunch data...', { id: 'init-boxed-lunch' });

    try {
      const result = await initializeBoxedLunchDataAction();

      if (result.success) {
        toast.success(`✅ ${result.summary}`, {
          id: 'init-boxed-lunch',
          duration: 5000,
        });
      } else {
        toast.error(`❌ ${result.error}`, {
          id: 'init-boxed-lunch',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error initializing boxed lunch data:', error);
      toast.error('❌ Failed to initialize boxed lunch data', {
        id: 'init-boxed-lunch',
        duration: 5000,
      });
    } finally {
      setIsInitializing(false);
    }
  };

  if (hasPackages) {
    return (
      <Button
        onClick={handleInitialize}
        disabled={isInitializing}
        size="sm"
        variant="outline"
        className="flex items-center gap-2"
      >
        {isInitializing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Reinitialize Data
      </Button>
    );
  }

  return (
    <Button
      onClick={handleInitialize}
      disabled={isInitializing}
      size="lg"
      className="flex items-center gap-2"
    >
      {isInitializing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      Initialize Boxed Lunch Data
    </Button>
  );
};
