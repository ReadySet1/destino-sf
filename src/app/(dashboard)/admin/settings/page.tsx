import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import AdminSettingsWithDesignSystem from '@/components/admin/AdminSettingsWithDesignSystem';
import DeliveryZoneDebugger from '@/components/admin/DeliveryZoneDebugger';
import { getAllShippingConfigurations } from '@/lib/shippingUtils';

export const metadata = {
  title: 'Store Settings | Admin',
  description: 'Manage store settings',
};

export default async function SettingsPage() {
  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Fetch store settings, delivery zones, and shipping configurations
  let shippingConfigurations: Awaited<ReturnType<typeof getAllShippingConfigurations>> = [];
  try {
    shippingConfigurations = await getAllShippingConfigurations();
  } catch (error) {
    console.error('Error fetching shipping configurations:', error);
  }

  const [storeSettings, deliveryZones] = await Promise.all([
    prisma.storeSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    }),
    prisma.cateringDeliveryZone.findMany({
      orderBy: { displayOrder: 'asc' },
    }),
  ]);

  // Convert Decimal objects to numbers for client compatibility
  const processedSettings = storeSettings
    ? {
        ...storeSettings,
        taxRate: Number(storeSettings.taxRate),
        minOrderAmount: Number(storeSettings.minOrderAmount),
        cateringMinimumAmount: Number(storeSettings.cateringMinimumAmount),
      }
    : null;

  // Process delivery zones to convert Decimal to numbers
  const processedDeliveryZones = deliveryZones.map(zone => ({
    ...zone,
    minimumAmount: Number(zone.minimumAmount),
    deliveryFee: Number(zone.deliveryFee),
  }));

  return (
    <>
      <AdminSettingsWithDesignSystem
        storeSettings={processedSettings}
        deliveryZones={processedDeliveryZones}
        shippingConfigurations={shippingConfigurations}
      />

      {/* Debugger for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8">
          <DeliveryZoneDebugger />
        </div>
      )}
    </>
  );
}
