import { FormMessage } from '@/components/form-message';
import Link from 'next/link';
import { AuthContainer } from '@/components/auth-container';
import { SignInForm } from '@/components/auth/SignInForm';

// Define the shape of the resolved search params
type ResolvedSearchParams = {
  message?: string;
  error?: string;
  redirect?: string;
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<ResolvedSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  // Check for both message and error parameters
  const message = resolvedSearchParams.message || resolvedSearchParams.error;
  // Determine message type based on which parameter is present
  const messageType = resolvedSearchParams.error ? 'error' : 'success';
  const redirectUrl = resolvedSearchParams.redirect;

  return (
    <AuthContainer title="Welcome Back" subtitle="Sign in to your Destino SF account">
      <div className="pt-2">
        <SignInForm redirectUrl={redirectUrl} />

        <FormMessage message={message} type={messageType} className="text-center mt-4" />
      </div>

      <div className="flex flex-col space-y-4 pt-6">
        <div className="text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link
            className="text-primary hover:text-primary/90 underline underline-offset-4 font-medium"
            href="/sign-up"
          >
            Sign up
          </Link>
        </div>
      </div>
    </AuthContainer>
  );
}
