'use client';

import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from './ui/button';

interface SubmitButtonProps {
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}

export function SubmitButton({ 
  loading = false, 
  children, 
  className,
  pendingText 
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = loading || pending;

  return (
    <Button 
      type="submit" 
      disabled={isLoading} 
      className={className}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isLoading && pendingText ? pendingText : children}
    </Button>
  );
}
