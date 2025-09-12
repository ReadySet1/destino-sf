'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Plus, Settings, Activity, Eye } from 'lucide-react';
import { AvailabilityForm } from '@/components/admin/availability/AvailabilityForm';
import { AvailabilityTimeline } from '@/components/admin/availability/AvailabilityTimeline';
import { DetailedAvailabilityBadge } from '@/components/store/AvailabilityBadge';
import { useAvailability } from '@/hooks/useAvailability';
import { 
  getProductRuleConflicts,
  deleteAvailabilityRule 
} from '@/actions/availability';
import { type AvailabilityRule } from '@/types/availability';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AvailabilitySectionProps {
  productId: string;
  productName: string;
}

export function AvailabilitySection({
  productId,
  productName
}: AvailabilitySectionProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(false);

  const {
    rules,
    evaluation,
    currentState,
    nextStateChange,
    refresh,
    isLoading,
    error
  } = useAvailability(productId, { autoRefresh: true });

  // Load conflicts when rules change
  useEffect(() => {
    if (rules.length > 1) {
      loadConflicts();
    }
  }, [rules]);

  const loadConflicts = async () => {
    try {
      setIsLoadingConflicts(true);
      const result = await getProductRuleConflicts(productId);
      
      if (result.success) {
        setConflicts(result.data?.conflicts || []);
      }
    } catch (error) {
      console.error('Error loading conflicts:', error);
    } finally {
      setIsLoadingConflicts(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    refresh();
    toast.success('Availability rule created successfully');
  };

  const handleEditSuccess = () => {
    setEditingRule(null);
    refresh();
    toast.success('Availability rule updated successfully');
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this availability rule?')) {
      return;
    }

    try {
      const result = await deleteAvailabilityRule(ruleId);
      
      if (result.success) {
        refresh();
        toast.success('Availability rule deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete rule');
      }
    } catch (error) {
      toast.error('Error deleting rule');
    }
  };

  const getRulePriorityBadge = (priority: number) => {
    if (priority === 0) return 'Low';
    if (priority <= 3) return 'Medium';
    if (priority <= 7) return 'High';
    return 'Critical';
  };

  const getPriorityColor = (priority: number) => {
    if (priority === 0) return 'bg-gray-100 text-gray-800';
    if (priority <= 3) return 'bg-blue-100 text-blue-800';
    if (priority <= 7) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
            <span className="ml-2">Loading availability...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading availability: {error}</p>
            <Button onClick={refresh} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Availability Status
            </CardTitle>
            
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Current State */}
            <div>
              <h4 className="font-medium mb-2">Current Status</h4>
              <DetailedAvailabilityBadge
                state={currentState}
                evaluation={evaluation || undefined}
                preOrderSettings={evaluation?.appliedRules?.[0]?.preOrderSettings || undefined}
                viewOnlySettings={evaluation?.appliedRules?.[0]?.viewOnlySettings || undefined}
                nextStateChange={nextStateChange}
              />
            </div>

            {/* Active Rules Count */}
            <div>
              <h4 className="font-medium mb-2">Active Rules</h4>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {rules.filter(r => r.enabled).length} active
                </Badge>
                <Badge variant="secondary">
                  {rules.length} total
                </Badge>
              </div>
            </div>

            {/* Next Change */}
            <div>
              <h4 className="font-medium mb-2">Next Change</h4>
              {nextStateChange ? (
                <p className="text-sm text-muted-foreground">
                  {format(nextStateChange.date, 'MMM d, yyyy')} - {nextStateChange.newState}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">No scheduled changes</p>
              )}
            </div>
          </div>

          {/* Conflicts Warning */}
          {conflicts.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <Settings className="h-4 w-4" />
                <span className="font-medium">
                  {conflicts.length} rule conflict{conflicts.length !== 1 ? 's' : ''} detected
                </span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Multiple rules have the same priority or overlapping dates. Review your rules for optimal behavior.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rules Management */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="rules" className="w-full">
            <div className="px-6 pt-6">
              <TabsList>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="form" disabled={!showCreateForm && !editingRule}>
                  {editingRule ? 'Edit Rule' : 'Create Rule'}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Rules List */}
            <TabsContent value="rules" className="p-6 pt-4">
              {rules.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-medium mb-2">No availability rules</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create rules to control when this product is available for purchase.
                  </p>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Rule
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{rule.name}</h4>
                            <Badge
                              variant="outline"
                              className={getPriorityColor(rule.priority || 0)}
                            >
                              Priority {rule.priority} ({getRulePriorityBadge(rule.priority || 0)})
                            </Badge>
                            {!rule.enabled && (
                              <Badge variant="secondary">Disabled</Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Type:</strong> {rule.ruleType}</p>
                            <p><strong>State:</strong> {rule.state}</p>
                            {rule.startDate && (
                              <p>
                                <strong>Period:</strong> {format(new Date(rule.startDate), 'MMM d, yyyy')}
                                {rule.endDate && ` - ${format(new Date(rule.endDate), 'MMM d, yyyy')}`}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRule(rule)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteRule(rule.id!)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Timeline View */}
            <TabsContent value="timeline" className="p-6 pt-4">
              <AvailabilityTimeline
                productId={productId}
                rules={rules}
                evaluation={evaluation || undefined}
                timeRange={90} // Show 3 months
              />
            </TabsContent>

            {/* Create/Edit Form */}
            <TabsContent value="form" className="p-6 pt-4">
              {(showCreateForm || editingRule) && (
                <AvailabilityForm
                  productId={productId}
                  rule={editingRule || undefined}
                  onSuccess={editingRule ? handleEditSuccess : handleCreateSuccess}
                  onCancel={() => {
                    setShowCreateForm(false);
                    setEditingRule(null);
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
