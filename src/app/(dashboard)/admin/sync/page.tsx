import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { SyncDashboard } from '@/components/admin/sync/SyncDashboard';
import { logger } from '@/utils/logger';

export const metadata = {
  title: 'Product Sync | Admin',
  description: 'Manage product synchronization with Square',
};

export default async function AdminSyncPage() {
  // Redirect to the new filtered sync page
  redirect('/admin/square-sync');
}
