import { Metadata } from 'next';
import { SyncConflictManager } from '@/components/admin/sync/SyncConflictManager';

export const metadata: Metadata = {
  title: 'Sync Conflicts | Admin Dashboard',
  description: 'Resolve conflicts between Square and manual product settings',
};

/**
 * Admin page for managing sync conflicts between Square and manual settings
 */
export default function SyncConflictsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
      <SyncConflictManager />
    </div>
  );
}
