'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
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
import { Search, X } from 'lucide-react';

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

  // Update search term with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== currentSearch) {
        applyFilters({ search });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Function to create new URL with updated search params
  const applyFilters = (
    updates: { 
      search?: string; 
      type?: string; 
      status?: string; 
      payment?: string; 
      page?: string 
    }
  ) => {
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
  };

  const resetFilters = () => {
    setSearch('');
    setType('all');
    setStatus('all');
    setPayment('all');
    router.push(pathname);
  };

  const hasActiveFilters = search || type !== 'all' || status !== 'all' || payment !== 'all';

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <div className="w-full md:w-1/4">
            <Select
              value={type}
              onValueChange={(value) => {
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

          {/* Status Filter */}
          <div className="w-full md:w-1/4">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                applyFilters({ status: value });
              }}
            >
              <SelectTrigger>
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
          <div className="w-full md:w-1/4">
            <Select
              value={payment}
              onValueChange={(value) => {
                setPayment(value);
                applyFilters({ payment: value });
              }}
            >
              <SelectTrigger>
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
        </div>

        {/* Reset Filters Button - Only show if filters are active */}
        {hasActiveFilters && (
          <div className="flex justify-end">
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
      </div>
    </div>
  );
} 