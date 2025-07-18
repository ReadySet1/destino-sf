# Catering Items Table - Filtering and Pagination

## Overview

The catering items table in the admin panel (`/admin/catering`) now includes comprehensive filtering and pagination functionality to help manage large numbers of catering items efficiently.

## Features Implemented

### 🔍 Advanced Filtering

The table now includes 6 different filter options:

1. **Search** - Text search across item names and descriptions
2. **Category** - Filter by catering item categories (Starter, Entree, Side, etc.)
3. **Source** - Filter by item source (Square items vs Local items)
4. **Status** - Filter by active/inactive status
5. **Dietary** - Filter by dietary restrictions (Vegetarian, Vegan, Gluten-Free)
6. **Price Range** - Filter by price ranges (Under $10, $10-$25, $25-$50, Over $50)

### 📄 Pagination

- **Items per page**: 10 items per page (configurable via `ITEMS_PER_PAGE` constant)
- **Navigation controls**: First, Previous, Next, Last page buttons
- **Page information**: Shows current page, total pages, and result count
- **Smart pagination**: Automatically resets to page 1 when filters change

### 🔗 URL State Management

- All filters and pagination state are reflected in the URL
- Bookmarkable URLs with filter states
- Browser back/forward navigation support
- Clean URLs (empty filters are not included in URL)

## Technical Implementation

### Component Structure

```typescript
interface FilterState {
  search: string;
  category: string;
  source: string;
  status: string;
  dietary: string;
  priceRange: string;
}
```

### Key Features

1. **Real-time filtering**: Filters are applied immediately as you type or select options
2. **Efficient rendering**: Uses `useMemo` for performance optimization
3. **Responsive design**: Filter grid adapts to different screen sizes
4. **Clear filters**: One-click button to reset all filters
5. **Filter indicators**: Shows when filters are active and result counts

### Filter Logic

```typescript
// Example: Search filter
if (filters.search) {
  const searchLower = filters.search.toLowerCase();
  filtered = filtered.filter(item => 
    item.name.toLowerCase().includes(searchLower) ||
    (item.description && item.description.toLowerCase().includes(searchLower))
  );
}

// Example: Price range filter
if (filters.priceRange === 'under-10') {
  filtered = filtered.filter(item => Number(item.price) < 10);
}
```

## User Experience Improvements

### Visual Feedback

- **Loading states**: Buttons show loading spinners during operations
- **Empty states**: Clear messaging when no items match filters
- **Result counts**: Shows filtered vs total item counts
- **Filter badges**: Visual indicators for active filters

### Accessibility

- **Keyboard navigation**: All controls are keyboard accessible
- **Screen reader support**: Proper labels and ARIA attributes
- **Focus management**: Logical tab order through filters

### Mobile Responsiveness

- **Responsive grid**: Filter controls stack appropriately on mobile
- **Touch-friendly**: Adequate touch targets for mobile users
- **Horizontal scroll**: Table scrolls horizontally on small screens

## Usage Examples

### Basic Search
```
/admin/catering?search=empanada
```

### Multiple Filters
```
/admin/catering?category=STARTER&dietary=vegetarian&priceRange=under-10
```

### Pagination with Filters
```
/admin/catering?search=chicken&page=2
```

## Configuration

### Customizing Items Per Page

```typescript
const ITEMS_PER_PAGE = 10; // Change this value to adjust page size
```

### Adding New Filter Options

1. Add the filter to the `FilterState` interface
2. Add the filter logic in the `filteredAndPaginatedItems` useMemo
3. Add the UI component in the filters section
4. Update the URL management logic

### Price Range Customization

```typescript
// In the price range filter logic
case 'custom-range':
  filtered = filtered.filter(item => 
    Number(item.price) >= minPrice && Number(item.price) <= maxPrice
  );
  break;
```

## Performance Considerations

- **Debounced search**: Search input could be debounced for better performance with large datasets
- **Virtual scrolling**: For very large datasets (1000+ items), consider implementing virtual scrolling
- **Server-side filtering**: For production with large datasets, move filtering to the server

## Future Enhancements

1. **Saved filters**: Allow users to save and recall filter combinations
2. **Export functionality**: Export filtered results to CSV/Excel
3. **Bulk operations**: Select multiple items for bulk edit/delete
4. **Advanced search**: Boolean operators, field-specific search
5. **Sort options**: Sortable columns for name, price, category, etc.

## Browser Support

- Modern browsers with ES6+ support
- React 18+ with Next.js App Router
- Responsive design works on all screen sizes

## Dependencies

- `@/components/ui/*` - Shadcn/ui components
- `lucide-react` - Icons
- `next/navigation` - URL management
- `react-hot-toast` - Notifications 