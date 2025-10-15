'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormSection } from '@/components/ui/form/FormSection';
import { AvailabilityStatCard } from '@/components/admin/availability/AvailabilityStatCard';
import { AvailabilityFilters } from '@/components/admin/availability/AvailabilityFilters';
import { AvailabilityForm } from '@/components/admin/availability/AvailabilityForm';
import { RuleCard } from '@/app/(dashboard)/admin/products/availability/rules/components/RuleCard';
import { AvailabilityActivityItem } from '@/types/availability-ui';
import { AvailabilityRule } from '@/types/availability';
import {
  Calendar,
  Clock,
  ShoppingCart,
  Sparkles,
  Activity,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getAvailabilityStatistics } from '@/actions/availability';
import { getRelativeTimeString } from '@/lib/availability-helpers';

interface AvailabilityStats {
  totalRules: number;
  activeRules: number;
  rulesByType: Record<string, number>;
  rulesByState: Record<string, number>;
}

interface ProductInfo {
  id: string;
  name: string;
  category?: {
    name: string;
  };
}

/**
 * Main overview component for availability management
 * Shows statistics and availability rules
 */
export function AvailabilityOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<AvailabilityStats | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [products, setProducts] = useState<Map<string, ProductInfo>>(new Map());
  const [recentActivity, setRecentActivity] = useState<AvailabilityActivityItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Parse search params for filters
  const searchTerm = searchParams.get('search') || '';
  const filterType = searchParams.get('ruleType') || 'all';
  const filterState = searchParams.get('state') || 'all';
  const filterStatus = searchParams.get('status') || 'all';

  useEffect(() => {
    loadStats();
    loadRecentActivity();
    loadRulesAndProducts();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoadingStats(true);
      const result = await getAvailabilityStatistics();

      if (result.success) {
        setStats(result.data);
      } else {
        toast.error('Failed to load statistics');
      }
    } catch (error) {
      toast.error('Error loading statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const loadRulesAndProducts = async () => {
    try {
      setIsLoadingRules(true);

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
      setIsLoadingRules(false);
    }
  };

  const loadRecentActivity = async () => {
    // TODO: Implement actual API endpoint for audit log
    // For now, we'll use mock data structure
    try {
      // This would be replaced with actual API call
      // const response = await fetch('/api/availability/activity');
      // const data = await response.json();

      // Mock data for now - replace with real API call
      setRecentActivity([]);
    } catch (error) {
      console.error('Error loading recent activity:', error);
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
      loadStats();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const handleEditRule = (rule: AvailabilityRule) => {
    setEditingRule(rule);
    setSelectedProductId(rule.productId);
    setShowRuleForm(true);
  };

  const toggleRuleEnabled = async (rule: AvailabilityRule) => {
    try {
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

      const response = await fetch(`/api/availability/${rule.id}?skipValidation=true`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ruleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update rule');
      }

      toast.success(`Rule ${rule.enabled ? 'disabled' : 'enabled'} successfully`);
      await loadRulesAndProducts();
    } catch (error) {
      console.error('Error updating rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update rule');
    }
  };

  const handleFormSuccess = () => {
    setShowRuleForm(false);
    setEditingRule(null);
    setSelectedProductId('');
    loadRulesAndProducts();
    loadStats();
  };

  const handleFormCancel = () => {
    setShowRuleForm(false);
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

  // If showing the form, render it exclusively
  if (showRuleForm) {
    return (
      <div className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingRule ? 'Edit Availability Rule' : 'Create Availability Rule'}
            </h2>
            <p className="text-gray-600 mt-1">Configure rule settings and schedule</p>
          </div>
          <Button variant="outline" onClick={handleFormCancel}>
            Back to Overview
          </Button>
        </div>
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

  // Loading state
  if (isLoadingStats || isLoadingRules) {
    return (
      <div className="space-y-8 mt-8">
        <div className="bg-white shadow-sm rounded-xl border p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading availability data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <AvailabilityStatCard
          title="Total Rules"
          value={stats?.totalRules || 0}
          subtitle={`${stats?.activeRules || 0} active`}
          icon={<Calendar className="w-5 h-5" />}
          variant="blue"
        />
        <AvailabilityStatCard
          title="Date Range Rules"
          value={stats?.rulesByType.date_range || 0}
          subtitle="Time-based rules"
          icon={<Clock className="w-5 h-5" />}
          variant="green"
        />
        <AvailabilityStatCard
          title="Pre-Order Items"
          value={stats?.rulesByState.pre_order || 0}
          subtitle="Products in pre-order"
          icon={<ShoppingCart className="w-5 h-5" />}
          variant="purple"
        />
        <AvailabilityStatCard
          title="Seasonal Rules"
          value={stats?.rulesByType.seasonal || 0}
          subtitle="Seasonal automation"
          icon={<Sparkles className="w-5 h-5" />}
          variant="amber"
        />
      </div>

      {/* Quick Actions Section */}
      <FormSection
        title="Quick Actions"
        description="Common availability management tasks"
        icon={<TrendingUp className="w-6 h-6" />}
        variant="indigo"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setSelectedProductId('');
              setEditingRule(null);
              setShowRuleForm(true);
            }}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Create New Rule</h4>
                <p className="text-sm text-gray-600">Add availability rule</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/products/availability/bulk')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Bulk Update</h4>
                <p className="text-sm text-gray-600">Update multiple products</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/admin/products/availability/timeline')}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">View Timeline</h4>
                <p className="text-sm text-gray-600">See rule schedule</p>
              </div>
            </div>
          </button>
        </div>
      </FormSection>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <FormSection
          title="Recent Activity"
          description="Latest changes to availability rules"
          icon={<Activity className="w-6 h-6" />}
          variant="amber"
        >
          <div className="space-y-3">
            {recentActivity.map(activity => (
              <div
                key={activity.id}
                className="flex items-center justify-between text-sm border-b border-gray-100 pb-3 last:border-0"
              >
                <div>
                  <p className="text-gray-900">{activity.description}</p>
                  {activity.userName && (
                    <p className="text-xs text-gray-500 mt-1">by {activity.userName}</p>
                  )}
                </div>
                <span className="text-gray-500 text-xs whitespace-nowrap">
                  {getRelativeTimeString(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </FormSection>
      )}

      {/* Availability Rules */}
      <FormSection
        title="Availability Rules"
        description="Manage and organize your product availability rules"
        icon={<Calendar className="w-6 h-6" />}
        variant="blue"
        action={
          <Button
            onClick={() => {
              setSelectedProductId('');
              setEditingRule(null);
              setShowRuleForm(true);
            }}
            size="sm"
            className="flex items-center gap-2"
          >
            Create New Rule
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Filters */}
          <AvailabilityFilters
            currentSearch={searchTerm}
            currentRuleType={filterType}
            currentState={filterState}
            currentStatus={filterStatus}
          />

          {/* Rules Grid */}
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
                  onClick={() => {
                    setSelectedProductId('');
                    setEditingRule(null);
                    setShowRuleForm(true);
                  }}
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
      </FormSection>
    </div>
  );
}
