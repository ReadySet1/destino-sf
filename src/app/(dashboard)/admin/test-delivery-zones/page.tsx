import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliveryZoneInfo } from '@/components/Catering/DeliveryZoneInfo';
import { 
  getActiveDeliveryZones, 
  determineDeliveryZone, 
  validateMinimumPurchase,
  DeliveryZone 
} from '@/types/catering';

export default function TestDeliveryZonesPage() {
  const activeZones = getActiveDeliveryZones();
  
  // Test postal codes
  const testCodes = [
    { code: '94110', city: 'San Francisco', expected: 'SAN_FRANCISCO' },
    { code: '95110', city: 'San José', expected: 'SOUTH_BAY' },
    { code: '94301', city: 'Palo Alto', expected: 'LOWER_PENINSULA' },
    { code: '94500', city: 'Fremont', expected: 'PENINSULA' },
    { code: '90210', city: 'Beverly Hills', expected: null },
  ];
  
  // Test order amounts
  const testOrders = [
    { amount: 200, zone: DeliveryZone.SAN_FRANCISCO },
    { amount: 300, zone: DeliveryZone.SAN_FRANCISCO },
    { amount: 300, zone: DeliveryZone.SOUTH_BAY },
    { amount: 400, zone: DeliveryZone.SOUTH_BAY },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Delivery Zone Testing</h1>
      
      <div className="grid gap-6">
        {/* Zone Information Display */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery Zone Information (Compact)</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryZoneInfo compact={true} />
          </CardContent>
        </Card>
        
        {/* Full Zone Information Display */}
        <DeliveryZoneInfo showTitle={true} />
        
        {/* Postal Code Testing */}
        <Card>
          <CardHeader>
            <CardTitle>Postal Code Zone Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testCodes.map((test, index) => {
                const detectedZone = determineDeliveryZone(test.code, test.city);
                const isCorrect = detectedZone === test.expected;
                
                return (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{test.code} - {test.city}</span>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                          Detected: {detectedZone || 'None'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Expected: {test.expected || 'None'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Minimum Purchase Validation Testing */}
        <Card>
          <CardHeader>
            <CardTitle>Minimum Purchase Validation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testOrders.map((test, index) => {
                const validation = validateMinimumPurchase(test.amount, test.zone);
                
                return (
                  <div 
                    key={index}
                    className={`p-3 rounded-lg border ${
                      validation.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">
                          ${test.amount.toFixed(2)} order in {test.zone.replace('_', ' ')}
                        </div>
                        {validation.message && (
                          <div className="text-sm text-gray-600 mt-1">
                            {validation.message}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          validation.isValid ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {validation.isValid ? '✓ Valid' : '✗ Invalid'}
                        </div>
                        <div className="text-sm text-gray-600">
                          Required: ${validation.minimumRequired.toFixed(2)}
                        </div>
                        {validation.shortfall && (
                          <div className="text-sm text-red-600">
                            Need: ${validation.shortfall.toFixed(2)} more
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Active Zones Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Active Delivery Zones Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {activeZones.map(zone => (
                <div key={zone.zone} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{zone.name}</div>
                    <div className="text-sm text-gray-600">{zone.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-600">
                      ${zone.minimumAmount.toFixed(2)} minimum
                    </div>
                    <div className="text-sm text-gray-600">
                      ${zone.deliveryFee?.toFixed(2) || '0.00'} delivery
                    </div>
                    <div className="text-xs text-gray-500">
                      {zone.estimatedDeliveryTime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 