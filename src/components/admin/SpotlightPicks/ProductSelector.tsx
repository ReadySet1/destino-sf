'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Package, Check, Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  images: string[];
  price: number;
  slug?: string | null;
  category?: {
    id: string;
    name: string;
    slug?: string | null;
  };
  categoryId: string;
  featured: boolean;
  active: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ProductSelectorProps {
  selectedProduct: any;
  onProductSelect: (product: any) => void;
  categories: Array<{
    id: string;
    name: string;
    slug?: string | null;
  }>;
}

export function ProductSelector({
  selectedProduct,
  onProductSelect,
  categories,
}: ProductSelectorProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');

  // Debounced search function
  const fetchProducts = useCallback(
    async (
      params: {
        page?: number;
        search?: string;
        category?: string;
        status?: string;
      } = {}
    ) => {
      setIsLoading(true);
      try {
        const searchParams = new URLSearchParams({
          includePagination: 'true',
          page: (params.page || 1).toString(),
          limit: '8', // Smaller limit for modal
        });

        // Add search if provided
        if (params.search) {
          searchParams.set('search', params.search);
        }

        // Add category filter if not 'all'
        if (params.category && params.category !== 'all') {
          searchParams.set('categoryId', params.category);
        }

        // Add status filter
        if (params.status === 'active') {
          searchParams.set('onlyActive', 'true');
        } else if (params.status === 'inactive') {
          searchParams.set('onlyActive', 'false');
        }

        const response = await fetch(`/api/products?${searchParams.toString()}`);

        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }

        const data = await response.json();

        if (data.data && data.pagination) {
          // API returned paginated data
          setProducts(data.data);
          setPagination(data.pagination);
        } else {
          // API returned simple array (fallback)
          setProducts(data);
          setPagination({
            page: 1,
            limit: data.length,
            total: data.length,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          });
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
        setPagination({
          page: 1,
          limit: 8,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts({
        page: 1, // Reset to first page on search
        search: searchTerm || undefined,
        category: selectedCategory,
        status: statusFilter,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, statusFilter, fetchProducts]);

  // Initial load is handled by the search effect above

  const handlePageChange = (page: number) => {
    fetchProducts({
      page,
      search: searchTerm || undefined,
      category: selectedCategory,
      status: statusFilter,
    });
  };

  const handleRefresh = () => {
    fetchProducts({
      page: pagination.page,
      search: searchTerm || undefined,
      category: selectedCategory,
      status: statusFilter,
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <Label>Search and Filter Products</Label>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search by name, category, or description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Row */}
        <div className="flex gap-2">
          {/* Category Filter */}
          <div className="flex-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="all">All Status</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button */}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading products...
          </div>
        ) : (
          <div>
            Showing {products.length} of {pagination.total} products
            {searchTerm && ` for "${searchTerm}"`}
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="max-h-80 overflow-y-auto space-y-2 border rounded-md">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p>No products found</p>
            {searchTerm && <p className="text-xs mt-1">Try adjusting your search or filters</p>}
          </div>
        ) : (
          products.map(product => (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all duration-200 m-2 ${
                selectedProduct?.id === product.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => onProductSelect(product)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Product Image */}
                  <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {product.category && (
                            <Badge variant="outline" className="text-xs">
                              {product.category.name}
                            </Badge>
                          )}
                          {!product.active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                          {product.featured && (
                            <Badge variant="default" className="text-xs">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            $
                            {typeof product.price === 'number'
                              ? product.price.toFixed(2)
                              : product.price}
                          </p>
                        </div>

                        {selectedProduct?.id === product.id && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Pagination */}
        {!isLoading && products.length > 0 && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Product Summary */}
      {selectedProduct && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Selected: {selectedProduct.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}
