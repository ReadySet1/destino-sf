import { useCallback } from 'react';
import { toast } from '@/lib/toast';
import type { ToastOptions } from '@/lib/toast/types';

export function useToast() {
  const showToast = useCallback(
    (type: 'success' | 'error' | 'info' | 'warning', message: string, options?: ToastOptions) => {
      return toast[type](message, options);
    },
    []
  );

  const showLoadingToast = useCallback((message: string) => {
    return toast.loading(message);
  }, []);

  const dismissToast = useCallback((toastId?: string | number) => {
    toast.dismiss(toastId);
  }, []);

  const promiseToast = useCallback(
    <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: any) => string);
      }
    ) => {
      return toast.promise(promise, messages);
    },
    []
  );

  return {
    toast: showToast,
    loading: showLoadingToast,
    dismiss: dismissToast,
    promise: promiseToast,
    // Direct access to toast methods
    success: (message: string, options?: ToastOptions) => toast.success(message, options),
    error: (message: string, options?: ToastOptions) => toast.error(message, options),
    info: (message: string, options?: ToastOptions) => toast.info(message, options),
    warning: (message: string, options?: ToastOptions) => toast.warning(message, options),
  };
}
