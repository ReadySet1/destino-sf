'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormSection } from '@/components/ui/form/FormSection';
import { AvailabilityStatCard } from '@/components/admin/availability/AvailabilityStatCard';
import { AvailabilityProductsTable } from '@/components/admin/availability/AvailabilityProductsTable';
import { AvailabilityProductTableRow, AvailabilityBulkAction, AvailabilityActivityItem } from '@/types/availability-ui';
import { AvailabilityState } from '@/types/availability';
import {
  Calendar,
  Clock,
  ShoppingCart,
  Sparkles,
  Activity,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { getAvailabilityStatistics } from '@/actions/availability';
import { getRelativeTimeString } from '@/lib/availability-helpers';

interface AvailabilityStats {
  totalRules: number;
  activeRules: number;
  rulesByType: Record<string, number>;
  rulesByState: Record<string, number>;
}

/**
 * Main overview component for availability management
 * Shows statistics and products with availability rules
 */
export function AvailabilityOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<AvailabilityStats | null>(null);
  const [products, setProducts] = useState<AvailabilityProductTableRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<AvailabilityActivityItem[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    loadStats();
    loadProducts();
    loadRecentActivity();
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

  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const response = await fetch('/api/products?includeAvailabilityEvaluation=true&onlyActive=false&excludeCatering=true');

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

  const handleManageProduct = (productId: string) => {
    // Navigate to rules page with product pre-selected
    router.push(`/admin/products/availability/rules?productId=${productId}`);
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
      >
        <AvailabilityProductsTable
          products={products}
          onManageProduct={handleManageProduct}
          onBulkAction={handleBulkAction}
          isLoading={isLoadingProducts}
        />
      </FormSection>
    </div>
  );
}