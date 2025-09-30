'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormSection } from '@/components/ui/form/FormSection';
import { AvailabilityFilters } from '@/components/admin/availability/AvailabilityFilters';
import { AvailabilityStatusBadge } from '@/components/admin/availability/AvailabilityStatusBadge';
import { AvailabilityForm } from '@/components/admin/availability/AvailabilityForm';
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  ListFilter,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AvailabilityState,
  RuleType,
  type AvailabilityRule,
} from '@/types/availability';
import { getRuleTypeLabel, getPriorityColor } from '@/lib/availability-helpers';
import { cn } from '@/lib/utils';

interface ProductInfo {
  id: string;
  name: string;
  category?: {
    name: string;
  };
}

interface AvailabilityRulesManagerProps {
  initialProductId?: string;
  initialAction?: string;
}

/**
 * Main rules management component
 * Handles displaying, filtering, and managing availability rules
 */
export function AvailabilityRulesManager({
  initialProductId,
  initialAction,
}: AvailabilityRulesManagerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [products, setProducts] = useState<Map<string, ProductInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(initialAction === 'create');
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');

  // Get filter params
  const searchTerm = searchParams.get('search') || '';
  const filterType = searchParams.get('ruleType') || 'all';
  const filterState = searchParams.get('state') || 'all';
  const filterStatus = searchParams.get('status') || 'all';

  useEffect(() => {
    loadRulesAndProducts();
  }, []);

  const loadRulesAndProducts = async () => {
    try {
      setLoading(true);

      // Load all rules
      const rulesResponse = await fetch('/api/availability');
      if (!rulesResponse.ok) {
        throw new Error('Failed to load rules');
      }
      const rulesData = await rulesResponse.json();
      const rulesArray = rulesData.success ? rulesData.data : [];

      // Load products info
      const productsResponse = await fetch(
        '/api/products?onlyActive=false&excludeCatering=true'
      );
      if (!productsResponse.ok) {
        throw new Error('Failed to load products');
      }
      const productsData = await productsResponse.json();
      const productsArray = Array.isArray(productsData)
        ? productsData
        : productsData.data || [];

      // Create products map for quick lookup
      const productsMap = new Map<string, ProductInfo>();
      productsArray.forEach((product: any) => {
        productsMap.set(product.id, {
          id: product.id,
          name: product.name,
          category: product.category,
        });
      });

      setRules(rulesArray);
      setProducts(productsMap);
    } catch (error) {
      console.error('Error loading rules and products:', error);
      toast.error('Failed to load availability rules');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/availability/${ruleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      toast.success('Rule deleted successfully');
      loadRulesAndProducts();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const toggleRuleEnabled = async (rule: AvailabilityRule) => {
    try {
      console.log('[AvailabilityRulesManager] Toggling rule', { ruleId: rule.id, currentEnabled: rule.enabled });

      const ruleData = {
        productId: rule.productId,
        name: rule.name,
        enabled: !rule.enabled,
        priority: rule.priority,
        ruleType: rule.ruleType,
        state: rule.state,
        startDate: rule.startDate,
        endDate: rule.endDate,
        seasonalConfig: rule.seasonalConfig,
        timeRestrictions: rule.timeRestrictions,
        preOrderSettings: rule.preOrderSettings,
        viewOnlySettings: rule.viewOnlySettings,
        overrideSquare: rule.overrideSquare,
      };

      // Add query parameter to skip future date validation when toggling
      const response = await fetch(`/api/availability/${rule.id}?skipValidation=true`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      });

      console.log('[AvailabilityRulesManager] Response status', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[AvailabilityRulesManager] API error', errorData);
        throw new Error(errorData.error || 'Failed to update rule');
      }

      const result = await response.json();
      console.log('[AvailabilityRulesManager] Update successful', result);

      toast.success(`Rule ${rule.enabled ? 'disabled' : 'enabled'} successfully`);

      console.log('[AvailabilityRulesManager] Reloading rules...');
      await loadRulesAndProducts();
      console.log('[AvailabilityRulesManager] Rules reloaded');
    } catch (error) {
      console.error('[AvailabilityRulesManager] Error updating rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update rule');
    }
  };

  const handleSelectRule = (ruleId: string, checked: boolean) => {
    if (checked) {
      setSelectedRules(prev => [...prev, ruleId]);
    } else {
      setSelectedRules(prev => prev.filter(id => id !== ruleId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRules(filteredRules.map(r => r.id).filter(Boolean) as string[]);
    } else {
      setSelectedRules([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRules.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedRules.length} rules?`)) {
      return;
    }

    try {
      await Promise.all(
        selectedRules.map(ruleId =>
          fetch(`/api/availability/${ruleId}`, { method: 'DELETE' })
        )
      );

      toast.success(`Successfully deleted ${selectedRules.length} rules`);
      setSelectedRules([]);
      loadRulesAndProducts();
    } catch (error) {
      toast.error('Failed to delete some rules');
    }
  };

  const handleEditRule = (rule: AvailabilityRule) => {
    setEditingRule(rule);
    setSelectedProductId(rule.productId);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingRule(null);
    setSelectedProductId('');
    loadRulesAndProducts();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingRule(null);
    setSelectedProductId('');
  };

  // Filter rules
  const filteredRules = rules.filter(rule => {
    const matchesSearch =
      !searchTerm ||
      rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      products.get(rule.productId)?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || rule.ruleType === filterType;
    const matchesState = filterState === 'all' || rule.state === filterState;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'enabled' && rule.enabled) ||
      (filterStatus === 'disabled' && !rule.enabled);

    return matchesSearch && matchesType && matchesState && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-8 mt-8">
        <div className="bg-white shadow-sm rounded-xl border p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading availability rules...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="mt-8">
        <AvailabilityForm
          productId={selectedProductId || undefined}
          rule={editingRule || undefined}
          showProductSelector={!selectedProductId}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-8">
      {/* Filters */}
      <AvailabilityFilters
        currentSearch={searchTerm}
        currentRuleType={filterType}
        currentState={filterState}
        currentStatus={filterStatus}
      />

      {/* Rules Table */}
      <FormSection
        title="Availability Rules"
        description="Manage product availability rules and scheduling"
        icon={<ListFilter className="w-6 h-6" />}
        variant="blue"
      >
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {/* Bulk Actions Toolbar */}
          {selectedRules.length > 0 && (
            <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-900">
                  {selectedRules.length} rule{selectedRules.length !== 1 ? 's' : ''} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDelete}
                    className="bg-white hover:bg-gray-50 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={
                        filteredRules.length > 0 &&
                        selectedRules.length === filteredRules.length
                      }
                      onChange={e => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium mb-2">
                          {rules.length === 0
                            ? 'No availability rules found'
                            : 'No rules match your filters'}
                        </p>
                        <p className="text-sm">
                          {rules.length === 0
                            ? 'Create your first availability rule to get started'
                            : 'Try adjusting your search or filter criteria'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRules.map(rule => {
                    const product = products.get(rule.productId);
                    return (
                      <TableRow
                        key={rule.id}
                        className={cn(
                          'hover:bg-gray-50 transition-colors',
                          selectedRules.includes(rule.id!) && 'bg-indigo-50/50'
                        )}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRules.includes(rule.id!)}
                            onChange={e => handleSelectRule(rule.id!, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                          {rule.name}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">
                              {product?.name || 'Unknown Product'}
                            </div>
                            {product?.category && (
                              <div className="text-sm text-gray-500">
                                {product.category.name}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {getRuleTypeLabel(rule.ruleType as RuleType)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AvailabilityStatusBadge
                            state={rule.state as AvailabilityState}
                            size="sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn('font-semibold', getPriorityColor(rule.priority || 0))}
                          >
                            {rule.priority || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {rule.startDate && (
                              <div className="text-gray-900">
                                Start: {format(new Date(rule.startDate), 'MMM d, yyyy')}
                              </div>
                            )}
                            {rule.endDate && (
                              <div className="text-gray-600">
                                End: {format(new Date(rule.endDate), 'MMM d, yyyy')}
                              </div>
                            )}
                            {!rule.startDate && !rule.endDate && (
                              <span className="text-gray-400">No schedule</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRuleEnabled(rule)}
                            className={cn(
                              'flex items-center gap-1 h-8 px-2',
                              rule.enabled ? 'text-green-600' : 'text-gray-400'
                            )}
                          >
                            {rule.enabled ? (
                              <>
                                <Eye className="h-3 w-3" />
                                <span className="text-xs">Enabled</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-3 w-3" />
                                <span className="text-xs">Disabled</span>
                              </>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => handleEditRule(rule)}
                                className="cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Rule
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => toggleRuleEnabled(rule)}
                                className="cursor-pointer"
                              >
                                {rule.enabled ? (
                                  <>
                                    <EyeOff className="h-4 w-4 mr-2" />
                                    Disable Rule
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Enable Rule
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => rule.id && handleDeleteRule(rule.id)}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Rule
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </FormSection>
    </div>
  );
}