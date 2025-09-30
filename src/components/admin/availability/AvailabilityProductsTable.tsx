'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvailabilityStatusBadge } from './AvailabilityStatusBadge';
import { AvailabilityProductTableRow, AvailabilityBulkAction } from '@/types/availability-ui';
import { MoreHorizontal, Edit, Eye, Trash2, Plus, FileText } from 'lucide-react';
import { formatCurrency } from '@/utils/formatting';
import { cn } from '@/lib/utils';

interface AvailabilityProductsTableProps {
  products: AvailabilityProductTableRow[];
  onManageProduct: (productId: string) => void;
  onCreateRule: (productId: string) => void;
  onViewRules?: (productId: string) => void;
  onBulkAction?: (productIds: string[], action: AvailabilityBulkAction) => void;
  isLoading?: boolean;
}

/**
 * Products table with bulk selection for availability management
 * Follows Order Management table design patterns
 */
export function AvailabilityProductsTable({
  products,
  onManageProduct,
  onCreateRule,
  onViewRules,
  onBulkAction,
  isLoading = false
}: AvailabilityProductsTableProps) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkAction = (action: AvailabilityBulkAction) => {
    if (onBulkAction && selectedProducts.length > 0) {
      onBulkAction(selectedProducts, action);
      setSelectedProducts([]);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {/* Bulk Actions Toolbar */}
      {selectedProducts.length > 0 && (
        <div className="bg-indigo-50 px-6 py-3 border-b border-indigo-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-indigo-900">
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAction('create_rule')}
                className="bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Rule
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedProducts.length === products.length && products.length > 0}
                  onChange={e => handleSelectAll(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
              </TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Current Status</TableHead>
              <TableHead>Active Rules</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="text-gray-500">
                    <p className="text-lg font-medium mb-2">No products found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              products.map(product => (
                <TableRow
                  key={product.id}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    selectedProducts.includes(product.id) && 'bg-indigo-50/50'
                  )}
                >
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={e => handleSelectProduct(product.id, e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </TableCell>
                  <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                  <TableCell className="text-gray-600">{product.category}</TableCell>
                  <TableCell className="text-gray-900">{formatCurrency(product.price)}</TableCell>
                  <TableCell>
                    <AvailabilityStatusBadge state={product.currentState} size="sm" />
                  </TableCell>
                  <TableCell>
                    {product.rulesCount > 0 ? (
                      <Badge variant="outline" className="font-normal">
                        {product.rulesCount} rule{product.rulesCount !== 1 ? 's' : ''}
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-400">No rules</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-gray-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {product.rulesCount > 0 ? (
                          <>
                            <DropdownMenuItem
                              onClick={() => onManageProduct(product.id)}
                              className="cursor-pointer"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Manage Rules ({product.rulesCount})
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onCreateRule(product.id)}
                              className="cursor-pointer"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Create New Rule
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => onCreateRule(product.id)}
                            className="cursor-pointer"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Rule
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}