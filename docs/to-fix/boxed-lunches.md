# Master Fix Planning - Boxed Lunches Feature

## 🎯 Feature/Fix Overview

**Name**: Add Database-Driven Boxed Lunches to Catering Page

**Type**: Feature Enhancement

**Priority**: High

**Estimated Complexity**: Medium (3-5 days)

### Problem Statement

Need to integrate the existing boxed lunch items from the database (category: "CATERING- BOXED LUNCHES") into the catering page's Boxed Lunches tab. The Tropical Salad item requires special handling with dropdown modifiers for protein add-ons. Currently, the boxed lunch menu is using hard-coded data instead of pulling from the database.

### Success Criteria

- [x] All 7 boxed lunch items from database displayed in the Boxed Lunches tab
- [x] Tropical Salad has working dropdown for protein add-ons with pricing
- [x] Clean, sleek UI matching existing catering page design
- [x] Real-time price updates when modifiers are selected
- [x] Items maintain proper dietary indicators (GF, Vegan, Vegetarian)
- [x] Integration with existing cart system

------

## 📋 Planning Phase

### 1. Code Structure & References

### File Structure

```tsx
src/
├── app/
│   ├── api/
│   │   └── catering/
│   │       └── boxed-lunches/
│   │           └── route.ts                    // NEW: API route for boxed lunches
│   └── catering/
│       └── page.tsx                            // Update: Add boxed lunch data fetching
├── components/
│   └── Catering/
│       ├── BoxedLunchMenu.tsx                  // MODIFY: Convert to database-driven
│       ├── BoxedLunchCard.tsx                  // NEW: Individual item card component
│       └── TropicalSaladModifier.tsx           // NEW: Dropdown modifier component
├── lib/
│   └── catering/
│       └── boxed-lunch-utils.ts                // NEW: Utility functions
├── types/
│   └── catering.ts                             // UPDATE: Add BoxedLunchItem interface
└── store/
    └── catering-cart.ts                        // Verify: Cart compatibility
```

### Key Interfaces & Types

```tsx
// types/catering.ts - ADD these interfaces
interface BoxedLunchItem {
  id: string;
  name: string;
  description: string;
  price: number;
  squareId: string;
  imageUrl?: string;
  dietaryPreferences: string[];
  isGlutenFree: boolean;
  isVegan: boolean;
  isVegetarian: boolean;
  modifiers?: BoxedLunchModifier[];
}

interface BoxedLunchModifier {
  id: string;
  name: string;
  price: number;
  dietaryInfo?: string;
}

interface TropicalSaladModifiers {
  queso_fresco: BoxedLunchModifier;
  sirloin_steak: BoxedLunchModifier;
  chicken_mojo: BoxedLunchModifier;
}

// Response type for API
interface BoxedLunchResponse {
  success: boolean;
  items: BoxedLunchItem[];
  error?: string;
}
```

### Database Schema Reference

```sql
-- Existing products table contains boxed lunch items
-- Category: "CATERING- BOXED LUNCHES"
-- Items already in database:
-- 1. Box- Adobo Pork Power Box ($16.00)
-- 2. Box- Churrasco Energy Box ($17.00)  
-- 3. Box- Citrus Mojo Chicken Box ($15.00)
-- 4. Box- Tropical Salad Entree (12oz) ($14.00) -- Needs modifiers
-- 5. Box- Vegetarian Empanadas (2) with Arroz Rojo & Kale ($15.00)
-- 6. Box-Beef Empanadas (2) with Chipotle Potatoes & Arroz Blanco ($15.00)
-- 7. Box-Chicken Empanadas (2) with Chipotle Potatoes & Kale ($15.00)
```

### 2. Core Functionality Checklist

### Required Features (Do Not Modify)

- [x] Display all 7 boxed lunch items from database category "CATERING- BOXED LUNCHES"
- [x] Tropical Salad dropdown with exactly these options:
  - Add Queso Fresco (4oz) $2.00 -gf
  - Add Sirloin Steak (4oz) $4.00 -gf  
  - Add Chicken Mojo (4oz) $3.00 -gf
- [x] Clean item description parsing (handle special characters, line breaks)
- [x] Dietary indicator badges (GF, Vegan, Vegetarian)
- [x] Add to cart functionality with modifier state

### Implementation Assumptions

- Modifiers for Tropical Salad will be stored in component state initially
- Future enhancement: Move modifiers to database variant system
- Images will use fallback if not available in database
- Price calculations happen client-side for modifiers

### 3. Full Stack Integration Points

### API Endpoints

```tsx
// GET /api/catering/boxed-lunches - Fetch all boxed lunch items
interface RouteHandler {
  GET: async () => {
    // Query products with category "CATERING- BOXED LUNCHES"
    // Parse dietary info from descriptions
    // Return formatted items
  }
}
```

### Server Actions (App Router)

```tsx
// app/catering/actions.ts - ADD
async function getBoxedLunchItems(): Promise<BoxedLunchItem[]>
async function addBoxedLunchToCart(
  item: BoxedLunchItem, 
  quantity: number,
  modifiers?: BoxedLunchModifier[]
): Promise<CartResponse>
```

### Client-Server Data Flow

1. Page loads → Fetch boxed lunch items from API
2. User selects Tropical Salad → Show modifier dropdown
3. User selects modifier → Update local price display
4. User clicks "Add to Cart" → Send item + modifier to cart
5. Cart calculates total with base + modifier prices
6. Confirmation toast shows success

------

## 🧪 Testing Strategy

### Unit Tests

```tsx
// BoxedLunchCard Tests
describe('BoxedLunchCard', () => {
  it('displays item name and base price correctly', async () => {})
  it('shows dietary badges based on description parsing', async () => {})
  it('handles Tropical Salad modifier selection', async () => {})
  it('calculates correct total with modifiers', async () => {})
});

// API Route Tests  
describe('API: /api/catering/boxed-lunches', () => {
  it('returns all items from CATERING- BOXED LUNCHES category', async () => {})
  it('parses dietary preferences from descriptions', async () => {})
  it('handles database connection errors gracefully', async () => {})
});

// Utility Function Tests
describe('Boxed lunch utilities', () => {
  it('extracts dietary info from description text', () => {})
  it('formats prices correctly with modifiers', () => {})
  it('sanitizes description HTML/special chars', () => {})
});
```

### Integration Tests

```tsx
// Database Integration
describe('Boxed Lunch Database Operations', () => {
  it('retrieves items with correct category filter', async () => {})
  it('maintains data integrity for special characters', async () => {})
});

// Cart Integration
describe('Boxed Lunch Cart Integration', () => {
  it('adds item with modifier to cart correctly', async () => {})
  it('preserves modifier selection through checkout', async () => {})
});
```

------

## 🔒 Security Analysis

### Input Validation & Sanitization

```tsx
// Validate modifier selections
const TropicalSaladModifierSchema = z.object({
  modifierId: z.enum(['queso_fresco', 'sirloin_steak', 'chicken_mojo']).optional(),
  quantity: z.number().int().positive().max(10)
});

// Sanitize description HTML
import DOMPurify from 'isomorphic-dompurify';
const sanitizedDescription = DOMPurify.sanitize(item.description);
```

### SQL Injection Prevention

```tsx
// Use parameterized Prisma queries
const items = await prisma.product.findMany({
  where: {
    category: {
      name: 'CATERING- BOXED LUNCHES'
    },
    active: true
  },
  include: {
    category: true,
    variants: true
  }
});
```

------

## 📊 Performance Considerations

### Caching Strategy

- [x] Cache boxed lunch items with React Query (5 minute stale time)
- [x] Memoize modifier price calculations
- [x] Use Next.js route caching for API endpoint

### Bundle Size Optimization

- [x] Lazy load BoxedLunchMenu component
- [x] Use dynamic imports for DOMPurify (only when needed)

------

## 🚦 Implementation Checklist

### Phase 1: API & Data Layer

- [ ] Create `/api/catering/boxed-lunches/route.ts`
- [ ] Add BoxedLunchItem interface to types
- [ ] Create boxed-lunch-utils.ts with parsing functions
- [ ] Test API endpoint with Postman/Thunder Client

### Phase 2: UI Components

- [ ] Create BoxedLunchCard component
- [ ] Create TropicalSaladModifier dropdown component
- [ ] Update BoxedLunchMenu to use database data
- [ ] Style with Tailwind matching existing design

### Phase 3: Integration

- [ ] Connect to existing cart system
- [ ] Add loading states with skeletons
- [ ] Implement error boundaries
- [ ] Add success/error toasts

### Phase 4: Testing & Polish

- [ ] Write unit tests
- [ ] Manual testing of all items
- [ ] Test modifier pricing calculations
- [ ] Mobile responsiveness check
- [ ] Accessibility audit

------

## 🎨 UI/UX Design Specifications

### Layout Structure

```tsx
// Grid Layout (Responsive)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => (
    <BoxedLunchCard key={item.id} item={item} />
  ))}
</div>
```

### BoxedLunchCard Design

```tsx
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex justify-between items-start">
      <h3 className="text-lg font-semibold">{item.name}</h3>
      <span className="text-xl font-bold text-primary">
        ${calculatePrice(item, selectedModifier)}
      </span>
    </div>
    <div className="flex gap-2 mt-2">
      {item.isGlutenFree && <Badge variant="secondary">GF</Badge>}
      {item.isVegan && <Badge variant="secondary">Vegan</Badge>}
      {item.isVegetarian && <Badge variant="secondary">Vegetarian</Badge>}
    </div>
  </CardHeader>
  
  <CardContent>
    <p className="text-sm text-muted-foreground mb-4">
      {item.description}
    </p>
    
    {/* Tropical Salad Modifier Dropdown */}
    {item.name.includes('Tropical Salad') && (
      <TropicalSaladModifier 
        onSelect={setSelectedModifier}
        currentSelection={selectedModifier}
      />
    )}
    
    <div className="flex items-center gap-2 mt-4">
      <QuantitySelector 
        value={quantity}
        onChange={setQuantity}
      />
      <Button 
        onClick={handleAddToCart}
        className="flex-1"
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        Add to Cart
      </Button>
    </div>
  </CardContent>
</Card>
```

### Tropical Salad Modifier Dropdown

```tsx
<Select onValueChange={onSelect} value={currentSelection}>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Add protein (optional)" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">No protein</SelectItem>
    <SelectItem value="queso_fresco">
      Add Queso Fresco (4oz) +$2.00 <Badge size="sm">GF</Badge>
    </SelectItem>
    <SelectItem value="sirloin_steak">
      Add Sirloin Steak (4oz) +$4.00 <Badge size="sm">GF</Badge>
    </SelectItem>
    <SelectItem value="chicken_mojo">
      Add Chicken Mojo (4oz) +$3.00 <Badge size="sm">GF</Badge>
    </SelectItem>
  </SelectContent>
</Select>
```

------

## 📝 Implementation Notes

### Key Considerations

1. **Description Parsing**: Item descriptions contain dietary info (e.g., "-gf, vg, vegan") that needs to be extracted and displayed as badges

2. **Price Display**: When modifier is selected, show total price (base + modifier) prominently

3. **Mobile First**: Ensure touch-friendly controls and readable text on mobile

4. **Loading States**: Use skeleton loaders matching card dimensions

5. **Error Handling**: Gracefully handle API failures with fallback UI

### Future Enhancements

- Move modifiers to database as product variants
- Add item images when available
- Implement quantity-based pricing discounts
- Add nutritional information display
- Create modifier presets for common combinations

------

## 🔄 Rollback Plan

### Feature Toggle

```tsx
// Environment variable for gradual rollout
const ENABLE_DB_BOXED_LUNCHES = process.env.NEXT_PUBLIC_ENABLE_DB_BOXED_LUNCHES === 'true';

// In BoxedLunchMenu component
if (ENABLE_DB_BOXED_LUNCHES) {
  // Use database items
} else {
  // Use existing hardcoded items
}
```

### Database Rollback

No database changes required - using existing products table

### Monitoring & Alerts

- [ ] Track API response times for boxed lunch endpoint
- [ ] Monitor cart conversion rates for boxed lunch items
- [ ] Set up error tracking for modifier selection issues
- [ ] Track usage analytics for Tropical Salad modifiers

------

## Example API Response

```json
{
  "success": true,
  "items": [
    {
      "id": "uuid-1",
      "name": "Box- Tropical Salad Entree (12oz)",
      "description": "baby arugula / hearts of palms / brazilian mango...",
      "price": 14.00,
      "squareId": "square-id",
      "isGlutenFree": true,
      "isVegan": true,
      "isVegetarian": true,
      "modifiers": [
        {
          "id": "mod-1",
          "name": "Add Queso Fresco (4oz)",
          "price": 2.00,
          "dietaryInfo": "gf"
        },
        {
          "id": "mod-2", 
          "name": "Add Sirloin Steak (4oz)",
          "price": 4.00,
          "dietaryInfo": "gf"
        },
        {
          "id": "mod-3",
          "name": "Add Chicken Mojo (4oz)",
          "price": 3.00,
          "dietaryInfo": "gf"
        }
      ]
    }
  ]
}
```