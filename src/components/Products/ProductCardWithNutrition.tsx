'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { NutritionFacts } from './NutritionFacts';
import { Info, ShoppingCart, Apple } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  images?: string[] | null;
  calories?: number | null;
  dietaryPreferences?: string[] | null;
  ingredients?: string | null;
  allergens?: string[] | null;
  nutritionFacts?: any | null;
}

interface ProductCardWithNutritionProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  className?: string;
}

export function ProductCardWithNutrition({ 
  product, 
  onAddToCart,
  className 
}: ProductCardWithNutritionProps) {
  const [nutritionSheetOpen, setNutritionSheetOpen] = useState(false);
  
  const hasNutritionInfo = product.calories || 
    (product.dietaryPreferences && product.dietaryPreferences.length > 0) || 
    product.ingredients || 
    (product.allergens && product.allergens.length > 0) || 
    product.nutritionFacts;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  return (
    <>
      <Card className={`h-full flex flex-col ${className}`}>
        {/* Product Image */}
        {product.images && product.images.length > 0 && (
          <div className="aspect-square w-full overflow-hidden rounded-t-lg">
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-all hover:scale-105"
            />
          </div>
        )}

        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between">
            <CardTitle className="line-clamp-2 text-lg">{product.name}</CardTitle>
            {hasNutritionInfo && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 flex-shrink-0"
                onClick={() => setNutritionSheetOpen(true)}
              >
                <Apple className="h-4 w-4" />
                <span className="sr-only">View nutrition facts</span>
              </Button>
            )}
          </div>

          {product.description && (
            <CardDescription className="line-clamp-3">
              {product.description}
            </CardDescription>
          )}

          {/* Quick nutrition indicators */}
          {product.dietaryPreferences && product.dietaryPreferences.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.dietaryPreferences.slice(0, 2).map((preference, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-700">
                  {preference.charAt(0).toUpperCase() + preference.slice(1)}
                </Badge>
              ))}
              {product.dietaryPreferences.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{product.dietaryPreferences.length - 2} more
                </Badge>
              )}
            </div>
          )}

          {product.calories && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Apple className="h-3 w-3" />
              <span>{product.calories} calories</span>
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-grow space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
            {hasNutritionInfo && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNutritionSheetOpen(true)}
                className="gap-2"
              >
                <Info className="h-4 w-4" />
                Nutrition
              </Button>
            )}
          </div>

          {onAddToCart && (
            <Button 
              onClick={() => onAddToCart(product)} 
              className="w-full gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Nutrition Facts Sheet */}
      <Sheet open={nutritionSheetOpen} onOpenChange={setNutritionSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{product.name}</SheetTitle>
            <SheetDescription>
              Nutrition information and ingredients
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            <NutritionFacts
              calories={product.calories}
              dietaryPreferences={product.dietaryPreferences}
              ingredients={product.ingredients}
              allergens={product.allergens}
              nutritionFacts={product.nutritionFacts}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default ProductCardWithNutrition;
