import Link from 'next/link';
import { SmtpMessage } from '../smtp-message';
import { forgotPasswordAction } from '../../actions';
import { Label } from '@/components/ui/label';
import { SubmitButton } from '../../../components/submit-button';
import { FormMessage } from '../../../components/form-message';
import { Input } from '@/components/ui/input';

export default async function ForgotPassword(props: { searchParams: Promise<string> }) {
  const searchParams = await props.searchParams;
  return (
    <>
      <form
        action={forgotPasswordAction}
        className="text-foreground mx-auto flex w-full min-w-64 max-w-64 flex-1 flex-col gap-2 [&>input]:mb-6"
      >
        <div>
          <h1 className="text-2xl font-medium">Reset Password</h1>
          <p className="text-secondary-foreground text-sm">
            Already have an account?{' '}
            <Link className="text-primary underline" href="/sign-in">
              Sign in
            </Link>
          </p>
        </div>
        <div className="mt-8 flex flex-col gap-2 [&>input]:mb-3">
          <Label htmlFor="email">Email</Label>
          <Input name="email" placeholder="you@example.com" required />
          <SubmitButton>Reset Password</SubmitButton>
          <FormMessage message={searchParams} />
        </div>
      </form>
      <SmtpMessage />
    </>
  );
}
