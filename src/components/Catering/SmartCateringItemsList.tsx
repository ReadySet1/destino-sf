'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  Square,
  Database,
  Edit,
  Eye,
  Settings,
  RefreshCw,
  Upload,
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { CateringItem, CateringItemCategory } from '@/types/catering';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';

interface SmartCateringItemsListProps {
  items: CateringItem[];
}

interface FilterState {
  search: string;
  category: string;
  source: string;
  status: string;
  dietary: string;
  priceRange: string;
}

const ITEMS_PER_PAGE = 10;

export const SmartCateringItemsList: React.FC<SmartCateringItemsListProps> = ({ items }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitializingStorage, setIsInitializingStorage] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'all',
    source: searchParams.get('source') || 'all',
    status: searchParams.get('status') || 'all',
    dietary: searchParams.get('dietary') || 'all',
    priceRange: searchParams.get('priceRange') || 'all',
  });

  // Group items by source
  const [groupedItems, setGroupedItems] = useState<{
    square: CateringItem[];
    local: CateringItem[];
  }>({ square: [], local: [] });

  useEffect(() => {
    // Group items by source (using type assertion for now)
    const square = items.filter(item => (item as any).squareProductId);
    const local = items.filter(item => !(item as any).squareProductId);

    setGroupedItems({ square, local });
  }, [items]);

  // Filter and paginate items
  const filteredAndPaginatedItems = useMemo(() => {
    let filtered = [...items];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.name.toLowerCase().includes(searchLower) ||
          (item.description && item.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Apply source filter
    if (filters.source !== 'all') {
      if (filters.source === 'square') {
        filtered = filtered.filter(item => (item as any).squareProductId);
      } else if (filters.source === 'local') {
        filtered = filtered.filter(item => !(item as any).squareProductId);
      }
    }

    // Apply status filter
    if (filters.status !== 'all') {
      if (filters.status === 'active') {
        filtered = filtered.filter(item => item.isActive);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(item => !item.isActive);
      }
    }

    // Apply dietary filter
    if (filters.dietary !== 'all') {
      switch (filters.dietary) {
        case 'vegetarian':
          filtered = filtered.filter(item => item.isVegetarian);
          break;
        case 'vegan':
          filtered = filtered.filter(item => item.isVegan);
          break;
        case 'gluten-free':
          filtered = filtered.filter(item => item.isGlutenFree);
          break;
      }
    }

    // Apply price range filter
    if (filters.priceRange !== 'all') {
      switch (filters.priceRange) {
        case 'under-10':
          filtered = filtered.filter(item => Number(item.price) < 10);
          break;
        case '10-25':
          filtered = filtered.filter(item => Number(item.price) >= 10 && Number(item.price) <= 25);
          break;
        case '25-50':
          filtered = filtered.filter(item => Number(item.price) > 25 && Number(item.price) <= 50);
          break;
        case 'over-50':
          filtered = filtered.filter(item => Number(item.price) > 50);
          break;
      }
    }

    // Calculate pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = filtered.slice(startIndex, endIndex);

    return {
      items: paginatedItems,
      totalItems,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  }, [items, filters, currentPage]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      }
    });

    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    }

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/admin/catering${newUrl}`, { scroll: false });
  }, [filters, currentPage, router]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      source: 'all',
      status: 'all',
      dietary: 'all',
      priceRange: 'all',
    });
    setCurrentPage(1);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      router.refresh();
      toast.success('Items refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh items');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleInitStorage = async () => {
    setIsInitializingStorage(true);
    try {
      const response = await fetch('/api/admin/init-storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to initialize storage');
      }

      const result = await response.json();

      if (result.success) {
        toast.success('Storage initialized successfully!');
      } else {
        toast.error(result.error || 'Failed to initialize storage');
      }
    } catch (error) {
      console.error('Storage initialization error:', error);
      toast.error('Failed to initialize storage');
    } finally {
      setIsInitializingStorage(false);
    }
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numPrice);
  };

  const formatCategory = (category: string) => {
    return category
      .replace('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get unique categories from items
  const availableCategories = useMemo(() => {
    const categories = [...new Set(items.map(item => item.category))];
    return categories.sort();
  }, [items]);

  const ItemRow: React.FC<{ item: CateringItem; isSquareItem: boolean }> = ({
    item,
    isSquareItem,
  }) => (
    <TableRow key={item.id}>
      <TableCell>
        <div className="flex items-center space-x-3">
          {item.imageUrl && (
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={48}
              height={48}
              className="w-12 h-12 object-cover rounded-lg border"
            />
          )}
          <div>
            <div className="font-medium">{item.name}</div>
            {item.description && (
              <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          {isSquareItem ? (
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Square className="h-3 w-3" />
              <span>Square</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center space-x-1">
              <Database className="h-3 w-3" />
              <span>Local</span>
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>{formatCategory(item.category)}</TableCell>
      <TableCell>{formatPrice(item.price)}</TableCell>
      <TableCell>
        <div className="flex items-center space-x-1">
          {item.isVegetarian && (
            <Badge variant="outline" className="text-xs">
              V
            </Badge>
          )}
          {item.isVegan && (
            <Badge variant="outline" className="text-xs">
              VG
            </Badge>
          )}
          {item.isGlutenFree && (
            <Badge variant="outline" className="text-xs">
              GF
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={item.isActive ? 'default' : 'secondary'}>
          {item.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/catering/items/${item.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/admin/catering/items/${item.id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                {isSquareItem ? 'Edit Overrides' : 'Edit Item'}
              </Link>
            </DropdownMenuItem>
            {isSquareItem && (
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Manage Overrides
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  const PaginationControls = () => (
    <div className="flex items-center justify-between px-2">
      <div className="flex items-center space-x-2">
        <p className="text-sm text-gray-700">
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
          {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndPaginatedItems.totalItems)} of{' '}
          {filteredAndPaginatedItems.totalItems} results
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(1)}
          disabled={!filteredAndPaginatedItems.hasPrevPage}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => prev - 1)}
          disabled={!filteredAndPaginatedItems.hasPrevPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <span className="text-sm text-gray-700">
          Page {currentPage} of {filteredAndPaginatedItems.totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={!filteredAndPaginatedItems.hasNextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(filteredAndPaginatedItems.totalPages)}
          disabled={!filteredAndPaginatedItems.hasNextPage}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Catering Items</h2>
          <p className="text-gray-600">
            {groupedItems.square.length} Square items, {groupedItems.local.length} local items
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleInitStorage} disabled={isInitializingStorage}>
            <Upload className={`h-4 w-4 mr-2 ${isInitializingStorage ? 'animate-spin' : ''}`} />
            {isInitializingStorage ? 'Initializing...' : 'Init Storage'}
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button asChild>
            <Link href="/admin/catering/items/new">Add Local Item</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {(filters.search || Object.values(filters).some(v => v !== 'all' && v !== '')) && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear All
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search items..."
                  value={filters.search}
                  onChange={e => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={filters.category}
                onValueChange={value => handleFilterChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      {formatCategory(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <Select
                value={filters.source}
                onValueChange={value => handleFilterChange('source', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="square">Square Items</SelectItem>
                  <SelectItem value="local">Local Items</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={value => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dietary */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Dietary</label>
              <Select
                value={filters.dietary}
                onValueChange={value => handleFilterChange('dietary', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Dietary" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dietary</SelectItem>
                  <SelectItem value="vegetarian">Vegetarian</SelectItem>
                  <SelectItem value="vegan">Vegan</SelectItem>
                  <SelectItem value="gluten-free">Gluten-Free</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Price Range</label>
              <Select
                value={filters.priceRange}
                onValueChange={value => handleFilterChange('priceRange', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Prices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="under-10">Under $10</SelectItem>
                  <SelectItem value="10-25">$10 - $25</SelectItem>
                  <SelectItem value="25-50">$25 - $50</SelectItem>
                  <SelectItem value="over-50">Over $50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Items ({filteredAndPaginatedItems.totalItems})
              {filteredAndPaginatedItems.totalItems !== items.length && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  (filtered from {items.length} total)
                </span>
              )}
            </span>
            <div className="flex items-center space-x-2 text-sm font-normal">
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Square className="h-3 w-3" />
                <span>{groupedItems.square.length} Square</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Database className="h-3 w-3" />
                <span>{groupedItems.local.length} Local</span>
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAndPaginatedItems.totalItems === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {items.length === 0
                  ? 'No catering items found.'
                  : 'No items match your current filters.'}
              </p>
              {items.length === 0 ? (
                <Button asChild className="mt-4">
                  <Link href="/admin/catering/items/new">Add Your First Item</Link>
                </Button>
              ) : (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Dietary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndPaginatedItems.items.map(item => {
                    const isSquareItem = !!(item as any).squareProductId;
                    return <ItemRow key={item.id} item={item} isSquareItem={isSquareItem} />;
                  })}
                </TableBody>
              </Table>

              {filteredAndPaginatedItems.totalPages > 1 && (
                <div className="border-t pt-4">
                  <PaginationControls />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Square Items Info */}
      {groupedItems.square.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Square className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Square Items</h3>
                <p className="text-sm text-blue-700 mt-1">
                  These items sync from Square. You can override description, images, and dietary
                  info locally. Name, price, and category will be updated during sync.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Local Items Info */}
      {groupedItems.local.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Database className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-green-900">Local Items</h3>
                <p className="text-sm text-green-700 mt-1">
                  These items are managed locally. You have full control over all properties
                  including name, price, description, images, and dietary information.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
