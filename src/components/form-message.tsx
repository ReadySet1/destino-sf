import { cn } from '@/lib/slug';
import { CheckCircle, AlertCircle, Mail, Shield } from 'lucide-react';

interface FormMessageProps {
  message?: string;
  type?: 'error' | 'success';
  className?: string;
}

export function FormMessage({ message, type = 'error', className }: FormMessageProps) {
  if (!message) return null;

  const isEmailSent = message.toLowerCase().includes('magic link') || message.toLowerCase().includes('check your email');
  const isPasswordReset = message.toLowerCase().includes('reset') || message.toLowerCase().includes('password');
  const isMagicLink = message.toLowerCase().includes('magic link');
  
  const getIcon = () => {
    if (type === 'success') {
      if (isMagicLink) return <Mail className="h-5 w-5" />;
      if (isPasswordReset) return <Shield className="h-5 w-5" />;
      return <CheckCircle className="h-5 w-5" />;
    }
    return <AlertCircle className="h-5 w-5" />;
  };

  const getTitle = () => {
    if (type === 'success') {
      if (isMagicLink) return 'Magic Link Sent!';
      if (isPasswordReset) return 'Password Reset Link Sent!';
      return 'Success!';
    }
    return 'Error';
  };

  const getTip = () => {
    if (type === 'success' && isEmailSent) {
      return '💡 Tip: The link will expire in 1 hour for security.';
    }
    return null;
  };

  return (
    <div
      className={cn(
        'rounded-lg p-4 text-sm flex items-start space-x-3 border',
        type === 'error' && 'bg-red-50 text-red-700 border-red-200',
        type === 'success' && isMagicLink && 'bg-blue-50 text-blue-700 border-blue-200',
        type === 'success' && isPasswordReset && 'bg-orange-50 text-orange-700 border-orange-200',
        type === 'success' && !isMagicLink && !isPasswordReset && 'bg-green-50 text-green-700 border-green-200',
        className
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1">
        <p className="font-medium">
          {getTitle()}
        </p>
        <p className="mt-1 text-sm opacity-90">
          {message}
        </p>
        {getTip() && (
          <p className="mt-2 text-xs opacity-75">
            {getTip()}
          </p>
        )}
      </div>
    </div>
  );
}
