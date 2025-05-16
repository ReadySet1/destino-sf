'use client';

import * as React from 'react';
import toast from 'react-hot-toast';

type ToastProps = {
  title?: string;
  description?: string;
  duration?: number;
};

export function useToast() {
  const showToast = ({ title, description, duration = 3000 }: ToastProps) => {
    return toast.success(
      <div>
        {title && <div className="font-semibold">{title}</div>}
        {description && <div className="text-sm">{description}</div>}
      </div>,
      { duration }
    );
  };

  return { toast: showToast };
}

export default function Toaster() {
  return null; // Use the <Toaster /> component from react-hot-toast directly in your layout
} 