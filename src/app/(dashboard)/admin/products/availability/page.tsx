import { Suspense } from 'react';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { AvailabilityOverview } from './components/AvailabilityOverview';
import { StatCardSkeleton } from '@/components/admin/availability/AvailabilityTableSkeleton';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AvailabilityManagementPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Availability Management"
        description="Manage product availability rules, scheduling, and automation"
        backUrl="/admin/products"
        backLabel="Back to Products"
      />

      {/* Action Buttons */}
      <FormActions>
        <FormButton
          variant="secondary"
          href="/admin/products/availability/timeline"
          leftIcon={FormIcons.calendar}
        >
          View Timeline
        </FormButton>
        <FormButton
          variant="secondary"
          href="/admin/products/availability/bulk"
          leftIcon={FormIcons.upload}
        >
          Bulk Editor
        </FormButton>
      </FormActions>

      {/* Main Content with Suspense */}
      <Suspense
        fallback={
          <div className="space-y-8 mt-8">
            {/* Stats Loading */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
          </div>
        }
      >
        <AvailabilityOverview />
      </Suspense>
    </div>
  );
}