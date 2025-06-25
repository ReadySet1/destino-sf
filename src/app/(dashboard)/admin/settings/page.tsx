import { prisma } from '@/lib/db';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';
import SettingsForm from './components/SettingsForm';
import { Separator } from '@/components/ui/separator';

export const metadata = {
  title: 'Store Settings | Admin',
  description: 'Manage store settings',
};

export default async function SettingsPage() {
  // Fetch store settings from database with retry logic for prepared statement issues
  let rawStoreSettings;
  
  try {
    rawStoreSettings = await prisma.storeSettings.findFirst({
      orderBy: { createdAt: 'asc' },
    });
  } catch (error) {
    console.error('Error fetching store settings:', error);
    // If there's a database error, try to reconnect and retry once
    try {
      await prisma.$disconnect();
      await prisma.$connect();
      rawStoreSettings = await prisma.storeSettings.findFirst({
        orderBy: { createdAt: 'asc' },
      });
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      rawStoreSettings = null;
    }
  }

  // Convert Decimal objects to numbers for client component compatibility
  const storeSettings = rawStoreSettings ? {
    ...rawStoreSettings,
    taxRate: Number(rawStoreSettings.taxRate),
    minOrderAmount: Number(rawStoreSettings.minOrderAmount),
    cateringMinimumAmount: Number(rawStoreSettings.cateringMinimumAmount),
  } : {
    id: '',
    name: 'Destino SF',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    taxRate: 8.25,
    minAdvanceHours: 2,
    minOrderAmount: 0,
    cateringMinimumAmount: 150,
    maxDaysInAdvance: 7,
    isStoreOpen: true,
    temporaryClosureMsg: null,
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Store Settings</h1>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <p className="text-gray-500">
          Configure your store&apos;s basic information.
        </p>
        <Separator className="mb-6" />
        <SettingsForm settings={storeSettings} />
      </div>
    </div>
  );
}
