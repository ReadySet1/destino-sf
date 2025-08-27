'use client';

import { useFormStatus } from 'react-dom';
import { resetPasswordAction } from '@/app/actions/auth';
import { FormMessage } from '@/components/form-message';
import { SubmitButton } from '@/components/submit-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { PasswordStrengthIndicator } from '@/components/password-strength-indicator';

interface ResetPasswordFormProps {
  displayMessage?: string;
  messageType?: 'success' | 'error';
}

function ResetPasswordFormInner({ displayMessage, messageType }: ResetPasswordFormProps) {
  const { pending } = useFormStatus();

  return (
    <form action={resetPasswordAction} className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="password"
              name="password"
              id="password"
              placeholder="Enter your new password"
              required
              className="pl-10"
              minLength={8}
              disabled={pending}
            />
          </div>
          <PasswordStrengthIndicator />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              placeholder="Confirm your new password"
              required
              className="pl-10"
              minLength={8}
              disabled={pending}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-medium">Password requirements:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>At least 8 characters long</li>
            <li>Include uppercase and lowercase letters</li>
            <li>Include at least one number</li>
            <li>Include at least one special character</li>
          </ul>
        </div>
      </div>

      <SubmitButton 
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium h-11"
        pendingText="Updating password..."
      >
        Update Password
      </SubmitButton>

      <FormMessage message={displayMessage} type={messageType} className="text-center mt-2" />
    </form>
  );
}

export function ResetPasswordForm({ displayMessage, messageType }: ResetPasswordFormProps) {
  return <ResetPasswordFormInner displayMessage={displayMessage} messageType={messageType} />;
}
