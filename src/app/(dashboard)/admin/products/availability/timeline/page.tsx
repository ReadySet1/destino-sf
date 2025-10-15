import { Suspense } from 'react';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { AvailabilityTimelineView } from './components/AvailabilityTimelineView';
import { FormSectionSkeleton } from '@/components/admin/availability/AvailabilityTableSkeleton';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AvailabilityTimelinePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Availability Timeline"
        description="Visualize when availability rules are active across your products"
        backUrl="/admin/products/availability"
        backLabel="Back to Overview"
      />

      {/* Action Buttons */}
      <FormActions>
        <FormButton
          variant="secondary"
          href="/admin/products/availability"
          leftIcon={FormIcons.home}
        >
          Overview
        </FormButton>
        <FormButton
          variant="secondary"
          href="/admin/products/availability"
          leftIcon={FormIcons.list}
        >
          View Rules
        </FormButton>
      </FormActions>

      {/* Timeline Content with Suspense */}
      <Suspense
        fallback={
          <div className="space-y-8 mt-8">
            <FormSectionSkeleton />
          </div>
        }
      >
        <AvailabilityTimelineView />
      </Suspense>
    </div>
  );
}
