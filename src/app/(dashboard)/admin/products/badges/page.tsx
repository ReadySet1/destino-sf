import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import ProductTypeBadgeManager from '@/components/admin/ProductTypeBadgeManager';

export const metadata = {
  title: 'Product Type Badges | Admin',
  description: 'Manage product type badge settings',
};

export default async function ProductBadgesPage() {
  // Check authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Type Badges</h1>
        <p className="text-gray-600 mt-1">
          Manage badge text displayed on product detail pages for each product type
        </p>
      </div>

      <ProductTypeBadgeManager initialBadges={badges} />
    </div>
  );
}
