import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import ProductTypeBadgeManager from '@/components/admin/ProductTypeBadgeManager';
import { FormHeader } from '@/components/ui/form/FormHeader';

export const metadata = {
  title: 'Product Type Badges | Admin',
  description: 'Manage product type badge settings',
};

export default async function ProductBadgesPage() {
  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch all product type badges
  const badgesFromDb = await prisma.productTypeBadges.findMany({
    orderBy: { productType: 'asc' },
  });

  // Convert null to undefined for TypeScript compatibility
  const badges = badgesFromDb.map(badge => ({
    ...badge,
    badge3: badge.badge3 ?? undefined,
    icon3: badge.icon3 ?? undefined,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FormHeader
        title="Product Type Badges"
        description="Manage badge text displayed on product detail pages for each product type"
        backUrl="/admin"
        backLabel="Back to Dashboard"
      />

      <div className="mt-8">
        <ProductTypeBadgeManager initialBadges={badges} />
      </div>
    </div>
  );
}
