'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Apple, AlertTriangle, Wheat, Leaf } from 'lucide-react';

interface NutritionFactsProps {
  calories?: number | null;
  dietaryPreferences?: string[] | null;
  ingredients?: string | null;
  allergens?: string[] | null;
  nutritionFacts?: any | null;
  className?: string;
}

export function NutritionFacts({
  calories,
  dietaryPreferences,
  ingredients,
  allergens,
  nutritionFacts,
  className
}: NutritionFactsProps) {
  // Don't render if no nutrition information is available
  const hasAnyNutritionInfo = calories || 
    (dietaryPreferences && dietaryPreferences.length > 0) || 
    ingredients || 
    (allergens && allergens.length > 0) || 
    nutritionFacts;

  if (!hasAnyNutritionInfo) {
    return null;
  }

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Apple className="h-5 w-5" />
          Nutrition Facts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calories */}
        {calories && (
          <div className="flex justify-between items-center">
            <span className="font-medium">Calories per serving:</span>
            <span className="text-lg font-bold">{calories}</span>
          </div>
        )}

        {/* Dietary Preferences */}
        {dietaryPreferences && dietaryPreferences.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="h-4 w-4" />
              <span className="font-medium">Dietary Information:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {dietaryPreferences.map((preference, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800">
                  {preference.charAt(0).toUpperCase() + preference.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Allergens */}
        {allergens && allergens.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Contains Allergens:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {allergens.map((allergen, index) => (
                <Badge key={index} variant="danger" className="bg-red-100 text-red-800">
                  {allergen.charAt(0).toUpperCase() + allergen.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients */}
        {ingredients && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wheat className="h-4 w-4" />
              <span className="font-medium">Ingredients:</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {ingredients}
            </p>
          </div>
        )}

        {/* Additional Nutrition Facts from JSON */}
        {nutritionFacts && typeof nutritionFacts === 'object' && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Additional Nutrition Information:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(nutritionFacts).map(([key, value]) => {
                  // Skip fields we've already displayed
                  if (['calorie_count', 'dietary_preferences', 'ingredients'].includes(key)) {
                    return null;
                  }
                  
                  // Format the key for display
                  const displayKey = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                  
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600">{displayKey}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default NutritionFacts;
