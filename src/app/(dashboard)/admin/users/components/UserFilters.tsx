'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';

type UserFiltersProps = {
  currentSearch: string;
  currentRole: string;
  currentSort: string;
  currentDirection: string;
};

export default function UserFilters({
  currentSearch,
  currentRole,
  currentSort,
  currentDirection,
}: UserFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [role, setRole] = useState(currentRole || 'all');
  const [sort, setSort] = useState(currentSort || 'email');
  const [direction, setDirection] = useState(currentDirection || 'asc');

  // Function to create new URL with updated search params
  const applyFilters = useCallback(
    (updates: {
      search?: string;
      role?: string;
      sort?: string;
      direction?: string;
      page?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Apply updates
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset to page 1 when filtering
      if (updates.search !== undefined || updates.role !== undefined) {
        params.delete('page');
      }

      const queryString = params.toString();
      const url = queryString ? `${pathname}?${queryString}` : pathname;

      router.push(url);
    },
    [router, pathname, searchParams]
  );

  // Handle search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (search !== currentSearch) {
        applyFilters({ search });
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search, currentSearch, applyFilters]);

  // Handle immediate filter updates
  const handleRoleChange = (value: string) => {
    setRole(value);
    applyFilters({ role: value });
  };

  const handleSortChange = (value: string) => {
    const [newSort, newDirection] = value.split('-');
    setSort(newSort);
    setDirection(newDirection);
    applyFilters({ sort: newSort, direction: newDirection });
  };

  const clearFilters = () => {
    setSearch('');
    setRole('all');
    setSort('email');
    setDirection('asc');
    router.push(pathname);
  };

  const hasActiveFilters = search || role !== 'all' || sort !== 'email' || direction !== 'asc';

  return (
    <div className="bg-white rounded-xl border border-gray-200/70 p-8 space-y-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Filter className="h-5 w-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by email, name, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div className="w-full lg:w-52">
          <Select value={role} onValueChange={handleRoleChange}>
            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>User Roles</SelectLabel>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="CUSTOMER">Customer</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Options */}
        <div className="w-full lg:w-60">
          <Select value={`${sort}-${direction}`} onValueChange={handleSortChange}>
            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Sort Options</SelectLabel>
                <SelectItem value="email-asc">Email (A-Z)</SelectItem>
                <SelectItem value="email-desc">Email (Z-A)</SelectItem>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="role-asc">Role (A-Z)</SelectItem>
                <SelectItem value="role-desc">Role (Z-A)</SelectItem>
                <SelectItem value="created_at-desc">Newest First</SelectItem>
                <SelectItem value="created_at-asc">Oldest First</SelectItem>
                <SelectItem value="orderCount-desc">Most Orders</SelectItem>
                <SelectItem value="orderCount-asc">Least Orders</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={clearFilters}
            className="h-11 flex items-center gap-2 whitespace-nowrap hover:bg-gray-50"
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
          <span className="text-sm font-medium text-gray-500">Active filters:</span>
          {search && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
              Search: {search}
              <button
                onClick={() => setSearch('')}
                className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {role !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Role: {role}
              <button
                onClick={() => handleRoleChange('all')}
                className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {(sort !== 'email' || direction !== 'asc') && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Sort: {sort} ({direction === 'asc' ? 'A-Z' : 'Z-A'})
              <button
                onClick={() => handleSortChange('email-asc')}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
