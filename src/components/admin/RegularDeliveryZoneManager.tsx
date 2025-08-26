'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Save, Trash2, MapPin, DollarSign, Clock, Info, ShoppingBag } from 'lucide-react';

interface RegularDeliveryZone {
  id: string;
  zone: string;
  name: string;
  description?: string | null;
  minimumOrderForFree: number;
  deliveryFee: number;
  estimatedDeliveryTime?: string | null;
  isActive: boolean;
  postalCodes: string[];
  cities: string[];
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RegularDeliveryZoneManagerProps {
  className?: string;
}

interface ZoneCardProps {
  zone: RegularDeliveryZone;
  index: number;
  onEdit: () => void;
  onToggle: (isActive: boolean) => void;
  onDelete: () => void;
  isToggling: boolean;
  isDeleting: boolean;
}

function ZoneCard({ zone, index, onEdit, onToggle, onDelete, isToggling, isDeleting }: ZoneCardProps) {
  const statusColor = zone.isActive ? 'border-l-green-500' : 'border-l-gray-400';
  const statusBadge = zone.isActive 
    ? <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
    : <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>;

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
            
            {zone.description && (
              <p className="text-sm text-gray-600 mb-3">{zone.description}</p>
            )}
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <div>
                  <span className="text-gray-500">Delivery Fee:</span>
                  <div className="font-medium">${zone.deliveryFee.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <span className="text-gray-500">Free Over:</span>
                  <div className="font-medium">
                    {zone.minimumOrderForFree > 0 ? `$${zone.minimumOrderForFree.toFixed(2)}` : 'No minimum'}
                  </div>
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
                <Switch
                  checked={zone.isActive}
                  onCheckedChange={onToggle}
                  disabled={isToggling}
                />
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
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
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
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
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

export default function RegularDeliveryZoneManager({ className }: RegularDeliveryZoneManagerProps) {
  const [zones, setZones] = useState<RegularDeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingZone, setEditingZone] = useState<RegularDeliveryZone | null>(null);
  const [isNewZone, setIsNewZone] = useState(false);
  
  // Track loading states for individual zone toggles
  const [togglingZones, setTogglingZones] = useState<Set<string>>(new Set());
  
  // Track loading states for individual zone deletes  
  const [deletingZones, setDeletingZones] = useState<Set<string>>(new Set());

  // Form state for editing zone
  const [formData, setFormData] = useState({
    zone: '',
    name: '',
    description: '',
    minimumOrderForFree: 0,
    deliveryFee: 0,
    estimatedDeliveryTime: '',
    isActive: true,
    postalCodes: '',
    cities: '',
    displayOrder: 0,
  });

  const loadDeliveryZones = useCallback(async () => {
    try {
      console.log('🔄 Loading regular delivery zones...');
      const response = await fetch('/api/admin/regular-delivery-zones');
      if (!response.ok) {
        throw new Error(`Failed to load regular delivery zones: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Regular delivery zones loaded:', data.deliveryZones);
      setZones(data.deliveryZones || []);
    } catch (error) {
      console.error('❌ Error loading regular delivery zones:', error);
      toast.error('Failed to load regular delivery zones');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load delivery zones
  useEffect(() => {
    loadDeliveryZones();
  }, [loadDeliveryZones]);

  const resetForm = () => {
    setFormData({
      zone: '',
      name: '',
      description: '',
      minimumOrderForFree: 0,
      deliveryFee: 0,
      estimatedDeliveryTime: '',
      isActive: true,
      postalCodes: '',
      cities: '',
      displayOrder: zones.length,
    });
    setEditingZone(null);
    setIsNewZone(false);
  };

  const startNewZone = () => {
    resetForm();
    setIsNewZone(true);
    setEditingZone(null);
  };

  const startEditZone = (zone: RegularDeliveryZone) => {
    setFormData({
      zone: zone.zone,
      name: zone.name,
      description: zone.description || '',
      minimumOrderForFree: zone.minimumOrderForFree,
      deliveryFee: zone.deliveryFee,
      estimatedDeliveryTime: zone.estimatedDeliveryTime || '',
      isActive: zone.isActive,
      postalCodes: zone.postalCodes.join(', '),
      cities: zone.cities.join(', '),
      displayOrder: zone.displayOrder,
    });
    setEditingZone(zone);
    setIsNewZone(false);
  };

  const saveZone = async () => {
    if (!formData.name.trim() || !formData.zone.trim()) {
      toast.error('Zone name and identifier are required');
      return;
    }

    setSaving(true);
    try {
      const zoneData = {
        ...formData,
        id: editingZone?.id,
        postalCodes: formData.postalCodes
          .split(',')
          .map(code => code.trim())
          .filter(code => code.length > 0),
        cities: formData.cities
          .split(',')
          .map(city => city.trim())
          .filter(city => city.length > 0),
      };

      const response = await fetch('/api/admin/regular-delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zoneData),
      });

      if (!response.ok) {
        throw new Error('Failed to save regular delivery zone');
      }

      const result = await response.json();
      toast.success(result.message);

      // Reload zones and reset form
      await loadDeliveryZones();
      resetForm();
    } catch (error) {
      console.error('Error saving regular delivery zone:', error);
      toast.error('Failed to save regular delivery zone');
    } finally {
      setSaving(false);
    }
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
      console.log(`🔄 Optimistically updating regular zone ${zoneId} to ${isActive}`);
      setZones(prevZones => 
        prevZones.map(z => 
          z.id === zoneId ? { ...z, isActive } : z
        )
      );

      // Make API call
      console.log(`📡 Making API call to update regular zone ${zoneId}`);
      const response = await fetch('/api/admin/regular-delivery-zones', {
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
      console.log('✅ Regular zone status updated successfully:', result);
      
      // Success - no need to reload since we already updated optimistically
      toast.success(`Regular zone ${isActive ? 'activated' : 'deactivated'} successfully`);
      
    } catch (error) {
      console.error('❌ Error updating regular zone status:', error);
      
      // Rollback optimistic update on error
      console.log('🔄 Rolling back optimistic update for zone:', zoneId);
      setZones(originalZones);
      
      // Show error message
      toast.error(`Failed to ${isActive ? 'activate' : 'deactivate'} regular zone: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
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
      console.log('⚠️ Regular zone delete already in progress for:', zoneId);
      return;
    }

    // Find the zone to delete
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) {
      console.error('❌ Regular zone not found:', zoneId);
      return;
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete the regular delivery zone "${zone.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      // Add to loading set
      setDeletingZones(prev => new Set(prev).add(zoneId));
      
      console.log(`🗑️ Deleting regular zone: ${zone.name} (${zoneId})`);

      // Make API call
      const response = await fetch(`/api/admin/regular-delivery-zones?id=${zoneId}`, {
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
      console.log('✅ Regular zone deleted successfully:', result);
      
      // Remove zone from UI
      setZones(prevZones => prevZones.filter(z => z.id !== zoneId));
      
      // Clear editing state if this zone was being edited
      if (editingZone?.id === zoneId) {
        resetForm();
      }
      
      toast.success(`Regular delivery zone "${zone.name}" deleted successfully`);
      
    } catch (error) {
      console.error('❌ Error deleting regular zone:', error);
      toast.error(`Failed to delete regular zone: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
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
          <CardTitle>Loading Regular Delivery Zones...</CardTitle>
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
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                Regular Product Delivery Zones
              </CardTitle>
              <CardDescription className="mt-2 max-w-2xl">
                Configure delivery fees for regular products (empanadas, alfajores) 
                based on delivery location. These settings only apply to regular orders, 
                not catering deliveries.
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
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  How Regular Product Delivery Works
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Fixed delivery fees for empanadas, alfajores, and other regular products</li>
                  <li>• Optional free delivery threshold (e.g., free over $75)</li>
                  <li>• Automatic fee calculation based on customer address</li>
                  <li>• Separate from catering delivery zones and pricing</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Zone List */}
          <div className="space-y-4">
            {zones.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No regular delivery zones configured</p>
                <p className="text-sm">Create your first regular product delivery zone to get started</p>
              </div>
            ) : (
              zones.map((zone, index) => (
                <ZoneCard
                  key={zone.id}
                  zone={zone}
                  index={index}
                  onEdit={() => startEditZone(zone)}
                  onToggle={(isActive) => updateZoneStatus(zone.id, isActive)}
                  onDelete={() => deleteZone(zone.id)}
                  isToggling={togglingZones.has(zone.id)}
                  isDeleting={deletingZones.has(zone.id)}
                />
              ))
            )}

            {/* Add/Edit Zone Form */}
            {(isNewZone || editingZone) && (
              <>
                <Separator />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5 text-blue-600" />
                      {isNewZone ? 'Add New Regular Zone' : 'Edit Regular Zone'}
                    </CardTitle>
                    <CardDescription>
                      {isNewZone 
                        ? 'Configure delivery fees for regular products in a new delivery area'
                        : 'Update the delivery settings for this regular product zone'
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="zone">Zone Identifier</Label>
                        <Input
                          id="zone"
                          value={formData.zone}
                          onChange={e => setFormData({ ...formData, zone: e.target.value })}
                          placeholder="e.g., sf_nearby"
                        />
                      </div>

                      <div>
                        <Label htmlFor="name">Zone Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g., San Francisco Nearby"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description of the delivery zone"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="deliveryFee" className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          Delivery Fee ($)
                        </Label>
                        <Input
                          id="deliveryFee"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.deliveryFee}
                          onChange={e => setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Fixed delivery charge for regular products to this zone
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="minimumOrderForFree" className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          Free Delivery Over ($)
                        </Label>
                        <Input
                          id="minimumOrderForFree"
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.minimumOrderForFree}
                          onChange={e => setFormData({ ...formData, minimumOrderForFree: parseFloat(e.target.value) || 0 })}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum order value for free delivery (0 = no free delivery)
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="estimatedDeliveryTime" className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          Estimated Delivery Time
                        </Label>
                        <Input
                          id="estimatedDeliveryTime"
                          value={formData.estimatedDeliveryTime}
                          onChange={e => setFormData({ ...formData, estimatedDeliveryTime: e.target.value })}
                          placeholder="e.g., 30-60 minutes"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Typical delivery time customers can expect
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cities">Cities (comma-separated)</Label>
                      <Input
                        id="cities"
                        value={formData.cities}
                        onChange={e => setFormData({ ...formData, cities: e.target.value })}
                        placeholder="San Francisco, Daly City, South San Francisco"
                      />
                    </div>

                    <div>
                      <Label htmlFor="postalCodes">Postal Codes (comma-separated)</Label>
                      <Textarea
                        id="postalCodes"
                        value={formData.postalCodes}
                        onChange={e => setFormData({ ...formData, postalCodes: e.target.value })}
                        placeholder="94102, 94103, 94104..."
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
                      />
                      <Label htmlFor="isActive">Zone is active</Label>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={saveZone}
                        disabled={saving}
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Zone'}
                      </Button>
                      <Button variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
