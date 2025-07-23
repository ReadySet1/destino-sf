import { Separator } from '@/components/ui/separator';
import ShippingConfigurationForm from './components/ShippingConfigurationForm';
import { getAllShippingConfigurations } from '@/lib/shippingUtils';
import type { ShippingWeightConfig } from '@/lib/shippingUtils';

export const metadata = {
  title: 'Shipping Configuration | Admin',
  description: 'Manage shipping weight calculation settings',
};

export default async function ShippingConfigurationPage() {
  // Fetch shipping configurations with build-time fallback
  let configurations: ShippingWeightConfig[] = [];

  try {
    configurations = await getAllShippingConfigurations();
  } catch (error) {
    console.error('Error fetching shipping configurations:', error);
    // During build, use empty array to prevent build failure
    configurations = [];
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shipping Configuration</h1>
          <p className="text-gray-600 mt-1">
            Configure weight calculations for different product types to optimize shipping costs
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Weight Calculation Settings</h2>
          <p className="text-gray-500 text-sm">
            Set base weights and per-unit increments for different product categories. This affects
            shipping cost calculations for nationwide shipping.
          </p>
        </div>

        <Separator className="mb-6" />

        <ShippingConfigurationForm configurations={configurations} />
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">How Weight Calculation Works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>
            • <strong>Base Weight:</strong> Weight of the first unit including packaging
          </li>
          <li>
            • <strong>Per-Unit Weight:</strong> Additional weight for each extra unit
          </li>
          <li>
            • <strong>Total Weight = Base Weight + (Additional Units × Per-Unit Weight)</strong>
          </li>
          <li>• These settings only apply to nationwide shipping to optimize carrier rates</li>
          <li>• Alfajores and empanadas have special weight calculations due to their packaging</li>
        </ul>
      </div>
    </div>
  );
}
