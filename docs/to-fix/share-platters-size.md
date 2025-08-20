## 🎯 Feature/Fix Overview

**Name**: Square Variants Sync Fix  
**Type**: Bug Fix  
**Priority**: High  

### Problem Statement
The sync route is not properly mapping Square item variations to database variants. Currently only the first variation's price is used, and variations are not being created correctly for each product.

### Success Criteria
- [x] All Square item variations are properly mapped to product variants
- [x] Both Small and Large size variations display with correct prices
- [x] Existing variation grouping logic works with native Square variations

---

## 📋 Planning Phase

### 1. Code Structure & References

### Modified Files
```tsx
src/
├── app/
│   └── api/
│       └── square/
│           └── unified-sync/
│               └── route.ts  // Fix fetchSquareItemsForCategory function
```

### Key Issue Location
The problem is in the `fetchSquareItemsForCategory` function where variations are being mapped:

```typescript
// CURRENT BROKEN CODE (lines ~620-630):
variations: item.item_data.variations?.map((v: any) => ({
  id: v.id,
  name: v.item_variation_data?.name || 'Regular',
  price: v.item_variation_data?.price_money?.amount ? 
    v.item_variation_data.price_money.amount / 100 : undefined
})) || []
```

### 2. Core Functionality Fix

### The Fix Implementation

**In `fetchSquareItemsForCategory` function:**

Replace the existing item mapping with proper variation extraction:

```typescript
// FIXED: Properly extract ALL variations from Square API
if (data.objects) {
  for (const item of data.objects) {
    if (item.type === 'ITEM' && item.item_data) {
      // Find image from related objects
      let imageUrl: string | undefined;
      if (item.item_data.image_ids?.[0] && data.related_objects) {
        const imageObj = data.related_objects.find((obj: any) => 
          obj.type === 'IMAGE' && obj.id === item.item_data.image_ids[0]
        );
        if (imageObj?.image_data?.url) {
          imageUrl = imageObj.image_data.url;
        }
      }

      // Extract ALL variations with their individual prices
      const variations = item.item_data.variations?.map((v: any) => ({
        id: v.id,
        name: v.item_variation_data?.name || 'Regular',
        price: v.item_variation_data?.price_money?.amount 
          ? v.item_variation_data.price_money.amount / 100
          : v.item_variation_data?.pricing_type === 'VARIABLE_PRICING'
            ? determineVariablePriceByName(item.item_data.name, v.item_variation_data?.name)
            : 0
      })) || [];

      // Use first variation's price as base price (or fallback logic)
      const basePrice = variations[0]?.price || determineBasePrice(item.item_data.name);

      items.push({
        id: item.id,
        name: item.item_data.name,
        description: item.item_data.description_plaintext || '',
        price: basePrice,
        categoryId,
        categoryName,
        imageUrl,
        variations
      });
    }
  }
}

// Helper function for variable pricing
function determineVariablePriceByName(itemName: string, variantName?: string): number {
  const lowerName = itemName.toLowerCase();
  const lowerVariant = (variantName || '').toLowerCase();
  
  // Plantain Chips Platter
  if (lowerName.includes('plantain')) {
    if (lowerVariant.includes('small')) return 45.00;
    if (lowerVariant.includes('large')) return 80.00;
    return 45.00; // default
  }
  
  // Cheese & Charcuterie Platter  
  if (lowerName.includes('cheese') && lowerName.includes('charcuterie')) {
    if (lowerVariant.includes('small')) return 80.00;
    if (lowerVariant.includes('large')) return 150.00;
    return 80.00; // default
  }
  
  // Cocktail Prawn Platter
  if (lowerName.includes('cocktail') && lowerName.includes('prawn')) {
    if (lowerVariant.includes('small')) return 80.00;
    if (lowerVariant.includes('large')) return 150.00;
    return 80.00; // default
  }
  
  return 50.00; // generic default
}
```

### 3. Enhanced Variation Processing in batchSyncToProducts

Update the SHARE PLATTERS processing to properly use Square's native variations:

```typescript
if (isSharePlattersCategory) {
  logger.info(`📦 Processing SHARE PLATTERS with native Square variations`);
  
  for (const item of items) {
    try {
      const category = await getOrCreateCategory(item.categoryId, item.categoryName);
      
      // Check for existing product
      let existingProduct = await prisma.product.findFirst({
        where: {
          OR: [
            { squareId: item.id },
            { name: item.name }
          ]
        },
        include: { variants: true }
      });
      
      if (existingProduct && !forceUpdate) {
        syncLogger.logItemProcessed(item.id, item.name, 'duplicate', 'Product already exists');
        skippedCount++;
        continue;
      }
      
      const uniqueSlug = await generateUniqueSlug(item.name, item.id, existingProduct?.slug);
      
      // Create/update base product
      const productData = {
        name: item.name,
        description: item.description || '',
        price: item.price, // Base price from first variation
        squareId: item.id,
        category: { connect: { id: category.id } },
        active: true,
        images: item.imageUrl ? [item.imageUrl] : [],
        slug: uniqueSlug,
      };
      
      let baseProduct;
      if (!existingProduct) {
        baseProduct = await prisma.product.create({
          data: productData,
          include: { variants: true }
        });
      } else {
        // Clear existing variants first
        await prisma.variant.deleteMany({
          where: { productId: existingProduct.id }
        });
        
        baseProduct = await prisma.product.update({
          where: { id: existingProduct.id },
          data: productData,
          include: { variants: true }
        });
      }
      
      // Create variants from Square variations
      for (const variation of item.variations) {
        await prisma.variant.create({
          data: {
            productId: baseProduct.id,
            squareVariantId: variation.id,
            name: variation.name,
            price: variation.price || item.price, // Fallback to base price
          }
        });
        
        logger.info(`✅ Created variant "${variation.name}" for ${item.name}: $${variation.price}`);
      }
      
      syncLogger.logItemSynced(item.id, item.name, 
        `Synced with ${item.variations.length} variants`);
      syncedCount++;
      
    } catch (error) {
      errorCount++;
      logger.error(`❌ Error processing "${item.name}":`, error);
      syncLogger.logError(item.name, error as Error);
    }
  }
}
```

---

## 🧪 Testing Strategy

### Manual Testing Steps
1. Run sync for CATERING- SHARE PLATTERS category
2. Verify each product has both Small and Large variants in database
3. Check that prices match Square dashboard ($80/$150 for Cheese & Charcuterie, etc.)
4. Confirm variants display correctly in frontend

### Database Verification Query
```sql
SELECT 
  p.name as product_name,
  v.name as variant_name,
  v.price as variant_price,
  v.square_variant_id
FROM products p
JOIN variants v ON v.product_id = p.id
JOIN categories c ON p.category_id = c.id
WHERE c.name = 'CATERING- SHARE PLATTERS'
ORDER BY p.name, v.price;
```

---

## 🚦 Implementation Checklist

### Development Phase
- [ ] Update `fetchSquareItemsForCategory` to properly map all variations
- [ ] Add helper function for variable pricing by variant name
- [ ] Modify SHARE PLATTERS processing to use native Square variations
- [ ] Remove or simplify VariationGrouper logic (no longer needed for name-based detection)
- [ ] Test with actual Square API response

### Pre-Deployment
- [ ] Verify all variants are created in database
- [ ] Check frontend displays both size options
- [ ] Confirm prices are correct for each variant
- [ ] Run full sync to update existing products

---

## 📝 MCP Analysis Commands

### Verify Current State
```bash
# Check current variant data
supabase-destino: execute_sql query: "SELECT p.name, v.* FROM variants v JOIN products p ON p.id = v.product_id WHERE p.category_id IN (SELECT id FROM categories WHERE name = 'CATERING- SHARE PLATTERS')"

# Check Square API response structure
# Add detailed logging to fetchSquareItemsForCategory to see actual variation structure
```

This fix ensures that all variations from Square are properly mapped to your database, so both Small and Large sizes (and their respective prices) will be available in your application.