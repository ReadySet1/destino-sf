'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Store, MapPin, Package, Utensils, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Import the enhanced components
import DeliveryZoneManager from '@/components/admin/DeliveryZoneManager';
import RegularDeliveryZoneManager from '@/components/admin/RegularDeliveryZoneManager';
import EnhancedStoreSettingsForm from '@/components/admin/EnhancedStoreSettingsForm';

interface AdminSettingsTabsProps {
  storeSettings?: any;
  deliveryZones?: any[];
}

export default function AdminSettingsTabs({ storeSettings, deliveryZones }: AdminSettingsTabsProps) {
  const [activeTab, setActiveTab] = useState('store');

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <p className="text-gray-600">Manage your store configuration and business rules</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Store Settings
          </TabsTrigger>
          <TabsTrigger value="catering" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Catering Zones
          </TabsTrigger>
          <TabsTrigger value="regular" className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Regular Zones
          </TabsTrigger>
          <TabsTrigger value="shipping" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Shipping
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="store" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-600" />
                Store Settings
              </CardTitle>
              <CardDescription>
                Configure your store&apos;s basic information, tax rates, order minimums, and business rules. 
                These settings affect order processing, customer communications, and financial calculations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">
                  Store Settings Usage
                </h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• <strong>Store Information:</strong> Appears on invoices, receipts, and shipping labels</li>
                  <li>• <strong>Tax Rate:</strong> Applied to all taxable items during checkout</li>
                  <li>• <strong>Order Minimums:</strong> Enforced for regular product orders</li>
                  <li>• <strong>Catering Settings:</strong> General minimums and advance booking rules</li>
                </ul>
              </div>
              
              {/* Enhanced Store Settings Form */}
              <EnhancedStoreSettingsForm settings={storeSettings} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="catering" className="mt-6">
          <DeliveryZoneManager />
        </TabsContent>
        
        <TabsContent value="regular" className="mt-6">
          <RegularDeliveryZoneManager />
        </TabsContent>
        
        <TabsContent value="shipping" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Product Shipping Configuration
              </CardTitle>
              <CardDescription>
                Configure shipping rates and weight calculations for empanadas, alfajores, and other products. 
                This section is separate from catering delivery zones and handles nationwide shipping via Shippo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-purple-900 mb-2">
                  Shipping vs. Catering Delivery
                </h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• <strong>Product Shipping:</strong> Nationwide delivery of packaged goods via carriers</li>
                  <li>• <strong>Catering Delivery:</strong> Local delivery of fresh prepared food</li>
                  <li>• <strong>Weight-based pricing:</strong> Calculated automatically for products</li>
                  <li>• <strong>Shippo integration:</strong> Real-time shipping rates and label generation</li>
                </ul>
              </div>
              
              {/* Shipping configuration will be rendered here */}
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Shipping configuration component will be integrated here</p>
                <p className="text-sm mt-2">Visit <a href="/admin/shipping" className="text-blue-600 hover:underline">/admin/shipping</a> for current shipping config</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
