'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, DollarSign } from 'lucide-react';
import { getActiveDeliveryZones, type ZoneMinimumConfig } from '@/types/catering';

interface DeliveryZoneInfoProps {
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
}

export function DeliveryZoneInfo({ 
  className = '', 
  showTitle = true, 
  compact = false 
}: DeliveryZoneInfoProps) {
  const activeZones = getActiveDeliveryZones();

  if (compact) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        {showTitle && (
          <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Delivery Zones & Minimums
          </h4>
        )}
        <div className="grid gap-2 text-sm">
          {activeZones.map(zone => (
            <div key={zone.zone} className="flex justify-between items-center">
              <span className="text-blue-700 font-medium">{zone.name}:</span>
              <div className="text-right">
                <span className="font-semibold text-blue-800">
                  ${zone.minimumAmount.toFixed(2)} minimum
                </span>
                {zone.deliveryFee && zone.deliveryFee > 0 && (
                  <div className="text-xs text-blue-600">
                    +${zone.deliveryFee.toFixed(2)} delivery
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-600 mt-3 italic">
          * Minimums apply to catering orders only
        </p>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-6">
        {showTitle && (
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Delivery Zones & Requirements
          </h3>
        )}
        
        <div className="grid gap-4">
          {activeZones.map(zone => (
            <div 
              key={zone.zone} 
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{zone.name}</h4>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-green-600 font-semibold">
                    <DollarSign className="w-4 h-4" />
                    ${zone.minimumAmount.toFixed(2)} minimum
                  </div>
                  {zone.deliveryFee && zone.deliveryFee > 0 && (
                    <div className="text-sm text-gray-600 mt-1">
                      +${zone.deliveryFee.toFixed(2)} delivery fee
                    </div>
                  )}
                </div>
              </div>
              
              {zone.description && (
                <p className="text-sm text-gray-600 mb-2">{zone.description}</p>
              )}
              
              {zone.estimatedDeliveryTime && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  Estimated delivery: {zone.estimatedDeliveryTime}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Minimum order requirements apply to catering orders only. 
            Regular menu items have different minimums.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default DeliveryZoneInfo; 