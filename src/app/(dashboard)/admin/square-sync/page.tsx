import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { SyncDashboard } from '@/components/admin/sync/SyncDashboard';
import { FormContainer } from '@/components/ui/form/FormContainer';
import { FormHeader } from '@/components/ui/form/FormHeader';

export const metadata = {
  title: 'Square Sync | Admin',
  description: 'Synchronize products with Square',
};

export default async function SquareSyncPage() {
  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  return (
    <FormContainer>
      <FormHeader
        title="Square Synchronization"
        description="Keep your products updated with Square POS"
        backUrl="/admin"
        backLabel="Back to Dashboard"
      />

      <SyncDashboard />
    </FormContainer>
  );
}