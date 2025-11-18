'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { SpotlightPick } from '@/types/spotlight';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, Package, DollarSign, Loader2, Search, Filter, Check } from 'lucide-react';
import { sanitizeProductDescription } from '@/lib/utils/product-description';

interface SpotlightPickCardProps {
  pick: SpotlightPick;
  onProductSelect: (productId: string) => void;
  onClear: () => void;
  isLoading: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  images: string[];
  price: number;
  category?: {
    id: string;
    name: string;
    slug?: string | null;
  };
  categoryId: string;
  active: boolean;
}

interface Category {
  id: string;
  name: string;
  slug?: string | null;
}

export function SpotlightPickCard({
  pick,
  onProductSelect,
  onClear,
  isLoading,
}: SpotlightPickCardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const isActive = pick.isActive && pick.productId && pick.product?.id;
  const isEmpty = !isActive;

  // Fetch products and categories
  useEffect(() => {
    const fetchData = async () => {
      setLoadingProducts(true);
      try {
        const [productsResponse, categoriesResponse] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
        ]);

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          const productsList = Array.isArray(productsData) ? productsData : productsData.data || [];
          setProducts(productsList);
          setFilteredProducts(productsList);
        }

        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          const categoriesList = Array.isArray(categoriesData)
            ? categoriesData
            : categoriesData.data || [];
          setCategories(categoriesList);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchData();
  }, []);

  // Filter products based on search and category
  useEffect(() => {
    let filtered = products;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.category?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }

    // Show active products first
    filtered = filtered.sort((a, b) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      return a.name.localeCompare(b.name);
    });

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory]);

  const handleProductSelectFromModal = (product: Product) => {
    setSelectedProduct(product);
    onProductSelect(product.id);
    setIsModalOpen(false);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
  };

  return (
    <Card
      className={`h-full transition-all duration-200 ${isEmpty ? 'border-dashed border-2 border-gray-300 bg-gray-50' : 'border-solid shadow-sm hover:shadow-md'}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs font-medium px-2 py-1">
            Position {pick.position}
          </Badge>
          {isActive && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              disabled={isLoading}
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" data-testid="trash-icon" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Product Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Select Product:</label>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full h-9 justify-start text-xs"
                disabled={isLoading || loadingProducts}
                data-testid="product-select"
              >
                {loadingProducts ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" data-testid="loader-icon" />
                    Loading products...
                  </>
                ) : pick.product?.name ? (
                  <>
                    <Package className="h-3 w-3 mr-2" data-testid="package-icon" />
                    <span className="truncate">{pick.product.name}</span>
                  </>
                ) : (
                  <>
                    <Filter className="h-3 w-3 mr-2" />
                    Choose a product
                  </>
                )}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
              <DialogHeader>
                <DialogTitle>Select Product for Position {pick.position}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Categories" />
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

                  <Button variant="outline" onClick={resetFilters} className="whitespace-nowrap">
                    Clear Filters
                  </Button>
                </div>

                {/* Results count */}
                <div className="text-sm text-gray-600">
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} found
                </div>

                {/* Products Grid */}
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                    {filteredProducts.map(product => (
                      <Card
                        key={product.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          pick.productId === product.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                        }`}
                        onClick={() => handleProductSelectFromModal(product)}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            {/* Product Image */}
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {product.images?.[0] ? (
                                <Image
                                  src={product.images[0]}
                                  alt={product.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Package className="h-6 w-6" />
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-sm line-clamp-1">
                                    {product.name}
                                  </h3>
                                  <div
                                    className="text-xs text-gray-500 line-clamp-2 mt-1"
                                    dangerouslySetInnerHTML={{
                                      __html: product.description
                                        ? sanitizeProductDescription(product.description)
                                        : 'No description',
                                    }}
                                  />
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-sm font-medium text-green-600">
                                      ${product.price.toFixed(2)}
                                    </span>
                                    {product.category && (
                                      <Badge variant="secondary" className="text-xs">
                                        {product.category.name}
                                      </Badge>
                                    )}
                                    {!product.active && (
                                      <Badge variant="danger" className="text-xs">
                                        Inactive
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                {pick.productId === product.id && (
                                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center ml-2">
                                    <Check className="h-3 w-3 text-white" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {filteredProducts.length === 0 && !loadingProducts && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                      <p>No products found</p>
                      <p className="text-xs mt-1">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {(isLoading || loadingProducts) && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              {loadingProducts ? 'Loading products...' : 'Updating...'}
            </div>
          )}
        </div>

        {isEmpty ? (
          // Empty state
          <div className="text-center py-4">
            <div className="mx-auto w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-2">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 font-medium">No Product Selected</p>
            <p className="text-xs text-gray-400 mt-1">Tap the button above to choose a product</p>
          </div>
        ) : (
          // Active content
          <div className="space-y-3">
            {/* Image */}
            <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
              {pick.product?.images?.[0] ? (
                <Image
                  src={pick.product.images[0]}
                  alt={pick.product.name || 'Product image'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Package className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div>
                <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1">
                  {pick.product?.name || 'Product name'}
                </h3>
                {pick.product?.category?.name && (
                  <Badge variant="secondary" className="text-xs">
                    {pick.product.category.name}
                  </Badge>
                )}
              </div>

              {pick.product?.description && (
                <div
                  className="text-xs text-gray-600 line-clamp-2 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeProductDescription(pick.product.description),
                  }}
                />
              )}

              {pick.product?.price && pick.product.price > 0 && (
                <div className="flex items-center gap-1 text-base font-semibold text-green-600">
                  <DollarSign className="h-4 w-4" data-testid="dollar-icon" />
                  {pick.product.price.toFixed(2)}
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-green-600 font-medium">Active</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
