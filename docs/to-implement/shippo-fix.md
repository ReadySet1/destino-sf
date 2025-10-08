Fix the shipping weight calculation system to ensure accurate costs are applied to all customers:

PROBLEM ANALYSIS:
The shipping_configurations table is EMPTY, causing the system to fall back to hardcoded defaults. Additionally, the pattern-based matching system is fragile and may not scale well.

REQUIRED FIXES:

1. POPULATE SHIPPING CONFIGURATIONS TABLE:
   - Locate the database migration or seed file
   - Create a migration to populate shipping_configurations with the current hardcoded defaults:
     - alfajores: baseWeightLb=0.5, weightPerUnitLb=0.4
     - empanadas: baseWeightLb=1.0, weightPerUnitLb=0.8
     - default: baseWeightLb=0.5, weightPerUnitLb=0.5 (add a 'default' entry)
   - Ensure all entries have isActive=true and applicableForNationwideOnly=true
   - File should be in: prisma/migrations/\* or similar

2. VERIFY WEIGHT CALCULATION FLOW:
   - Review src/lib/shippingUtils.ts
   - Ensure getWeightConfig() properly:
     - Queries shipping_configurations table FIRST
     - Falls back to DEFAULT_WEIGHT_CONFIGS only if DB query fails
     - Logs when using fallback (for monitoring)
   - Check calculateShippingWeight() function:
     - Verify formula: totalWeight = baseWeight + (quantity × weightPerUnit)
     - Ensure it handles edge cases (quantity=0, null values)
     - Add validation for negative weights

3. AUDIT ALL PRODUCTS IN DATABASE:
   - Query: SELECT DISTINCT name FROM products ORDER BY name;
   - For each product, verify it matches a pattern:
     - Products containing "alfajor" → 'alfajores' ✓
     - Products containing "empanada" → 'empanadas' ✓
     - Products NOT matching any pattern → 'default' (VERIFY THESE!)
   - List any products that fall through to 'default'
   - Check if 'default' weights are appropriate for these products

4. ENHANCE PATTERN MATCHING (OPTIONAL BUT RECOMMENDED):
   - Make getProductType() more robust:
     - Add more product type patterns if needed
     - Consider using a database table for pattern mappings instead of hardcoding
     - Add logging for unmatched products

   - Example enhancement:

     ```typescript
     function getProductType(productName: string): string {
       const name = productName.toLowerCase().trim();

       // Log for monitoring
       console.log(`[Shipping] Matching product: ${productName}`);

       if (name.includes('alfajor')) {
         console.log('[Shipping] Matched: alfajores');
         return 'alfajores';
       }
       if (name.includes('empanada')) {
         console.log('[Shipping] Matched: empanadas');
         return 'empanadas';
       }

       console.warn(`[Shipping] No match found, using default for: ${productName}`);
       return 'default';
     }
     ```

5. ADD VALIDATION IN SHIPPO INTEGRATION:
   - Find where Shippo API calls are made (likely in API routes)
   - Before sending to Shippo, validate:
     - Weight is > 0
     - Weight is reasonable (e.g., < 50 lbs for food items)
     - Log the calculated weight for each order
   - Add error handling if weight calculation fails

6. CREATE ADMIN VERIFICATION ENDPOINT:
   - Create API route: /api/admin/shipping/verify

   - Should return:
     - All products and their matched weight configurations
     - Products using 'default' weights
     - Current shipping_configurations from database
     - Comparison between DB configs and hardcoded defaults

   - Example response structure:

     ```typescript
     {
       databaseConfigs: ShippingWeightConfig[],
       hardcodedDefaults: ShippingWeightConfig[],
       productMatching: {
         productName: string,
         matchedType: string,
         appliedConfig: ShippingWeightConfig
       }[],
       warnings: string[]
     }
     ```

7. UPDATE ADMIN UI (/admin/shipping):
   - Ensure the UI properly saves to database
   - Add validation on the form:
     - baseWeightLb must be > 0
     - weightPerUnitLb must be >= 0
     - productName cannot be empty
   - Show current database values (not hardcoded defaults)
   - Add a "Test Calculation" feature to preview weights

8. ADD DATABASE INDEXES:
   - Ensure productName column in shipping_configurations is indexed:

     ```sql
     CREATE INDEX IF NOT EXISTS idx_shipping_config_product_name
     ON shipping_configurations(productName)
     WHERE isActive = true;
     ```

9. TESTING CHECKLIST:
   Create or update tests to verify:
   - [ ] Empty cart → no weight calculation needed
   - [ ] 1 alfajores item (qty=2) → 0.5 + (2 × 0.4) = 1.3 lbs
   - [ ] 1 empanadas item (qty=3) → 1.0 + (3 × 0.8) = 3.4 lbs
   - [ ] Mixed cart (alfajores + empanadas) → correct sum
   - [ ] Unknown product → uses 'default' config
   - [ ] Database config overrides hardcoded default
   - [ ] Shippo API receives correct weight

10. DOCUMENTATION:
    - Update any relevant documentation about:
      - How to add new product types
      - How weight calculations work
      - How to verify shipping costs are correct

DELIVERABLES:

1. Migration file to populate shipping_configurations
2. Updated shippingUtils.ts with improved error handling and logging
3. Admin verification endpoint
4. List of all products and their matched configurations
5. Any products that need manual review (using 'default' weights)
6. Test coverage for weight calculations
7. Brief summary of changes and any action items

PRIORITY:

1. CRITICAL: Populate database with current hardcoded values (migration)
2. CRITICAL: Verify all products match appropriate weight configs
3. HIGH: Add logging and monitoring
4. MEDIUM: Create admin verification endpoint
5. LOW: Enhance pattern matching system

Focus on TypeScript, PostgreSQL, and ensuring the Shippo integration receives accurate weights for all orders.
