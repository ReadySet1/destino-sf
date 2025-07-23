# Product Recommendations

## Overview

The "You Might Also Like" section on product detail pages shows related products from the same category. This feature helps customers discover more products and increases sales.

## Implementation

### API Endpoint

The recommendations are fetched from `/api/products` with the following parameters:
- `categoryId`: The category of the current product
- `exclude`: The current product ID to avoid showing it in recommendations
- `limit`: Number of products to fetch (default: 3)
- `excludeCatering`: Whether to exclude catering products (default: true)

### Component Location

The recommendations are implemented in `src/components/Products/ProductDetails.tsx` in the `RelatedProducts` component.

## Important Rules

### 1. Never Mix Catering and Regular Products

**Problem**: Catering products have $0.00 prices and different business logic than regular products. Mixing them in recommendations creates confusion and poor user experience.

**Solution**: 
- Always exclude catering products from regular product recommendations
- Use the `excludeCatering=true` parameter in API calls
- Filter out products with $0.00 prices as an additional safety measure

### 2. Category Separation

**Problem**: Catering products are assigned to categories that start with "CATERING-", but they might appear in regular product listings.

**Solution**:
- The API automatically excludes categories starting with "CATERING" when `excludeCatering=true`
- Category pages also exclude catering products from their listings
- This ensures clean separation between regular and catering products

### 3. Price Validation

**Problem**: Some products might have $0.00 prices due to sync issues or configuration errors.

**Solution**:
- Always filter out products with $0.00 prices in recommendations
- This prevents showing broken or misconfigured products to customers

### 4. Specific Product Categories

**Problem**: Some products like empanadas and alfajores have both regular retail versions and catering versions that should be separated.

**Solution**:
- **Empanadas**: Regular frozen 4-pack products ($17-18) go in "EMPANADAS" category
- **Empanadas Catering**: Individual empanadas ($0.00) go in "EMPANADAS- OTHER" category
- **Alfajores**: Regular retail products go in "ALFAJORES" category
- **Alfajores Catering**: Catering versions should go in appropriate catering categories

**Example of Correct Categorization**:
```sql
-- Regular EMPANADAS category (retail products)
Empanadas- Argentine Beef (frozen- 4 pack) - $17.00
Empanadas- Caribbean Pork (frozen- 4 pack) - $17.00
Empanadas- Combo (frozen- 4 pack) - $18.00

-- EMPANADAS- OTHER category (catering products)
beef empanada - $0.00
chicken empanada - $0.00
pork empanada - $0.00

-- Regular ALFAJORES category (retail products)
Alfajores- Chocolate (1 dozen- packet) - $20.00
Alfajores- Classic (1 dozen- packet) - $14.00
Alfajores- Pride (6-pack) - $10.00

-- CATERING- DESSERTS category (catering products)
chocolate alfajores - $2.50
classic alfajores - $2.50
gluten-free alfajores - $2.50
lemon alfajores - $2.50
```

## Code Examples

### Fetching Related Products (Correct Way)

```typescript
// Fetch products from the same category, excluding current product and catering
const response = await fetch(
  `/api/products?categoryId=${currentProduct.categoryId}&exclude=${currentProduct.id}&limit=6&excludeCatering=true`
);

// Additional safety: filter out $0.00 products
const filteredProducts = products.filter((product: Product) => {
  const price = typeof product.price === 'object' && product.price !== null && 'toNumber' in product.price 
    ? product.price.toNumber() 
    : Number(product.price);
  return price > 0;
});
```

### API Query Structure

```typescript
const whereCondition = {
  active: true,
  categoryId: categoryId,
  // Exclude catering products by default
  category: {
    NOT: {
      name: {
        startsWith: 'CATERING',
        mode: 'insensitive'
      }
    }
  }
};
```

## Testing

### Manual Testing Checklist

1. **Product Detail Page**: Visit any regular product page and verify the "You Might Also Like" section:
   - [ ] Shows only products with prices > $0.00
   - [ ] No catering products appear
   - [ ] Products are from the same category
   - [ ] Current product is not shown

2. **Category Pages**: Visit category pages like `/products/category/empanadas`:
   - [ ] No catering products in the main listing
   - [ ] All products have valid prices
   - [ ] Products are properly categorized

3. **Catering Pages**: Visit catering pages:
   - [ ] Only catering products are shown
   - [ ] Regular products are not mixed in

### Automated Testing

The tests in `src/__tests__/components/Products/ProductDetails.test.tsx` verify:
- Related products are fetched with correct parameters
- The component handles various price formats correctly
- Error states are handled gracefully

## Troubleshooting

### Common Issues

1. **Catering products appearing in recommendations**
   - Check if `excludeCatering=true` is being passed to the API
   - Verify the category filtering is working correctly
   - Check if there are any sync issues with category assignments

2. **$0.00 products in recommendations**
   - Verify the price filtering logic is working
   - Check if products have proper price data in the database
   - Review Square sync process for pricing issues

3. **No recommendations showing**
   - Check if there are enough products in the same category
   - Verify the API is returning data correctly
   - Check browser console for errors

### Debug Steps

1. Check the API response:
   ```javascript
   // In browser console
   fetch('/api/products?categoryId=YOUR_CATEGORY_ID&exclude=YOUR_PRODUCT_ID&limit=6&excludeCatering=true')
     .then(r => r.json())
     .then(console.log);
   ```

2. Verify category assignments:
   ```sql
   -- Check what products are in a category
   SELECT p.name, p.price, c.name as category_name 
   FROM products p 
   JOIN categories c ON p."categoryId" = c.id 
   WHERE c.id = 'YOUR_CATEGORY_ID';
   ```

3. Check for catering products:
   ```sql
   -- Find catering products
   SELECT p.name, c.name as category_name 
   FROM products p 
   JOIN categories c ON p."categoryId" = c.id 
   WHERE c.name LIKE 'CATERING%';
   ```

4. Check for $0.00 products in a category:
   ```sql
   -- Find products with $0.00 prices in a specific category
   SELECT p.name, p.price, c.name as category_name 
   FROM products p 
   JOIN categories c ON p."categoryId" = c.id 
   WHERE c.name = 'EMPANADAS' AND p.price = 0;
   ```

## Future Improvements

1. **Smart Recommendations**: Implement machine learning-based recommendations instead of just category-based
2. **Personalization**: Show recommendations based on user browsing history
3. **A/B Testing**: Test different recommendation strategies
4. **Performance**: Implement caching for recommendations to improve page load times 