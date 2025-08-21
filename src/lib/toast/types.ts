import { ReactNode } from 'react';

export interface ToastOptions {
  id?: string | number;
  title?: string;
  description?: string;
  duration?: number;
  icon?: string | ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';
