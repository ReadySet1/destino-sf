# Product Catalog

## Overview

The product catalog system manages the complete inventory of food items, packages, and catering options for Destino SF.

## Product Management

### Product Structure

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  variants: ProductVariant[];
  images: ProductImage[];
  pricing: PricingInfo;
  availability: AvailabilityStatus;
  cateringEligible: boolean;
  nutritionalInfo?: NutritionalInfo;
}
```

### Product Categories

- **Main Dishes**: Entrees and primary food items
- **Appetizers**: Starters and small plates
- **Desserts**: Sweet treats and confections
- **Beverages**: Drinks and specialty beverages
- **Catering Packages**: Pre-designed catering solutions

### Product Variants

- Size options (Small, Medium, Large)
- Dietary modifications (Gluten-free, Vegan, etc.)
- Seasonal availability
- Custom preparation options

## Catalog Features

### Search & Discovery

- **Text Search**: Full-text search across product names and descriptions
- **Category Filtering**: Browse by food categories
- **Dietary Filters**: Filter by dietary restrictions and preferences
- **Price Range Filtering**: Budget-based product discovery

### Product Recommendations

- **Related Products**: Items frequently bought together
- **Category-based Suggestions**: Similar items within categories
- **Seasonal Recommendations**: Timely and relevant suggestions
- **Personalized Recommendations**: Based on order history

### Inventory Management

- Real-time stock tracking
- Low inventory alerts
- Automatic product hiding when out of stock
- Seasonal availability management

## Integration with Square POS

### Automated Synchronization

- **Product Data Sync**: Automatic updates from Square catalog
- **Pricing Updates**: Real-time price synchronization
- **Inventory Tracking**: Stock level monitoring
- **Image Management**: Secure image URL handling

### Conflict Resolution

- Manual override capabilities for web-specific pricing
- Inventory reconciliation procedures
- Error handling for sync failures

## Content Management

### Sanity CMS Integration

- Rich product descriptions with formatted text
- Multiple image uploads with optimization
- SEO-friendly content management
- Version control for product information

### Image Optimization

- **Cloudinary Integration**: Automatic image optimization
- **Multiple Formats**: WebP, AVIF support for modern browsers
- **Responsive Images**: Different sizes for various devices
- **Lazy Loading**: Performance optimization

## Performance Optimization

### Caching Strategy

- Product catalog caching for fast load times
- Image CDN delivery
- Database query optimization
- Static generation for category pages

### Search Performance

- Indexed search fields
- Efficient filtering algorithms
- Pagination for large result sets
- Real-time search suggestions

## Admin Management

### Product Administration

- Add/edit/delete products through admin interface
- Bulk operations for multiple products
- Product status management (active/inactive)
- Advanced filtering and sorting options

### Analytics & Insights

- Popular product tracking
- Sales performance metrics
- Customer preference analysis
- Inventory turnover reports
