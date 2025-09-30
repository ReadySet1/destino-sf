import { Suspense } from 'react';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormActions } from '@/components/ui/form/FormActions';
import { FormButton } from '@/components/ui/form/FormButton';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { AvailabilityRulesManager } from './components/AvailabilityRulesManager';
import { AvailabilityTableSkeleton } from '@/components/admin/availability/AvailabilityTableSkeleton';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RulesPageProps = {
  searchParams: Promise<{
    productId?: string;
    action?: string;
    page?: string;
    search?: string;
    ruleType?: string;
    state?: string;
    status?: string;
  }>;
};

export default async function AvailabilityRulesPage({ searchParams }: RulesPageProps) {
  const params = await searchParams;
  const productId = params.productId;
  const action = params.action;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Availability Rules"
        description="Create, edit, and manage availability rules for your products"
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
          href="/admin/products/availability/rules?action=create"
          leftIcon={FormIcons.plus}
        >
          Create New Rule
        </FormButton>
      </FormActions>

      {/* Rules Content with Suspense */}
      <Suspense
        fallback={
          <div className="space-y-8 mt-8">
            <AvailabilityTableSkeleton rows={8} columns={9} />
          </div>
        }
      >
        <AvailabilityRulesManager
          initialProductId={productId}
          initialAction={action}
        />
      </Suspense>
    </div>
  );
}