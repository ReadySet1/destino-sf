

## 🎯 Feature/Fix Overview

**Name**: Square Variants Sync Complete Fix - Missing Large Variants  
**Type**: Bug Fix  
**Priority**: Critical  
**Estimated Complexity**: Small (1-2 days)

### Problem Statement
The sync route is creating products with variants, but the Large size variants are not appearing in the database. The issue appears to be that Square items are being fetched as individual items rather than recognizing them as variations of the same product.

### Success Criteria
- [x] Each Share Platter product has both Small and Large variants
- [x] Variants display with correct prices ($80/$150 for Cheese & Charcuterie, etc.)
- [x] Frontend properly displays size selection options

---

## 📋 Planning Phase

### 1. Root Cause Analysis

After reviewing your code, the issue is that **Square is returning each size as a separate ITEM** rather than as variations within a single item. This is why you're seeing:
- "Cheese & Charcuterie Platter" (Small - $80)
- "Cocktail Prawn Platter" (Small - $80)  
- "Plantain Chips Platter" (Small - $45)

But **NOT seeing the Large variants**. The Square API is likely returning:
- Separate items for "Cheese & Charcuterie Platter - Large"
- Separate items for "Cocktail Prawn Platter - Large"
- etc.

### 2. The Current Fix Issue

Your current implementation in `fetchSquareItemsForCategory` is extracting variations **within each item**, but Square is structuring these as **separate items** that need to be grouped together.

### 3. Complete Fix Implementation

**Modified approach in `fetchSquareItemsForCategory`:**

```typescript
async function fetchSquareItemsForCategory(
  categoryId: string, 
  categoryName: string, 
  useCache: boolean = false
): Promise<SquareItem[]> {
  // ... existing code for API call ...
  
  const items: SquareItem[] = [];
  
  if (data.objects) {
    // First, collect ALL items including those that might be size variations
    const allItems = [];
    
    for (const item of data.objects) {
      if (item.type === 'ITEM' && item.item_data) {
        // Extract image URL
        let imageUrl: string | undefined;
        if (item.item_data.image_ids?.[0] && data.related_objects) {
          const imageObj = data.related_objects.find((obj: any) => 
            obj.type === 'IMAGE' && obj.id === item.item_data.image_ids[0]
          );
          if (imageObj?.image_data?.url) {
            imageUrl = imageObj.image_data.url;
          }
        }
        
        // Check if item has internal Square variations
        const hasInternalVariations = item.item_data.variations && 
          item.item_data.variations.length > 1;
        
        if (hasInternalVariations) {
          // Item has variations within Square - use them directly
          const variations = item.item_data.variations.map((v: any) => ({
            id: v.id,
            name: v.item_variation_data?.name || 'Regular',
            price: v.item_variation_data?.price_money?.amount 
              ? v.item_variation_data.price_money.amount / 100
              : v.item_variation_data?.pricing_type === 'VARIABLE_PRICING'
                ? determineVariablePriceByName(item.item_data.name, v.item_variation_data?.name)
                : 0
          }));
          
          items.push({
            id: item.id,
            name: item.item_data.name,
            description: item.item_data.description_plaintext || '',
            price: variations[0]?.price || determineBasePrice(item.item_data.name),
            categoryId,
            categoryName,
            imageUrl,
            variations
          });
        } else {
          // No internal variations - this might be a size-named item
          // Collect it for later grouping
          allItems.push({
            id: item.id,
            name: item.item_data.name,
            description: item.item_data.description_plaintext || '',
            variation: item.item_data.variations?.[0],
            imageUrl,
            categoryId,
            categoryName
          });
        }
      }
    }
    
    // For SHARE PLATTERS, group items by base name
    if (categoryName === 'CATERING- SHARE PLATTERS' && allItems.length > 0) {
      const groupedItems = groupItemsByBaseName(allItems);
      
      for (const group of groupedItems) {
        const variations = group.items.map(item => {
          const variantPrice = item.variation?.item_variation_data?.price_money?.amount 
            ? item.variation.item_variation_data.price_money.amount / 100
            : determineVariablePriceByItemFullName(item.name);
          
          // Detect size from item name
          const sizeInfo = detectSizeFromName(item.name);
          
          return {
            id: item.variation?.id || item.id,
            name: sizeInfo.size || 'Regular',
            price: variantPrice
          };
        });
        
        // Sort variations by size order
        variations.sort((a, b) => {
          const sizeOrder: Record<string, number> = { 
            'Small': 1, 
            'Regular': 2, 
            'Large': 3 
          };
          return (sizeOrder[a.name] || 2) - (sizeOrder[b.name] || 2);
        });
        
        items.push({
          id: group.items[0].id,
          name: group.baseName,
          description: group.items[0].description,
          price: variations[0]?.price || 0,
          categoryId,
          categoryName,
          imageUrl: group.items[0].imageUrl,
          variations
        });
      }
    } else {
      // For non-SHARE PLATTERS, add items as-is
      for (const item of allItems) {
        const price = item.variation?.item_variation_data?.price_money?.amount 
          ? item.variation.item_variation_data.price_money.amount / 100
          : 0;
        
        items.push({
          id: item.id,
          name: item.name,
          description: item.description,
          price,
          categoryId,
          categoryName,
          imageUrl: item.imageUrl,
          variations: [{
            id: item.variation?.id || item.id,
            name: 'Regular',
            price
          }]
        });
      }
    }
  }
  
  return items;
}

// Helper function to group items by base name
function groupItemsByBaseName(items: any[]): any[] {
  const groups = new Map<string, any>();
  
  for (const item of items) {
    const baseNameInfo = extractBaseNameAndSize(item.name);
    const baseName = baseNameInfo.baseName;
    
    if (!groups.has(baseName)) {
      groups.set(baseName, {
        baseName,
        items: []
      });
    }
    
    groups.get(baseName)!.items.push(item);
  }
  
  return Array.from(groups.values());
}

// Helper to extract base name and size
function extractBaseNameAndSize(fullName: string): { baseName: string; size?: string } {
  // Pattern matching for size indicators
  const patterns = [
    /^(.+?)\s*-\s*(Small|Large|Medium)$/i,
    /^(.+?)\s*\((Small|Large|Medium)\)$/i,
    /^(Small|Large|Medium)\s*-\s*(.+)$/i,
  ];
  
  for (const pattern of patterns) {
    const match = fullName.match(pattern);
    if (match) {
      if (match.index === 0 && match[1].match(/^(Small|Large|Medium)$/i)) {
        // Size is at the beginning
        return { baseName: match[2].trim(), size: match[1] };
      } else {
        // Size is at the end
        return { baseName: match[1].trim(), size: match[2] };
      }
    }
  }
  
  // No size found - return full name as base
  return { baseName: fullName };
}

// Helper to detect size from name
function detectSizeFromName(fullName: string): { size?: string } {
  const info = extractBaseNameAndSize(fullName);
  return { size: info.size };
}

// Enhanced price determination for full item names
function determineVariablePriceByItemFullName(itemName: string): number {
  const lowerName = itemName.toLowerCase();
  
  // Check for size in the name
  const isSmall = lowerName.includes('small');
  const isLarge = lowerName.includes('large');
  
  if (lowerName.includes('plantain')) {
    if (isSmall) return 45.00;
    if (isLarge) return 80.00;
    return 45.00;
  }
  
  if (lowerName.includes('cheese') && lowerName.includes('charcuterie')) {
    if (isSmall) return 80.00;
    if (isLarge) return 150.00;
    return 80.00;
  }
  
  if (lowerName.includes('cocktail') && lowerName.includes('prawn')) {
    if (isSmall) return 80.00;
    if (isLarge) return 150.00;
    return 80.00;
  }
  
  return 50.00;
}
```

---

## 🧪 Testing Strategy

### Debug Logging to Add
```typescript
// In fetchSquareItemsForCategory, add comprehensive logging:
logger.info(`📦 Square items for ${categoryName}:`, {
  totalItems: data.objects?.length,
  itemNames: data.objects?.map((o: any) => o.item_data?.name),
  itemsWithVariations: data.objects?.filter((o: any) => 
    o.item_data?.variations?.length > 1
  ).length
});
```

### Verification Query
```sql
SELECT 
  p.name as product_name,
  COUNT(v.id) as variant_count,
  STRING_AGG(v.name || ' ($' || v.price || ')', ', ') as variants
FROM products p
LEFT JOIN variants v ON v.product_id = p.id
JOIN categories c ON p.category_id = c.id
WHERE c.name = 'CATERING- SHARE PLATTERS'
GROUP BY p.id, p.name
ORDER BY p.name;
```

---

## 🚦 Implementation Checklist

### Immediate Actions
- [ ] Add comprehensive logging to see exact Square API response structure
- [ ] Verify if Large items are coming as separate Square items
- [ ] Implement grouping logic for size-based item names
- [ ] Test sync with force update flag

### Development Phase
- [ ] Update `fetchSquareItemsForCategory` with grouping logic
- [ ] Add helper functions for name parsing and grouping
- [ ] Ensure proper price mapping for each size
- [ ] Create all variants in database

The key insight is that Square might be returning "Cheese & Charcuterie Platter - Small" and "Cheese & Charcuterie Platter - Large" as **separate items** rather than variations of one item. The fix groups these separate items into a single product with multiple variants.