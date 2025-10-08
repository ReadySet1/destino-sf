'use client';

import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  category?: {
    name: string;
  };
}

interface MultiProductSelectProps {
  products: Product[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiProductSelect({
  products,
  selectedIds,
  onChange,
  placeholder = 'Select products',
  disabled = false,
  className
}: MultiProductSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.category?.name.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleToggleProduct = (productId: string) => {
    if (selectedIds.includes(productId)) {
      onChange(selectedIds.filter((id) => id !== productId));
    } else {
      onChange([...selectedIds, productId]);
    }
  };

  const handleSelectAll = () => {
    onChange(filteredProducts.map((p) => p.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedIds.includes(p.id)),
    [products, selectedIds]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between',
            selectedIds.length === 0 && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            {selectedIds.length === 0 ? (
              <span>{placeholder}</span>
            ) : selectedIds.length === 1 ? (
              <span className="truncate">{selectedProducts[0]?.name}</span>
            ) : (
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="rounded-sm">
                  {selectedIds.length}
                </Badge>
                <span>products selected</span>
              </div>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex flex-col">
          {/* Search */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/50">
            <div className="text-xs text-muted-foreground">
              {selectedIds.length} of {products.length} selected
            </div>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleSelectAll}
                disabled={filteredProducts.length === 0}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleClearAll}
                disabled={selectedIds.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Product List */}
          <ScrollArea className="h-[300px]">
            {filteredProducts.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No products found' : 'No products available'}
              </div>
            ) : (
              <div className="p-2">
                {filteredProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className={cn(
                        'flex items-start space-x-3 rounded-md p-2 hover:bg-accent cursor-pointer transition-colors',
                        isSelected && 'bg-accent/50'
                      )}
                      onClick={() => handleToggleProduct(product.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleProduct(product.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-0.5">
                        <p className="text-sm font-medium leading-none">
                          {product.name}
                        </p>
                        {product.category && (
                          <p className="text-xs text-muted-foreground">
                            {product.category.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}
