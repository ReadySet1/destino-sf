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
import { Search, X, Calendar, User, FileText } from 'lucide-react';

type ArchivedOrdersFiltersProps = {
  currentSearch: string;
  currentType: string;
  currentReason: string;
  currentArchivedBy: string;
  currentStartDate: string;
  currentEndDate: string;
};

export default function ArchivedOrdersFilters({
  currentSearch,
  currentType,
  currentReason,
  currentArchivedBy,
  currentStartDate,
  currentEndDate,
}: ArchivedOrdersFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [type, setType] = useState(currentType || 'all');
  const [reason, setReason] = useState(currentReason);
  const [archivedBy, setArchivedBy] = useState(currentArchivedBy);
  const [startDate, setStartDate] = useState(currentStartDate);
  const [endDate, setEndDate] = useState(currentEndDate);

  // Function to create new URL with updated search params
  const applyFilters = useCallback(
    (updates: {
      search?: string;
      type?: string;
      reason?: string;
      archivedBy?: string;
      startDate?: string;
      endDate?: string;
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
    setType('all');
    setReason('');
    setArchivedBy('');
    setStartDate('');
    setEndDate('');
    router.push(pathname);
  };

  const hasActiveFilters = search || type !== 'all' || reason || archivedBy || startDate || endDate;

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <div className="w-full lg:w-1/5">
            <Select
              value={type}
              onValueChange={value => {
                setType(value);
                applyFilters({ type: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Order Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Order Type</SelectLabel>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="regular">Regular Orders</SelectItem>
                  <SelectItem value="catering">Catering Orders</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Archive Reason Filter */}
          <div className="relative w-full lg:w-1/4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Archive reason..."
              value={reason}
              onChange={e => {
                setReason(e.target.value);
              }}
              className="pl-10"
            />
          </div>

          {/* Archived By Filter */}
          <div className="relative w-full lg:w-1/4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Archived by..."
              value={archivedBy}
              onChange={e => {
                setArchivedBy(e.target.value);
              }}
              className="pl-10"
            />
          </div>
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="date"
                placeholder="From date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <Input
                type="date"
                placeholder="To date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                }}
                className="pl-10"
              />
            </div>
          </div>

          {/* Apply Filters Button for Date and Text Filters */}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                applyFilters({ reason, archivedBy, startDate, endDate });
              }}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Reset Filters Button - Only show if filters are active */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-2 border-t border-gray-200">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="flex items-center gap-1"
            >
              <X className="h-4 w-4" /> Reset Filters
            </Button>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-3 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700">Active Filters:</span>
              {search && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: {search}
                </span>
              )}
              {type !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Type: {type}
                </span>
              )}
              {reason && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Reason: {reason}
                </span>
              )}
              {archivedBy && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  By: {archivedBy}
                </span>
              )}
              {(startDate || endDate) && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Date: {startDate || 'Any'} - {endDate || 'Any'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
