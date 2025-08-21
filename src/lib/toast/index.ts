import { toast as sonnerToast } from 'sonner';
import type { ToastOptions, ToastType } from './types';

export const toast = {
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, {
      id: options?.id,
      description: options?.description,
      duration: options?.duration ?? 3000,
      icon: options?.icon,
      action: options?.action,
    });
  },
  
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, {
      id: options?.id,
      description: options?.description,
      duration: options?.duration ?? 5000,
      icon: options?.icon,
      action: options?.action,
    });
  },
  
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, {
      id: options?.id,
      description: options?.description,
      duration: options?.duration ?? 4000,
      icon: options?.icon,
      action: options?.action,
    });
  },
  
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, {
      id: options?.id,
      description: options?.description,
      duration: options?.duration ?? 4000,
      icon: options?.icon,
      action: options?.action,
    });
  },
  
  loading: (message: string, options?: Pick<ToastOptions, 'id'>) => {
    return sonnerToast.loading(message, options);
  },
  
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },
  
  dismiss: (toastId?: string | number) => {
    return sonnerToast.dismiss(toastId);
  },
};

export { toast as default };
export type { ToastOptions, ToastType };
