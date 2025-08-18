import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { SyncDashboard } from '@/components/admin/sync/SyncDashboard';

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
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Simple Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Square Synchronization</h1>
        <p className="mt-2 text-gray-600">
          Keep your products updated with Square POS
        </p>
      </div>

      {/* Simple Sync Dashboard */}
      <SyncDashboard />
    </div>
  );
}