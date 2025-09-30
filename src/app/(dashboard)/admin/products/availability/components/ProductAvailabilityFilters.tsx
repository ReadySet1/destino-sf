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
import { AvailabilityState } from '@/types/availability';

type ProductAvailabilityFiltersProps = {
  currentSearch: string;
  currentCategory: string;
  currentState: string;
  currentHasRules: string;
};

export function ProductAvailabilityFilters({
  currentSearch,
  currentCategory,
  currentState,
  currentHasRules,
}: ProductAvailabilityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [category, setCategory] = useState(currentCategory || 'all');
  const [state, setState] = useState(currentState || 'all');
  const [hasRules, setHasRules] = useState(currentHasRules || 'all');

  // Function to create new URL with updated search params
  const applyFilters = useCallback(
    (updates: {
      search?: string;
      category?: string;
      state?: string;
      hasRules?: string;
      page?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Update search params with new values
      Object.entries(updates).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      // Reset page to 1 when filters change, unless explicitly set
      if (!updates.page && params.has('page')) {
        params.set('page', '1');
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Update search term with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== currentSearch) {
        applyFilters({ search });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search, currentSearch, applyFilters]);

  const resetFilters = () => {
    setSearch('');
    setCategory('all');
    setState('all');
    setHasRules('all');
    router.push(pathname);
  };

  const hasActiveFilters = search || category !== 'all' || state !== 'all' || hasRules !== 'all';

  return (
    <div className="bg-white rounded-xl border border-gray-200/70 p-8 space-y-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Filter className="h-5 w-5 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search by product name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="w-full lg:w-52">
          <Select
            value={category}
            onValueChange={value => {
              setCategory(value);
              applyFilters({ category: value });
            }}
          >
            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Category</SelectLabel>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="empanadas">Empanadas</SelectItem>
                <SelectItem value="alfajores">Alfajores</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Availability State Filter */}
        <div className="w-full lg:w-52">
          <Select
            value={state}
            onValueChange={value => {
              setState(value);
              applyFilters({ state: value });
            }}
          >
            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Availability State</SelectLabel>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value={AvailabilityState.AVAILABLE}>Available</SelectItem>
                <SelectItem value={AvailabilityState.PRE_ORDER}>Pre-Order</SelectItem>
                <SelectItem value={AvailabilityState.COMING_SOON}>Coming Soon</SelectItem>
                <SelectItem value={AvailabilityState.VIEW_ONLY}>View Only</SelectItem>
                <SelectItem value={AvailabilityState.SOLD_OUT}>Sold Out</SelectItem>
                <SelectItem value={AvailabilityState.HIDDEN}>Hidden</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Has Rules Filter */}
        <div className="w-full lg:w-48">
          <Select
            value={hasRules}
            onValueChange={value => {
              setHasRules(value);
              applyFilters({ hasRules: value });
            }}
          >
            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <SelectValue placeholder="Rules" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Rules Filter</SelectLabel>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="withRules">With Rules</SelectItem>
                <SelectItem value="withoutRules">Without Rules</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={resetFilters}
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
          {category !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Category: {category}
              <button
                onClick={() => {
                  setCategory('all');
                  applyFilters({ category: 'all' });
                }}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {state !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              State: {state}
              <button
                onClick={() => {
                  setState('all');
                  applyFilters({ state: 'all' });
                }}
                className="ml-1 hover:bg-green-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {hasRules !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Rules: {hasRules === 'withRules' ? 'With Rules' : 'Without Rules'}
              <button
                onClick={() => {
                  setHasRules('all');
                  applyFilters({ hasRules: 'all' });
                }}
                className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
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
