'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Checkbox } from '@/components/ui/checkbox';
import CategorySelect from '@/app/(dashboard)/admin/products/components/CategorySelect';
import { RuleQuickToggle } from './RuleQuickToggle';
import { BulkRuleActions } from './BulkRuleActions';
import { AvailabilityState } from '@/types/availability';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  images: string[];
  category: {
    id: string;
    name: string;
  };
  featured: boolean;
  active: boolean;
  variants: Array<{
    id: string;
    name: string;
    price: number | null;
    squareVariantId: string | null;
  }>;
  isAvailable?: boolean;
  isPreorder?: boolean;
  visibility?: string;
  itemState?: string;
  evaluatedAvailability?: {
    currentState: AvailabilityState;
    appliedRulesCount: number;
    nextStateChange?: {
      date: Date;
      newState: AvailabilityState;
    };
  };
}

interface ProductsTableProps {
  products: Product[];
  categories: Category[];
}

export function ProductsTable({ products, categories }: ProductsTableProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (productId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleRulesUpdated = () => {
    // Refresh the page data to reflect updated availability states
    router.refresh();
  };

  const selectedProducts = products.filter(p => selectedIds.has(p.id));
  const selectedProductNames = selectedProducts.map(p => p.name);

  return (
    <>
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-6 py-4 text-left">
                  <Checkbox
                    checked={products.length > 0 && selectedIds.size === products.length}
                    onCheckedChange={toggleAll}
                    aria-label="Select all products"
                  />
                </th>
                <th className="w-20 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Image
                </th>
                <th className="w-1/4 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="w-36 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Availability
                </th>
                <th className="w-40 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="w-24 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Price
                </th>
                <th className="hidden sm:table-cell w-24 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Featured
                </th>
                <th className="hidden lg:table-cell w-32 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Variants
                </th>
                <th className="w-24 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.length > 0 ? (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className={cn(
                      "hover:bg-gray-50 transition-colors duration-150",
                      selectedIds.has(product.id) && "bg-indigo-50/50"
                    )}
                  >
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={selectedIds.has(product.id)}
                        onCheckedChange={() => toggleSelection(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.images && product.images.length > 0 && product.images[0] ? (
                        <div className="h-12 w-12 relative">
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 break-words max-w-[150px] capitalize">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* New Availability System with Interactive Toggle */}
                      {product.evaluatedAvailability ? (
                        <RuleQuickToggle
                          productId={product.id}
                          productName={product.name}
                          currentState={product.evaluatedAvailability.currentState}
                          rulesCount={product.evaluatedAvailability.appliedRulesCount}
                          onRulesUpdated={handleRulesUpdated}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1 pointer-events-none">
                          {/* Legacy Availability System */}
                          {product.isAvailable === false && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Unavailable
                            </span>
                          )}
                          {product.isPreorder && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Pre-order
                            </span>
                          )}
                          {product.visibility === 'PRIVATE' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Hidden
                            </span>
                          )}
                          {product.itemState === 'SEASONAL' && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                              Seasonal
                            </span>
                          )}
                          {product.isAvailable !== false &&
                            !product.isPreorder &&
                            product.visibility !== 'PRIVATE' &&
                            product.itemState !== 'SEASONAL' && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Available
                              </span>
                            )}
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                            Legacy
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <CategorySelect
                        categories={categories}
                        productId={product.id}
                        currentCategoryId={product.category.id}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap font-medium">
                      ${Number(product.price).toFixed(2)}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-900 font-medium">
                      {product.featured ? 'Yes' : 'No'}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-4 text-sm text-gray-500">
                      {product.variants && product.variants.length > 0 ? (
                        <div className="space-y-1">
                          {product.variants.slice(0, 2).map((variant) => (
                            <div key={variant.id} className="text-xs">
                              <span className="font-medium">{variant.name}</span>
                              {variant.price && (
                                <span className="text-gray-400 ml-1">
                                  (${Number(variant.price).toFixed(2)})
                                </span>
                              )}
                            </div>
                          ))}
                          {product.variants.length > 2 && (
                            <div className="text-xs text-gray-400">
                              +{product.variants.length - 2} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No variants</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors duration-150 font-medium"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg
                        className="h-12 w-12 text-gray-400 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <p className="text-base font-medium text-gray-900 mb-1">
                        No products found
                      </p>
                      <p className="text-sm text-gray-500">
                        Try adjusting your filters or sync products from Square.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkRuleActions
        selectedProductIds={Array.from(selectedIds)}
        productNames={selectedProductNames}
        onClearSelection={clearSelection}
        onSuccess={handleRulesUpdated}
      />
    </>
  );
}
