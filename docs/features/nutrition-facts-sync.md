# Nutrition Facts Sync from Square

This document explains how to use the new nutrition facts sync feature that automatically imports nutrition information from Square to your Supabase database.

## Overview

The nutrition facts sync feature allows you to:
- Import calorie information from Square
- Sync dietary preferences (e.g., vegan, gluten-free)
- Import ingredient lists
- Automatically detect common allergens
- Store complete nutrition facts as JSON for future extensibility

## Database Schema

The following fields have been added to the `products` table:

```sql
calories          INTEGER         -- Calorie count per serving
dietary_preferences TEXT[]        -- Array of dietary preferences
ingredients       TEXT            -- Ingredient list as text
allergens         TEXT[]          -- Array of allergens
nutrition_facts   JSONB           -- Complete nutrition facts as JSON
```

## Setting Up Nutrition Information in Square

1. **Log into your Square Dashboard**
2. **Navigate to Items & Orders > Items**
3. **Edit a product** that you want to add nutrition information to
4. **Look for Food & Beverage Details section** (this may be under Advanced Settings)
5. **Add nutrition information**:
   - Calorie count per serving
   - Dietary preferences (vegetarian, vegan, gluten-free, etc.)
   - Ingredients list
6. **Save the product**

## Running the Sync

1. **Access the admin sync dashboard** at:
   ```
   http://localhost:3000/admin/square-sync
   ```

2. **Click "Start Sync"** to sync all products including nutrition information

3. **Monitor the sync progress** - the system will log when nutrition information is found and imported

## Displaying Nutrition Information

### Using the NutritionFacts Component

```tsx
import { NutritionFacts } from '@/components/Products/NutritionFacts';

function ProductPage({ product }) {
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      
      <NutritionFacts
        calories={product.calories}
        dietaryPreferences={product.dietaryPreferences}
        ingredients={product.ingredients}
        allergens={product.allergens}
        nutritionFacts={product.nutritionFacts}
      />
    </div>
  );
}
```

### Using the Enhanced Product Card

```tsx
import { ProductCardWithNutrition } from '@/components/Products/ProductCardWithNutrition';

function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCardWithNutrition
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  );
}
```

## Database Queries

### Querying Products with Nutrition Information

```typescript
// Get all products with nutrition information
const productsWithNutrition = await prisma.product.findMany({
  where: {
    OR: [
      { calories: { not: null } },
      { dietaryPreferences: { not: { equals: [] } } },
      { ingredients: { not: null } },
      { allergens: { not: { equals: [] } } }
    ]
  },
  select: {
    id: true,
    name: true,
    calories: true,
    dietaryPreferences: true,
    ingredients: true,
    allergens: true,
    nutritionFacts: true,
  }
});

// Filter products by dietary preference
const vegetarianProducts = await prisma.product.findMany({
  where: {
    dietaryPreferences: {
      has: 'vegetarian'
    }
  }
});

// Filter products by allergen (exclude products containing nuts)
const nutFreeProducts = await prisma.product.findMany({
  where: {
    NOT: {
      allergens: {
        has: 'nuts'
      }
    }
  }
});

// Products under certain calorie count
const lowCalorieProducts = await prisma.product.findMany({
  where: {
    calories: {
      lte: 200
    }
  }
});
```

## API Endpoints

### Get Product with Nutrition Facts

```typescript
// pages/api/products/[id]/nutrition.ts
import { prisma } from '@/lib/db';

export default async function handler(req, res) {
  const { id } = req.query;
  
  const product = await prisma.product.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      calories: true,
      dietaryPreferences: true,
      ingredients: true,
      allergens: true,
      nutritionFacts: true,
    }
  });
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  res.json(product);
}
```

## Testing

Run the nutrition sync test to verify functionality:

```bash
npx tsx scripts/test-nutrition-sync.ts
```

This test will:
- ✅ Verify database schema includes nutrition fields
- ✅ Test nutrition extraction logic
- ✅ Test database operations with nutrition data

## Troubleshooting

### Nutrition information not syncing

1. **Check Square item configuration**:
   - Ensure Food & Beverage Details are filled out in Square
   - Verify the item is active and available

2. **Check sync logs**:
   - Look for debug messages about nutrition info extraction
   - Verify no errors during the sync process

3. **Verify database schema**:
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

### No nutrition information displaying

1. **Check component usage**:
   - Ensure you're passing the nutrition props correctly
   - Verify the component is imported properly

2. **Check database data**:
   ```sql
   SELECT name, calories, dietary_preferences, ingredients, allergens 
   FROM products 
   WHERE calories IS NOT NULL 
   OR array_length(dietary_preferences, 1) > 0 
   OR ingredients IS NOT NULL;
   ```

## Future Enhancements

- **Structured nutrition facts**: Add specific fields for protein, carbs, fat, etc.
- **Nutrition label generator**: Create standardized nutrition labels
- **Allergen warnings**: Enhanced allergen detection and warnings
- **Dietary filtering**: Advanced filtering by dietary restrictions
- **Nutrition search**: Search products by nutrition criteria

## Support

For questions or issues with nutrition sync:
1. Check the sync logs at `/admin/square-sync`
2. Run the test script to verify functionality
3. Review this documentation for proper usage examples
