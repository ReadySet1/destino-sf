// Responsive Table Component
// This component provides responsive table functionality with mobile card layout

'use client';

import { ReactNode, useState } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { getResponsiveTableClasses, getResponsiveCardClasses } from '@/utils/admin-layout';
import { DEFAULT_TABLE_CONFIG } from '@/types/admin-layout';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  accessor: (item: T) => ReactNode;
  sortable?: boolean;
  mobileVisible?: boolean;
  tabletVisible?: boolean;
  desktopVisible?: boolean;
  className?: string;
}

export interface ResponsiveTableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  config?: Partial<typeof DEFAULT_TABLE_CONFIG>;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  emptyMessage?: string;
  loading?: boolean;
  className?: string;
}

export function ResponsiveTable<T = any>({
  data,
  columns,
  config = DEFAULT_TABLE_CONFIG,
  onSort,
  sortKey,
  sortDirection = 'asc',
  emptyMessage = 'No data available',
  loading = false,
  className = '',
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getVisibleColumns = () => {
    if (isMobile) {
      return columns.filter(col => col.mobileVisible !== false);
    } else if (isTablet) {
      return columns.filter(col => col.tabletVisible !== false);
    } else {
      return columns.filter(col => col.desktopVisible !== false);
    }
  };

  const handleSort = (key: string) => {
    if (onSort) {
      const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(key, newDirection);
    }
  };

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) return null;
    return sortDirection === 'asc' ? (
      <ChevronDown className="h-4 w-4" />
    ) : (
      <ChevronRight className="h-4 w-4" />
    );
  };

  if (loading) {
    return (
      <div className={`${getResponsiveTableClasses()} ${className}`}>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded-t-lg"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 border-b border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`${getResponsiveCardClasses()} p-8 text-center ${className}`}>
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  // Mobile card layout
  if (isMobile && config.mobileCardLayout) {
    return (
      <div className={`space-y-4 ${className}`}>
        {data.map((item, index) => {
          const itemId = (item as any).id || index.toString();
          const isExpanded = expandedRows.has(itemId);
          const visibleColumns = getVisibleColumns();
          const primaryColumns = visibleColumns.slice(0, 2); // Show first 2 columns in collapsed view
          const secondaryColumns = visibleColumns.slice(2);

          return (
            <div key={itemId} className={getResponsiveCardClasses()}>
              <div className="p-4">
                {/* Primary information (always visible) */}
                <div className="flex items-center justify-between">
                  <div className="flex-1 space-y-1">
                    {primaryColumns.map(column => (
                      <div key={column.key} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500 capitalize">
                          {column.header}:
                        </span>
                        <span className="text-sm text-gray-900 ml-2">
                          {column.accessor(item)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {secondaryColumns.length > 0 && (
                    <button
                      onClick={() => toggleRow(itemId)}
                      className="ml-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>
                  )}
                </div>

                {/* Secondary information (expandable) */}
                {isExpanded && secondaryColumns.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    {secondaryColumns.map(column => (
                      <div key={column.key} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-500 capitalize">
                          {column.header}:
                        </span>
                        <span className="text-sm text-gray-900 ml-2">
                          {column.accessor(item)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop table layout
  return (
    <div className={`${getResponsiveTableClasses()} ${className}`}>
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {getVisibleColumns().map(column => (
              <th
                key={column.key}
                className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                } ${column.className || ''}`}
                onClick={() => column.sortable && handleSort(column.key)}
              >
                <div className="flex items-center space-x-1">
                  <span>{column.header}</span>
                  {column.sortable && renderSortIcon(column.key)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item, index) => (
            <tr
              key={(item as any).id || index}
              className="hover:bg-gray-50 transition-colors duration-150"
            >
              {getVisibleColumns().map(column => (
                <td
                  key={column.key}
                  className={`px-4 py-4 text-sm text-gray-900 ${column.className || ''}`}
                >
                  {column.accessor(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Utility function to create table columns with consistent configuration
export function createTableColumn<T = any>(
  key: string,
  header: string,
  accessor: (item: T) => ReactNode,
  options: Partial<TableColumn<T>> = {}
): TableColumn<T> {
  return {
    key,
    header,
    accessor,
    sortable: false,
    mobileVisible: true,
    tabletVisible: true,
    desktopVisible: true,
    ...options,
  };
} 