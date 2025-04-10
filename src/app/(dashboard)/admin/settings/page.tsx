import { prisma } from '@/lib/prisma';
import SettingsForm from './components/SettingsForm';
import { Separator } from '@/components/ui/separator';

export const metadata = {
  title: 'Store Settings | Admin',
  description: 'Manage store settings',
};

export default async function SettingsPage() {
  // Fetch store settings from database
  const storeSettings = await prisma.storeSettings.findFirst({
    orderBy: { createdAt: 'asc' },
  }) || {
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
        <p className="text-gray-600 mb-6">
          Configure your store's basic information.
        </p>
        <Separator className="mb-6" />
        <SettingsForm settings={storeSettings} />
      </div>
    </div>
  );
}
