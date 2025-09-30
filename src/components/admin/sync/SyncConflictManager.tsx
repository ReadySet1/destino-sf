'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Settings,
  Eye,
  EyeOff,
  Package,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncConflict {
  id: string;
  productId: string;
  productName: string;
  squareId: string;
  conflictType: 'visibility' | 'availability' | 'state' | 'preorder';
  currentValue: any;
  squareValue: any;
  manualValue?: any;
  hasManualOverrides: boolean;
  lastSyncAt: Date;
  createdAt: Date;
}

interface ConflictSummary {
  total: number;
  byType: Record<string, number>;
  withManualOverrides: number;
  critical: number;
}

interface ConflictResolution {
  conflictId: string;
  resolution: 'keep_manual' | 'accept_square' | 'custom';
  customValue?: any;
  applyToFuture: boolean;
}

export function SyncConflictManager() {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [summary, setSummary] = useState<ConflictSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(new Map());

  useEffect(() => {
    loadConflicts();
  }, [selectedFilter]);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedFilter !== 'all') {
        params.set('type', selectedFilter);
      }
      params.set('onlyUnresolved', 'true');

      const response = await fetch(`/api/admin/sync-conflicts?${params}`);
      const data = await response.json();

      if (data.success) {
        setConflicts(data.data.conflicts);
        setSummary(data.data.summary);
      } else {
        toast.error('Failed to load sync conflicts');
      }
    } catch (error) {
      console.error('Error loading conflicts:', error);
      toast.error('Failed to load sync conflicts');
    } finally {
      setLoading(false);
    }
  };

  const updateResolution = (conflictId: string, resolution: Partial<ConflictResolution>) => {
    setResolutions(prev => {
      const updated = new Map(prev);
      const existing = updated.get(conflictId) || {
        conflictId,
        resolution: 'keep_manual',
        applyToFuture: false
      };
      updated.set(conflictId, { ...existing, ...resolution });
      return updated;
    });
  };

  const resolveConflicts = async () => {
    if (resolutions.size === 0) {
      toast.error('No resolutions selected');
      return;
    }

    try {
      setResolving(true);
      const response = await fetch('/api/admin/sync-conflicts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolutions: Array.from(resolutions.values())
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Resolved ${data.data.resolved.length} conflicts`);
        if (data.data.failed.length > 0) {
          toast.warning(`Failed to resolve ${data.data.failed.length} conflicts`);
        }
        setResolutions(new Map());
        await loadConflicts();
      } else {
        toast.error('Failed to resolve conflicts');
      }
    } catch (error) {
      console.error('Error resolving conflicts:', error);
      toast.error('Failed to resolve conflicts');
    } finally {
      setResolving(false);
    }
  };

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'visibility': return <Eye className="h-4 w-4" />;
      case 'availability': return <Package className="h-4 w-4" />;
      case 'state': return <Settings className="h-4 w-4" />;
      case 'preorder': return <Calendar className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getConflictBadgeColor = (type: string) => {
    switch (type) {
      case 'visibility': return 'bg-blue-100 text-blue-800';
      case 'availability': return 'bg-green-100 text-green-800';
      case 'state': return 'bg-yellow-100 text-yellow-800';
      case 'preorder': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return value?.toString() || 'N/A';
  };

  const filteredConflicts = conflicts.filter(conflict => 
    selectedFilter === 'all' || conflict.conflictType === selectedFilter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sync Conflict Manager</h1>
          <p className="text-gray-600">Resolve conflicts between Square and manual settings</p>
        </div>
        {resolutions.size > 0 && (
          <Button 
            onClick={resolveConflicts} 
            disabled={resolving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {resolving ? 'Resolving...' : `Resolve ${resolutions.size} Conflicts`}
          </Button>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Conflicts</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Manual Overrides</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.withManualOverrides}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <XCircle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.critical}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">To Resolve</p>
                  <p className="text-2xl font-bold text-gray-900">{resolutions.size}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {['all', 'visibility', 'availability', 'state', 'preorder'].map(filter => (
              <Button
                key={filter}
                variant={selectedFilter === filter ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter(filter)}
                className="capitalize"
              >
                {filter === 'all' ? 'All Conflicts' : filter}
                {summary && filter !== 'all' && (
                  <Badge variant="secondary" className="ml-2">
                    {summary.byType[filter] || 0}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conflicts List */}
      {filteredConflicts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Conflicts Found</h3>
            <p className="text-gray-600">All products are in sync with Square settings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredConflicts.map(conflict => {
            const resolution = resolutions.get(conflict.id);
            
            return (
              <Card key={conflict.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getConflictIcon(conflict.conflictType)}
                      <div>
                        <CardTitle className="text-lg">{conflict.productName}</CardTitle>
                        <p className="text-sm text-gray-600">Square ID: {conflict.squareId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getConflictBadgeColor(conflict.conflictType)}>
                        {conflict.conflictType}
                      </Badge>
                      {conflict.hasManualOverrides && (
                        <Badge variant="outline">Manual Override</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Conflict Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">Current Value</p>
                        <p className="text-lg text-blue-700">{formatValue(conflict.currentValue)}</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-orange-900">Square Value</p>
                        <p className="text-lg text-orange-700">{formatValue(conflict.squareValue)}</p>
                      </div>
                      {conflict.manualValue !== undefined && (
                        <div className="bg-green-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-green-900">Manual Value</p>
                          <p className="text-lg text-green-700">{formatValue(conflict.manualValue)}</p>
                        </div>
                      )}
                    </div>

                    {/* Resolution Options */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Resolution</h4>
                      <RadioGroup
                        value={resolution?.resolution || 'keep_manual'}
                        onValueChange={(value) => updateResolution(conflict.id, { 
                          resolution: value as any 
                        })}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="keep_manual" id={`${conflict.id}-keep`} />
                          <Label htmlFor={`${conflict.id}-keep`} className="flex-1">
                            Keep Current (Manual) Settings
                            <span className="block text-sm text-gray-600">
                              Preserve the current manual configuration
                            </span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="accept_square" id={`${conflict.id}-square`} />
                          <Label htmlFor={`${conflict.id}-square`} className="flex-1">
                            Accept Square Settings
                            <span className="block text-sm text-gray-600">
                              Update to match Square configuration
                            </span>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="custom" id={`${conflict.id}-custom`} />
                          <Label htmlFor={`${conflict.id}-custom`} className="flex-1">
                            Custom Value
                            <span className="block text-sm text-gray-600">
                              Set a specific custom value
                            </span>
                          </Label>
                        </div>
                      </RadioGroup>

                      {/* Apply to Future Option */}
                      <div className="mt-4 flex items-center space-x-2">
                        <Checkbox
                          id={`${conflict.id}-future`}
                          checked={resolution?.applyToFuture || false}
                          onCheckedChange={(checked) => updateResolution(conflict.id, {
                            applyToFuture: !!checked
                          })}
                        />
                        <Label htmlFor={`${conflict.id}-future`} className="text-sm">
                          Apply this resolution to future syncs (prevent similar conflicts)
                        </Label>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="text-xs text-gray-500 border-t pt-2">
                      Last sync: {new Date(conflict.lastSyncAt).toLocaleString()} |
                      Conflict detected: {new Date(conflict.createdAt).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help Text */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>About Sync Conflicts:</strong> These occur when your manual product settings 
          differ from Square&apos;s configuration. Resolving conflicts ensures data consistency 
          while preserving your intended product visibility and availability settings.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default SyncConflictManager;
