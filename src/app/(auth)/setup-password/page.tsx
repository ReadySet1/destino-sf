import { AuthContainer } from '@/components/auth-container';
import { ToastHandler } from '@/components/auth/ToastHandler';
import { SetupPasswordForm } from '@/components/auth/SetupPasswordForm';

// Updated PageProps type for Next.js 15.3+
type PageProps = {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SetupPasswordPage({ searchParams }: PageProps) {
  // Await the searchParams Promise to get the actual values
  const resolvedSearchParams = await searchParams;
  const message = resolvedSearchParams.message?.toString();
  const error = resolvedSearchParams.error?.toString();
  const success = resolvedSearchParams.success?.toString();
  const email = resolvedSearchParams.email?.toString();

  // Use success message if available, otherwise use error or regular message
  const displayMessage = success || error || message;
  const messageType = success ? 'success' : error ? 'error' : undefined;

  return (
    <AuthContainer
      title="Set Up Your Password"
      subtitle="Welcome! Please create a secure password for your account"
    >
      <ToastHandler />
      <div className="pt-2">
        <SetupPasswordForm displayMessage={displayMessage} messageType={messageType} email={email} />
      </div>
    </AuthContainer>
  );
}
