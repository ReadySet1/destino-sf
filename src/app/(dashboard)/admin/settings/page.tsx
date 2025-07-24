import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import SettingsFormWrapper from './components/SettingsForm';
import DeliveryZoneManager from '@/components/admin/DeliveryZoneManager';
import DeliveryZoneDebugger from '@/components/admin/DeliveryZoneDebugger';
import { Separator } from '@/components/ui/separator';

export const metadata = {
  title: 'Store Settings | Admin',
  description: 'Manage store settings',
};

export default async function SettingsPage() {
  // Check authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    redirect('/');
  }

  // Fetch store settings and delivery zones
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Store Settings</h1>
      </div>

      {/* Basic Store Settings */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <p className="text-gray-500">Configure your store&apos;s basic information.</p>
        <Separator className="mb-6" />
        <SettingsFormWrapper settings={processedSettings} />
      </div>

      {/* Delivery Zone Management */}
      <DeliveryZoneManager />
      
      {/* Debugger for development */}
      {process.env.NODE_ENV === 'development' && (
        <DeliveryZoneDebugger />
      )}
    </div>
  );
}
