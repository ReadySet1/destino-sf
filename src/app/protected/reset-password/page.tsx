import { AuthContainer } from '@/components/auth-container';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ToastHandler } from '@/components/auth/ToastHandler';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Suspense } from 'react';

// Updated PageProps type for Next.js 15.3+
type PageProps = {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  // Check if user is authenticated (should be if they came from recovery link)
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/sign-in?message=Please sign in to reset your password');
  }

  // Await the searchParams Promise to get the actual values
  const resolvedSearchParams = await searchParams;
  const message = resolvedSearchParams.message?.toString();
  const error_msg = resolvedSearchParams.error?.toString();
  const success = resolvedSearchParams.success?.toString();

  // Use success message if available, otherwise use error or regular message
  const displayMessage = success || error_msg || message;
  const messageType = success ? 'success' : error_msg ? 'error' : undefined;

  return (
    <AuthContainer title="Reset Your Password" subtitle="Enter your new password below">
      <Suspense fallback={null}>
        <ToastHandler />
      </Suspense>
      <div className="pt-2">
        {user.email && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
            <p className="text-sm text-blue-800">
              Resetting password for: <strong>{user.email}</strong>
            </p>
          </div>
        )}

        <ResetPasswordForm displayMessage={displayMessage} messageType={messageType} />
      </div>
    </AuthContainer>
  );
}
