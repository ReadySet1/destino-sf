// src/app/(dashboard)/admin/products/components/ArchiveStatsDashboard.tsx

import { getArchivedProductsCount } from '@/lib/square/archive-handler';
import { FormSection } from '@/components/ui/form/FormSection';
import { FormGrid } from '@/components/ui/form/FormGrid';
import { FormIcons } from '@/components/ui/form/FormIcons';
import { Badge } from '@/components/ui/badge';

export async function ArchiveStatsDashboard() {
  const stats = await getArchivedProductsCount();

  return (
    <FormSection
      title="Archive Statistics"
      description="Overview of archived products"
      icon={FormIcons.archive}
      variant="amber"
    >
      <div className="space-y-6">
        {/* Total Count */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-sm font-medium text-amber-900">Total Archived</div>
          <div className="text-3xl font-bold text-amber-700 mt-1">{stats.total}</div>
        </div>

        {/* By Reason */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Archive Reasons</h4>
          <FormGrid cols={3}>
            <StatCard
              label="Square Archived"
              count={stats.byReason.square_archived || 0}
              variant="blue"
            />
            <StatCard
              label="Removed from Square"
              count={stats.byReason.removed_from_square || 0}
              variant="yellow"
            />
            <StatCard label="Manual" count={stats.byReason.manual || 0} variant="green" />
          </FormGrid>
        </div>

        {/* By Category */}
        {Object.keys(stats.byCategory).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">By Category</h4>
            <div className="space-y-2">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{category}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
}

function StatCard({
  label,
  count,
  variant,
}: {
  label: string;
  count: number;
  variant: 'blue' | 'yellow' | 'green';
}) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green: 'bg-green-50 border-green-200 text-green-700',
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[variant]}`}>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-2xl font-bold mt-1">{count}</div>
    </div>
  );
}
