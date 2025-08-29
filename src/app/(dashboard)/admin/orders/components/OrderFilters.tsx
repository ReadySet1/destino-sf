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

type OrderFiltersProps = {
  currentSearch: string;
  currentType: string;
  currentStatus: string;
  currentPayment: string;
};

export default function OrderFilters({
  currentSearch,
  currentType,
  currentStatus,
  currentPayment,
}: OrderFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [type, setType] = useState(currentType || 'all');
  const [status, setStatus] = useState(currentStatus || 'all');
  const [payment, setPayment] = useState(currentPayment || 'all');

  // Function to create new URL with updated search params
  const applyFilters = useCallback(
    (updates: {
      search?: string;
      type?: string;
      status?: string;
      payment?: string;
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
    setStatus('all');
    setPayment('all');
    router.push(pathname);
  };

  const hasActiveFilters = search || type !== 'all' || status !== 'all' || payment !== 'all';

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
              placeholder="Search by order ID, customer name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 py-3 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Type Filter */}
        <div className="w-full lg:w-52">
          <Select
            value={type}
            onValueChange={value => {
              setType(value);
              applyFilters({ type: value });
            }}
          >
            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
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

        {/* Status Filter */}
        <div className="w-full lg:w-48">
          <Select
            value={status}
            onValueChange={value => {
              setStatus(value);
              applyFilters({ status: value });
            }}
          >
            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Status</SelectLabel>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PROCESSING">Processing</SelectItem>
                <SelectItem value="PREPARING">Preparing</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Filter */}
        <div className="w-full lg:w-48">
          <Select
            value={payment}
            onValueChange={value => {
              setPayment(value);
              applyFilters({ payment: value });
            }}
          >
            <SelectTrigger className="h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Payment Status</SelectLabel>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
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
          {type !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              Type: {type}
              <button
                onClick={() => {
                  setType('all');
                  applyFilters({ type: 'all' });
                }}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {status !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Status: {status}
              <button
                onClick={() => {
                  setStatus('all');
                  applyFilters({ status: 'all' });
                }}
                className="ml-1 hover:bg-green-200 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {payment !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              Payment: {payment}
              <button
                onClick={() => {
                  setPayment('all');
                  applyFilters({ payment: 'all' });
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
