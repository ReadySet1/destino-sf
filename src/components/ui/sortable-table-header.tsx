import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableTableHeaderProps {
  column: string;
  children: React.ReactNode;
  defaultSort?: SortDirection;
  className?: string;
}

export function SortableTableHeader({
  column,
  children,
  defaultSort = null,
  className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
}: SortableTableHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get('sort');
  const currentDirection = searchParams.get('direction') as SortDirection;

  const isCurrentColumn = currentSort === column;
  const currentSortDirection = isCurrentColumn ? currentDirection : null;

  const handleSort = () => {
    const params = new URLSearchParams(searchParams.toString());

    let newDirection: SortDirection;

    if (!isCurrentColumn) {
      // If clicking a different column, start with ascending
      newDirection = 'asc';
    } else {
      // If clicking the same column, cycle through: asc -> desc -> null -> asc
      if (currentSortDirection === 'asc') {
        newDirection = 'desc';
      } else if (currentSortDirection === 'desc') {
        newDirection = null;
      } else {
        newDirection = 'asc';
      }
    }

    if (newDirection) {
      params.set('sort', column);
      params.set('direction', newDirection);
    } else {
      params.delete('sort');
      params.delete('direction');
    }

    // Reset to page 1 when sorting changes
    params.set('page', '1');

    router.push(`${pathname}?${params.toString()}`);
  };

  const getSortIcon = () => {
    if (!isCurrentColumn) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }

    if (currentSortDirection === 'asc') {
      return <ChevronUp className="h-4 w-4 text-gray-600" />;
    } else if (currentSortDirection === 'desc') {
      return <ChevronDown className="h-4 w-4 text-gray-600" />;
    } else {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <th className={className}>
      <button
        onClick={handleSort}
        className="group flex items-center gap-1 hover:text-gray-700 focus:outline-none focus:text-gray-700 transition-colors duration-150"
      >
        <span>{children}</span>
        {getSortIcon()}
      </button>
    </th>
  );
}

export default SortableTableHeader;
