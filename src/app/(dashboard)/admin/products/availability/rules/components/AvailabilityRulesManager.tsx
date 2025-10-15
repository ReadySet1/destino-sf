'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormSection } from '@/components/ui/form/FormSection';
import { AvailabilityFilters } from '@/components/admin/availability/AvailabilityFilters';
import { AvailabilityForm } from '@/components/admin/availability/AvailabilityForm';
import { RuleCard } from './RuleCard';
import { Trash2, Calendar, ListFilter, Loader2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { AvailabilityState, RuleType, type AvailabilityRule } from '@/types/availability';
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
      const productsResponse = await fetch('/api/products?onlyActive=false&excludeCatering=true');
      if (!productsResponse.ok) {
        throw new Error('Failed to load products');
      }
      const productsData = await productsResponse.json();
      const productsArray = Array.isArray(productsData) ? productsData : productsData.data || [];

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
      console.log('[AvailabilityRulesManager] Toggling rule', {
        ruleId: rule.id,
        currentEnabled: rule.enabled,
      });

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
        selectedRules.map(ruleId => fetch(`/api/availability/${ruleId}`, { method: 'DELETE' }))
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

  // Filter and aggregate rules by name
  const { filteredRules, aggregatedRules } = useMemo(() => {
    // First, filter individual rules
    const filtered = rules.filter(rule => {
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

    // Then, aggregate by rule name
    const aggregated = new Map<string, AvailabilityRule[]>();
    filtered.forEach(rule => {
      const existing = aggregated.get(rule.name) || [];
      aggregated.set(rule.name, [...existing, rule]);
    });

    // Sort by priority (descending) then by name
    const sortedEntries = Array.from(aggregated.entries()).sort((a, b) => {
      const priorityDiff = (b[1][0].priority || 0) - (a[1][0].priority || 0);
      if (priorityDiff !== 0) return priorityDiff;
      return a[0].localeCompare(b[0]);
    });

    return {
      filteredRules: filtered,
      aggregatedRules: new Map(sortedEntries),
    };
  }, [rules, searchTerm, filterType, filterState, filterStatus, products]);

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
    <div className="space-y-6 mt-8">
      {/* Filters */}
      <AvailabilityFilters
        currentSearch={searchTerm}
        currentRuleType={filterType}
        currentState={filterState}
        currentStatus={filterStatus}
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Layers className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Rules</p>
              <p className="text-2xl font-bold text-gray-900">{aggregatedRules.size}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Products</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredRules.filter(r => r.enabled).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ListFilter className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Filtered</p>
              <p className="text-2xl font-bold text-gray-900">
                {aggregatedRules.size} / {new Set(rules.map(r => r.name)).size}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-gray-900">
                {
                  Array.from(aggregatedRules.values()).filter(rules => rules[0].priority >= 70)
                    .length
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      <div>
        {aggregatedRules.size === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {rules.length === 0 ? 'No availability rules found' : 'No rules match your filters'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {rules.length === 0
                ? 'Create your first availability rule to get started'
                : 'Try adjusting your search or filter criteria'}
            </p>
            {rules.length === 0 && (
              <Button
                onClick={() =>
                  (window.location.href = '/admin/products/availability/rules?action=create')
                }
              >
                Create Your First Rule
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {Array.from(aggregatedRules.entries()).map(([ruleName, ruleGroup]) => (
              <RuleCard
                key={ruleName}
                ruleName={ruleName}
                rules={ruleGroup}
                products={products}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
                onToggleEnabled={toggleRuleEnabled}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
