'use client';

import React from 'react';
import Image from 'next/image';
import { SpotlightPick } from '@/types/spotlight';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Package, Star, DollarSign } from 'lucide-react';

interface SpotlightPickCardProps {
  pick: SpotlightPick;
  onEdit: () => void;
  onClear: () => void;
  isLoading: boolean;
}

export function SpotlightPickCard({ pick, onEdit, onClear, isLoading }: SpotlightPickCardProps) {
  const isActive = pick.isActive;
  const isEmpty = !isActive;
  
  // Get display data
  const title = pick.isCustom ? pick.customTitle : pick.product?.name;
  const description = pick.isCustom ? pick.customDescription : pick.product?.description;
  const price = pick.isCustom ? pick.customPrice : pick.product?.price;
  const imageUrl = pick.isCustom ? pick.customImageUrl : pick.product?.images?.[0];
  const categoryName = pick.product?.category?.name;

  return (
    <Card className={`h-full transition-all duration-200 ${isEmpty ? 'border-dashed border-2 border-gray-300 bg-gray-50' : 'border-solid shadow-sm hover:shadow-md'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Position {pick.position}
            </Badge>

            {!pick.isCustom && pick.product && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                Product
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
              disabled={isLoading}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
            {isActive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                disabled={isLoading}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isEmpty ? (
          // Empty state
          <div className="text-center py-8">
            <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">Empty Position</p>
            <p className="text-xs text-gray-400 mt-1">Click edit to add content</p>
          </div>
        ) : (
          // Active content
          <>
            {/* Image */}
            <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={title || 'Spotlight pick'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  data-testid="spotlight-image"
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
                <h3 className="font-semibold text-sm line-clamp-2">
                  {title || 'Untitled'}
                </h3>
                {categoryName && (
                  <p className="text-xs text-gray-500">{categoryName}</p>
                )}
              </div>

              {description && (
                <p className="text-xs text-gray-600 line-clamp-3">
                  {description}
                </p>
              )}

              {/* Personalize Text */}
              {pick.personalizeText && (
                <p className="text-xs text-purple-600 font-medium italic">
                  &ldquo;{pick.personalizeText}&rdquo;
                </p>
              )}

              {price && price > 0 && (
                <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <DollarSign className="h-3 w-3" />
                  {typeof price === 'number' ? price.toFixed(2) : price}
                </div>
              )}
            </div>

            {/* Status indicators */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                {isActive && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">Active</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 