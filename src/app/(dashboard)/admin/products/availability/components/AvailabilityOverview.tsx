'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormSection } from '@/components/ui/form/FormSection';
import { AvailabilityStatCard } from '@/components/admin/availability/AvailabilityStatCard';
import { AvailabilityProductsTable } from '@/components/admin/availability/AvailabilityProductsTable';
import { ProductAvailabilityFilters } from './ProductAvailabilityFilters';
import { AvailabilityForm } from '@/components/admin/availability/AvailabilityForm';
import Pagination from '@/components/ui/pagination';
import { AvailabilityProductTableRow, AvailabilityBulkAction, AvailabilityActivityItem } from '@/types/availability-ui';
import { AvailabilityState, AvailabilityRule } from '@/types/availability';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  ShoppingCart,
  Sparkles,
  Activity,
  TrendingUp,
  Plus,
  Edit,
  Trash2
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

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemsPerPage: number;
}

/**
 * Main overview component for availability management
 * Shows statistics and products with availability rules
 */
export function AvailabilityOverview() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<AvailabilityStats | null>(null);
  const [products, setProducts] = useState<AvailabilityProductTableRow[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    itemsPerPage: 20,
  });
  const [recentActivity, setRecentActivity] = useState<AvailabilityActivityItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showRulesList, setShowRulesList] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null);
  const [productRules, setProductRules] = useState<AvailabilityRule[]>([]);

  // Parse search params
  const currentPage = Math.max(1, Number(searchParams.get('page') || 1));
  const searchQuery = (searchParams.get('search') || '').trim();
  const categoryFilter = searchParams.get('category') || 'all';
  const stateFilter = searchParams.get('state') || 'all';
  const hasRulesFilter = searchParams.get('hasRules') || 'all';

  useEffect(() => {
    loadStats();
    loadRecentActivity();
  }, []);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchQuery, categoryFilter, stateFilter, hasRulesFilter]);

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

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);

      // Build query params
      const queryParams = new URLSearchParams();
      queryParams.set('page', currentPage.toString());
      queryParams.set('limit', '20');
      queryParams.set('includeAvailabilityEvaluation', 'true');
      queryParams.set('onlyActive', 'false');
      queryParams.set('excludeCatering', 'true');
      queryParams.set('includePagination', 'true');
      if (searchQuery) queryParams.set('search', searchQuery);
      if (categoryFilter !== 'all') queryParams.set('categorySlug', categoryFilter);
      if (stateFilter !== 'all') queryParams.set('state', stateFilter);
      if (hasRulesFilter !== 'all') queryParams.set('hasRules', hasRulesFilter);

      const response = await fetch(`/api/products?${queryParams.toString()}`);

      if (response.ok) {
        const data = await response.json();
        const productsData = Array.isArray(data) ? data : data.data || [];

        // Transform products to table row format
        const transformedProducts: AvailabilityProductTableRow[] = productsData
          .filter((product: any) => {
            const categoryName = product.category?.name || '';
            return !categoryName.toUpperCase().startsWith('CATERING');
          })
          .map((product: any) => ({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            category: product.category?.name || 'No Category',
            categoryId: product.categoryId,
            currentState: product.evaluatedAvailability?.currentState || AvailabilityState.AVAILABLE,
            rulesCount: product.evaluatedAvailability?.appliedRulesCount || 0,
          }));

        setProducts(transformedProducts);

        // Update pagination if available
        if (data.pagination) {
          setPagination({
            currentPage: data.pagination.page || currentPage,
            totalPages: data.pagination.totalPages || 1,
            totalCount: data.pagination.total || transformedProducts.length,
            itemsPerPage: data.pagination.limit || 20,
          });
        } else {
          // Calculate pagination from array data
          setPagination({
            currentPage: 1,
            totalPages: 1,
            totalCount: transformedProducts.length,
            itemsPerPage: transformedProducts.length,
          });
        }
      } else {
        toast.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Error loading products');
    } finally {
      setIsLoadingProducts(false);
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

  const handleManageProduct = async (productId: string) => {
    // Load and show existing rules for this product
    try {
      const response = await fetch(`/api/availability?productId=${productId}`);
      if (response.ok) {
        const data = await response.json();
        const rules = data.success ? data.data : [];
        setProductRules(rules);
        setEditingProductId(productId);
        setShowRulesList(true);
      } else {
        toast.error('Failed to load product rules');
      }
    } catch (error) {
      console.error('Error loading product rules:', error);
      toast.error('Error loading product rules');
    }
  };

  const handleCreateRule = (productId: string) => {
    // Open the form to create a new rule for this product
    setEditingProductId(productId);
    setEditingRule(null);
    setShowRuleForm(true);
    setShowRulesList(false);
  };

  const handleEditRule = (rule: AvailabilityRule) => {
    setEditingRule(rule);
    setEditingProductId(rule.productId);
    setShowRuleForm(true);
    setShowRulesList(false);
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

      // Reload rules for the current product
      if (editingProductId) {
        handleManageProduct(editingProductId);
      }
      loadProducts();
      loadStats();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const handleFormSuccess = (rule: AvailabilityRule) => {
    toast.success('Rule saved successfully');
    setShowRuleForm(false);
    setEditingRule(null);
    loadProducts();
    loadStats();

    // If we have a product context, go back to rules list
    if (editingProductId) {
      handleManageProduct(editingProductId);
    } else {
      setEditingProductId(null);
      setShowRulesList(false);
    }
  };

  const handleFormCancel = () => {
    setShowRuleForm(false);
    setEditingRule(null);

    // If we have a product context, go back to rules list
    if (editingProductId && showRulesList) {
      setShowRuleForm(false);
    } else {
      setEditingProductId(null);
      setShowRulesList(false);
    }
  };

  const handleBackToOverview = () => {
    setShowRuleForm(false);
    setShowRulesList(false);
    setEditingProductId(null);
    setEditingRule(null);
    setProductRules([]);
  };

  const handleBulkAction = async (productIds: string[], action: AvailabilityBulkAction) => {
    switch (action) {
      case 'create_rule':
        router.push(`/admin/products/availability/bulk?productIds=${productIds.join(',')}`);
        break;
      case 'delete_rules':
        // Handle delete rules
        toast.info('Delete rules functionality coming soon');
        break;
      default:
        toast.info(`Action ${action} not yet implemented`);
    }
  };

  // If showing rules list for a product
  if (showRulesList && !showRuleForm) {
    const product = products.find(p => p.id === editingProductId);
    return (
      <div className="space-y-6 mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Manage Rules: {product?.name || 'Product'}
            </h2>
            <p className="text-gray-600 mt-1">
              {productRules.length} rule{productRules.length !== 1 ? 's' : ''} configured
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => editingProductId && handleCreateRule(editingProductId)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Rule
            </Button>
            <Button variant="outline" onClick={handleBackToOverview}>
              Back to Overview
            </Button>
          </div>
        </div>

        {productRules.length === 0 ? (
          <div className="bg-white shadow-md rounded-lg p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No rules configured</h3>
            <p className="text-gray-600 mb-6">
              Create your first availability rule for this product
            </p>
            <Button onClick={() => editingProductId && handleCreateRule(editingProductId)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Rule
            </Button>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productRules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{rule.ruleType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rule.state}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{rule.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.enabled ? "default" : "secondary"}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRule(rule)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rule.id && handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    );
  }

  // If showing the form, render it exclusively
  if (showRuleForm) {
    return (
      <div className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingRule ? 'Edit Availability Rule' : 'Create Availability Rule'}
            </h2>
            <p className="text-gray-600 mt-1">
              {editingProductId && !editingRule
                ? 'Add a new availability rule for the selected product'
                : 'Configure rule settings and schedule'}
            </p>
          </div>
          <Button variant="outline" onClick={handleFormCancel}>
            {editingProductId && showRulesList ? 'Back to Rules' : 'Back to Overview'}
          </Button>
        </div>
        <AvailabilityForm
          productId={editingProductId || undefined}
          rule={editingRule || undefined}
          showProductSelector={!editingProductId}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
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
            onClick={() => router.push('/admin/products/availability/rules?action=create')}
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
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-3 last:border-0">
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

      {/* Products Overview */}
      <FormSection
        title="Products Overview"
        description="Manage availability rules for individual products"
        icon={<ShoppingCart className="w-6 h-6" />}
        variant="blue"
        action={
          <Button
            onClick={() => {
              setEditingProductId(null);
              setEditingRule(null);
              setShowRuleForm(true);
            }}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Rule
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Filters */}
          <ProductAvailabilityFilters
            currentSearch={searchQuery}
            currentCategory={categoryFilter}
            currentState={stateFilter}
            currentHasRules={hasRulesFilter}
          />

          {/* Products Table */}
          <AvailabilityProductsTable
            products={products}
            onManageProduct={handleManageProduct}
            onCreateRule={handleCreateRule}
            onBulkAction={handleBulkAction}
            isLoading={isLoadingProducts}
          />

          {/* Pagination */}
          {!isLoadingProducts && pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              searchParams={Object.fromEntries(searchParams.entries())}
            />
          )}
        </div>
      </FormSection>
    </div>
  );
}