'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormContainer } from '@/components/ui/form/FormContainer';
import { FormHeader } from '@/components/ui/form/FormHeader';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { Store, Utensils, Package, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Import the enhanced components
import DeliveryZoneManager from '@/components/admin/DeliveryZoneManager';
import RegularDeliveryZoneManager from '@/components/admin/RegularDeliveryZoneManager';
import EnhancedStoreSettingsForm from '@/components/admin/EnhancedStoreSettingsForm';
import ShippingConfigurationForm from '@/app/(dashboard)/admin/shipping/components/ShippingConfigurationForm';
import type { ShippingWeightConfig } from '@/lib/shippingUtils';

interface AdminSettingsProps {
  storeSettings?: any;
  deliveryZones?: any[];
  shippingConfigurations?: ShippingWeightConfig[];
}

export default function AdminSettingsWithDesignSystem({
  storeSettings,
  deliveryZones,
  shippingConfigurations = [],
}: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState('store');

  return (
    <FormContainer>
      <FormHeader
        title="Admin Settings"
        description="Manage your store configuration and business rules"
        backUrl="/admin"
        backLabel="Back to Dashboard"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Store Settings
          </TabsTrigger>
          <TabsTrigger value="catering" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Catering Zones
          </TabsTrigger>
          <TabsTrigger value="regular" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Regular Zones
          </TabsTrigger>
        </TabsList>

        <div className="mt-8 space-y-10">
          <TabsContent value="store" className="mt-0">
            <FormSection
              title="Store Settings"
              description="Configure your store's basic information, tax rates, order minimums, and business rules. These settings affect order processing, customer communications, and financial calculations."
              icon={FormIcons.store}
              variant="blue"
            >
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">
                      Store Settings Usage
                    </h4>
                    <ul className="text-sm text-amber-800 space-y-1">
                      <li>
                        • <strong>Store Information:</strong> Appears on invoices, receipts, and
                        shipping labels
                      </li>
                      <li>
                        • <strong>Tax Rate:</strong> Applied to all taxable items during checkout
                      </li>
                      <li>
                        • <strong>Order Minimums:</strong> Enforced for regular product orders
                      </li>
                      <li>
                        • <strong>Catering Settings:</strong> General minimums and advance booking
                        rules
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Enhanced Store Settings Form */}
              <EnhancedStoreSettingsForm settings={storeSettings} />
            </FormSection>

            {/* Shipping Configuration Section */}
            <div className="mt-10">
              <FormSection
                title="Shipping Configuration"
                description="Configure weight calculations for different product types to optimize shipping costs for nationwide delivery."
                icon={FormIcons.shipping}
                variant="indigo"
              >
                <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-r-lg mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-semibold text-indigo-900 mb-2">
                        How Weight Calculation Works
                      </h4>
                      <ul className="text-sm text-indigo-800 space-y-1">
                        <li>
                          • <strong>Base Weight:</strong> Weight of the first unit including packaging
                        </li>
                        <li>
                          • <strong>Per-Unit Weight:</strong> Additional weight for each extra unit
                        </li>
                        <li>
                          • <strong>Total Weight = Base Weight + (Additional Units × Per-Unit Weight)</strong>
                        </li>
                        <li>• These settings only apply to nationwide shipping via Shippo</li>
                        <li>• Separate from local delivery zones (catering & regular)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <ShippingConfigurationForm configurations={shippingConfigurations} />
              </FormSection>
            </div>
          </TabsContent>

          <TabsContent value="catering" className="mt-0">
            <FormSection
              title="Catering Delivery Zones"
              description="Manage delivery zones for catering orders. Each zone can have custom delivery fees and minimum order amounts."
              icon={FormIcons.catering}
              variant="green"
            >
              <DeliveryZoneManager />
            </FormSection>
          </TabsContent>

          <TabsContent value="regular" className="mt-0">
            <FormSection
              title="Regular Delivery Zones"
              description="Configure delivery zones for regular product orders with specific rules and pricing."
              icon={FormIcons.package}
              variant="purple"
            >
              <RegularDeliveryZoneManager />
            </FormSection>
          </TabsContent>

        </div>
      </Tabs>
    </FormContainer>
  );
}
