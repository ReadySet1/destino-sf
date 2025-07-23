// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import BusinessHoursForm from '../settings/components/BusinessHoursForm';
import { Separator } from '@/components/ui/separator';

interface BusinessHour {
  id: string;
  day: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const metadata = {
  title: 'Business Hours | Admin',
  description: 'Manage store business hours',
};

export default async function BusinessHoursPage() {
  // Fetch business hours from database
  const businessHours = await prisma.businessHours.findMany({
    orderBy: { day: 'asc' },
  });

  // Create default business hours array if none exist
  const defaultBusinessHours = Array.from({ length: 7 }, (_, i) => ({
    id: '',
    day: i,
    openTime: '09:00',
    closeTime: '18:00',
    isClosed: i === 0, // Sunday closed by default
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  // Merge existing hours with defaults
  const mergedBusinessHours = defaultBusinessHours.map(defaultHour => {
    const existingHour = businessHours.find((hour: BusinessHour) => hour.day === defaultHour.day);
    return existingHour || defaultHour;
  });

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Business Hours</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Store Hours</h2>
        <p className="text-gray-500">
          Set your store&apos;s operating hours. Customers will only be able to place orders for
          pickup during these hours.
        </p>
        <Separator className="mb-6" />
        <BusinessHoursForm businessHours={mergedBusinessHours} />
      </div>
    </div>
  );
}
