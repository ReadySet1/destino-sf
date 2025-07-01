'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Save, Trash2, MapPin, DollarSign, Clock } from 'lucide-react';

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

export default function DeliveryZoneManager({ className }: DeliveryZoneManagerProps) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [isNewZone, setIsNewZone] = useState(false);

  // Form state for editing zone
  const [formData, setFormData] = useState({
    zone: '',
    name: '',
    description: '',
    minimumAmount: 0,
    deliveryFee: 0,
    estimatedDeliveryTime: '',
    isActive: true,
    postalCodes: '',
    cities: '',
    displayOrder: 0,
  });

  // Load delivery zones
  useEffect(() => {
    loadDeliveryZones();
  }, []);

  const loadDeliveryZones = async () => {
    try {
      const response = await fetch('/api/admin/delivery-zones');
      if (!response.ok) {
        throw new Error('Failed to load delivery zones');
      }
      const data = await response.json();
      setZones(data.deliveryZones || []);
    } catch (error) {
      console.error('Error loading delivery zones:', error);
      toast.error('Failed to load delivery zones');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      zone: '',
      name: '',
      description: '',
      minimumAmount: 0,
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

  const startEditZone = (zone: DeliveryZone) => {
    setFormData({
      zone: zone.zone,
      name: zone.name,
      description: zone.description || '',
      minimumAmount: zone.minimumAmount,
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

      const response = await fetch('/api/admin/delivery-zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zoneData),
      });

      if (!response.ok) {
        throw new Error('Failed to save delivery zone');
      }

      const result = await response.json();
      toast.success(result.message);
      
      // Reload zones and reset form
      await loadDeliveryZones();
      resetForm();
    } catch (error) {
      console.error('Error saving delivery zone:', error);
      toast.error('Failed to save delivery zone');
    } finally {
      setSaving(false);
    }
  };

  const updateZoneStatus = async (zoneId: string, isActive: boolean) => {
    try {
      const zone = zones.find(z => z.id === zoneId);
      if (!zone) return;

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
        throw new Error('Failed to update zone status');
      }

      await loadDeliveryZones();
      toast.success(`Zone ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating zone status:', error);
      toast.error('Failed to update zone status');
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Zones
              </CardTitle>
              <CardDescription>
                Configure minimum order amounts and delivery fees for different zones
              </CardDescription>
            </div>
            <Button onClick={startNewZone} className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Zone
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Zone List */}
          <div className="space-y-4">
            {zones.map((zone) => (
              <Card key={zone.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{zone.name}</h3>
                        <Switch
                          checked={zone.isActive}
                          onCheckedChange={(checked) => updateZoneStatus(zone.id, checked)}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{zone.description}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Min: ${zone.minimumAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Fee: ${zone.deliveryFee.toFixed(2)}</span>
                        </div>
                        {zone.estimatedDeliveryTime && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{zone.estimatedDeliveryTime}</span>
                          </div>
                        )}
                      </div>
                      {zone.cities.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Cities: </span>
                          <span className="text-xs">{zone.cities.join(', ')}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditZone(zone)}
                    >
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Edit Form */}
          {(editingZone || isNewZone) && (
            <>
              <Separator className="my-6" />
              <Card>
                <CardHeader>
                  <CardTitle>
                    {isNewZone ? 'Add New Zone' : `Edit ${editingZone?.name}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zone">Zone Identifier</Label>
                      <Input
                        id="zone"
                        value={formData.zone}
                        onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                        placeholder="SAN_FRANCISCO"
                        disabled={!isNewZone}
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Zone Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="San Francisco"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Zone description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minimumAmount">Minimum Order Amount ($)</Label>
                      <Input
                        id="minimumAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.minimumAmount}
                        onChange={(e) => setFormData({ ...formData, minimumAmount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryFee">Delivery Fee ($)</Label>
                      <Input
                        id="deliveryFee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.deliveryFee}
                        onChange={(e) => setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="estimatedDeliveryTime">Estimated Delivery Time</Label>
                    <Input
                      id="estimatedDeliveryTime"
                      value={formData.estimatedDeliveryTime}
                      onChange={(e) => setFormData({ ...formData, estimatedDeliveryTime: e.target.value })}
                      placeholder="2-3 hours"
                    />
                  </div>

                  <div>
                    <Label htmlFor="cities">Cities (comma-separated)</Label>
                    <Input
                      id="cities"
                      value={formData.cities}
                      onChange={(e) => setFormData({ ...formData, cities: e.target.value })}
                      placeholder="San Francisco, Daly City, South San Francisco"
                    />
                  </div>

                  <div>
                    <Label htmlFor="postalCodes">Postal Codes (comma-separated)</Label>
                    <Textarea
                      id="postalCodes"
                      value={formData.postalCodes}
                      onChange={(e) => setFormData({ ...formData, postalCodes: e.target.value })}
                      placeholder="94102, 94103, 94104..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
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
        </CardContent>
      </Card>
    </div>
  );
} 