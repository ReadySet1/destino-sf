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
import { ClientOnly } from '@/components/ui/client-only';
import { Search, X } from 'lucide-react';

type Category = {
  id: string;
  name: string;
};

type ProductFiltersProps = {
  categories: Category[];
  currentSearch: string;
  currentCategory: string;
  currentStatus: string;
  currentFeatured: string;
};

export default function ProductFilters({
  categories,
  currentSearch,
  currentCategory,
  currentStatus,
  currentFeatured,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [category, setCategory] = useState(currentCategory || 'all');
  const [status, setStatus] = useState(currentStatus || 'active');
  const [featured, setFeatured] = useState(currentFeatured || 'all');

  // Function to create new URL with updated search params
  const applyFilters = useCallback(
    (updates: {
      search?: string;
      category?: string;
      status?: string;
      featured?: string;
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
    setStatus('all');
    setFeatured('all');
    router.push(pathname);
  };

  const hasActiveFilters = search || category !== 'all' || status !== 'all' || featured !== 'all';

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
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="w-full md:w-1/4">
            <ClientOnly
              fallback={
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              }
            >
              <Select
                value={category}
                onValueChange={value => {
                  setCategory(value);
                  applyFilters({ category: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Categories</SelectLabel>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ClientOnly>
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-1/6">
            <ClientOnly
              fallback={
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              }
            >
              <Select
                value={status}
                onValueChange={value => {
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ClientOnly>
          </div>

          {/* Featured Filter */}
          <div className="w-full md:w-1/6">
            <ClientOnly
              fallback={
                <div className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <span className="text-muted-foreground">Loading...</span>
                </div>
              }
            >
              <Select
                value={featured}
                onValueChange={value => {
                  setFeatured(value);
                  applyFilters({ featured: value });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Featured" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Featured</SelectLabel>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="notFeatured">Not Featured</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </ClientOnly>
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
