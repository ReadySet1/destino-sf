'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Trash2, MapPin, DollarSign, Clock, Info, Utensils, Edit } from 'lucide-react';
import DeliveryZoneModal from '@/components/admin/DeliveryZoneModal';

interface DeliveryZone {
  id: string;
  zone: string;
  name: string;
  description?: string | null;
  minimumAmount: number;
  deliveryFee: number;
  estimatedDeliveryTime?: string | null;
  isActive: boolean;
  postalCodes: string[];
  cities: string[];
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DeliveryZoneManagerProps {
  className?: string;
}

interface ZoneCardProps {
  zone: DeliveryZone;
  index: number;
  onEdit: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
  isToggling: boolean;
  isDeleting: boolean;
}

function ZoneCard({
  zone,
  index,
  onEdit,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: ZoneCardProps) {
  const statusColor = zone.isActive ? 'border-l-green-500' : 'border-l-gray-400';
  const statusBadge = zone.isActive ? (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
      Inactive
    </span>
  );

  return (
    <Card className={`border-l-4 ${statusColor} transition-all duration-200 hover:shadow-md`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                {zone.name}
              </h3>
              {statusBadge}
            </div>

            {zone.description && <p className="text-sm text-gray-600 mb-3">{zone.description}</p>}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <span className="text-gray-500">Min Order:</span>
                  <div className="font-medium">${zone.minimumAmount.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <div>
                  <span className="text-gray-500">Delivery Fee:</span>
                  <div className="font-medium">${zone.deliveryFee.toFixed(2)}</div>
                </div>
              </div>

              {zone.estimatedDeliveryTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div>
                    <span className="text-gray-500">Est. Time:</span>
                    <div className="font-medium">{zone.estimatedDeliveryTime}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch checked={zone.isActive} onCheckedChange={onToggle} disabled={isToggling} />
                {isToggling && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>

            {/* Coverage areas */}
            <div className="space-y-1">
              {zone.cities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500 min-w-16">Cities:</span>
                  <div className="flex flex-wrap gap-1">
                    {zone.cities.map((city, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {zone.postalCodes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500 min-w-16">Postal:</span>
                  <div className="flex flex-wrap gap-1">
                    {zone.postalCodes.slice(0, 5).map((code, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                      >
                        {code}
                      </span>
                    ))}
                    {zone.postalCodes.length > 5 && (
                      <span className="text-xs text-gray-500">
                        +{zone.postalCodes.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="flex items-center gap-1"
              disabled={isDeleting}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting || isToggling}
              className="flex items-center gap-1"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DeliveryZoneManager({ className }: DeliveryZoneManagerProps) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);

  // Track loading states for individual zone toggles
  const [togglingZones, setTogglingZones] = useState<Set<string>>(new Set());

  // Track loading states for individual zone deletes
  const [deletingZones, setDeletingZones] = useState<Set<string>>(new Set());

  const loadDeliveryZones = useCallback(async () => {
    try {
      console.log('🔄 Loading delivery zones...');
      const response = await fetch('/api/admin/delivery-zones');
      if (!response.ok) {
        throw new Error(`Failed to load delivery zones: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Delivery zones loaded:', data.deliveryZones);
      setZones(data.deliveryZones || []);
    } catch (error) {
      console.error('❌ Error loading delivery zones:', error);
      toast.error('Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load delivery zones
  useEffect(() => {
    loadDeliveryZones();
  }, [loadDeliveryZones]);

  const startNewZone = () => {
    setEditingZone(null);
    setModalOpen(true);
  };

  const startEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setModalOpen(true);
  };

  const handleModalSuccess = async () => {
    await loadDeliveryZones();
  };

  const updateZoneStatus = async (zoneId: string, isActive: boolean) => {
    // Prevent multiple rapid clicks
    if (togglingZones.has(zoneId)) {
      console.log('⚠️ Zone toggle already in progress for:', zoneId);
      return;
    }

    // Find the zone to update
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) {
      console.error('❌ Zone not found:', zoneId);
      return;
    }

    // Store original state for rollback
    const originalZones = [...zones];

    try {
      // Add to loading set
      setTogglingZones(prev => new Set(prev).add(zoneId));

      // Optimistic update - immediately update UI
      console.log(`🔄 Optimistically updating zone ${zoneId} to ${isActive}`);
      setZones(prevZones => prevZones.map(z => (z.id === zoneId ? { ...z, isActive } : z)));

      // Make API call
      console.log(`📡 Making API call to update zone ${zoneId}`);
      const response = await fetch('/api/admin/delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...zone,
          isActive,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ Zone status updated successfully:', result);

      // Success - no need to reload since we already updated optimistically
      toast.success(`Zone ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('❌ Error updating zone status:', error);

      // Rollback optimistic update on error
      console.log('🔄 Rolling back optimistic update for zone:', zoneId);
      setZones(originalZones);

      // Show error message
      toast.error(
        `Failed to ${isActive ? 'activate' : 'deactivate'} zone: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Remove from loading set
      setTogglingZones(prev => {
        const newSet = new Set(prev);
        newSet.delete(zoneId);
        return newSet;
      });
    }
  };

  const deleteZone = async (zoneId: string) => {
    // Prevent multiple rapid clicks
    if (deletingZones.has(zoneId)) {
      console.log('⚠️ Zone delete already in progress for:', zoneId);
      return;
    }

    // Find the zone to delete
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) {
      console.error('❌ Zone not found:', zoneId);
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the delivery zone "${zone.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Add to loading set
      setDeletingZones(prev => new Set(prev).add(zoneId));

      console.log(`🗑️ Deleting zone: ${zone.name} (${zoneId})`);

      // Make API call
      const response = await fetch(`/api/admin/delivery-zones?id=${zoneId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ Zone deleted successfully:', result);

      // Remove zone from UI
      setZones(prevZones => prevZones.filter(z => z.id !== zoneId));

      toast.success(`Delivery zone "${zone.name}" deleted successfully`);
    } catch (error) {
      console.error('❌ Error deleting zone:', error);
      toast.error(
        `Failed to delete zone: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      // Remove from loading set
      setDeletingZones(prev => {
        const newSet = new Set(prev);
        newSet.delete(zoneId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Loading Delivery Zones...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-orange-600" />
                Catering Delivery Zones
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                Configure minimum order requirements and delivery fees for catering orders based on
                delivery location. These settings only apply to catering orders, not regular product
                shipping.
              </CardDescription>
            </div>
            <Button onClick={startNewZone} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-2">How Delivery Zones Work</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Zones determine minimum order amounts for catering delivery</li>
                  <li>• Customers see requirements based on their delivery address</li>
                  <li>• Delivery fees are automatically calculated per zone</li>
                  <li>• Multiple postal codes and cities can map to one zone</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Zone List */}
          <div className="space-y-4">
            {zones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No delivery zones configured</p>
                <p className="text-sm">Create your first catering delivery zone to get started</p>
              </div>
            ) : (
              zones.map((zone, index) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  index={index}
                  onEdit={() => startEditZone(zone)}
                  onToggle={isActive => updateZoneStatus(zone.id, isActive)}
                  onDelete={() => deleteZone(zone.id)}
                  isToggling={togglingZones.has(zone.id)}
                  isDeleting={deletingZones.has(zone.id)}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal for Add/Edit */}
      <DeliveryZoneModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        zone={editingZone}
        onSuccess={handleModalSuccess}
        totalZones={zones.length}
      />
    </div>
  );
}
