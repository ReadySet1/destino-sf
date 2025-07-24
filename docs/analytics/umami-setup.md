# Umami Analytics Setup for Destino SF

## Overview

Destino SF uses Umami Analytics for privacy-friendly website analytics. Umami is open-source, GDPR-compliant, and doesn't use cookies for tracking.

## Configuration

### Environment Variables

Add these to your environment files (`.env.local`, `.env.production`):

```bash
# Umami Analytics Configuration
NEXT_PUBLIC_UMAMI_WEBSITE_ID=5a0ae847-dbb0-456c-b972-9e29944de4b2
NEXT_PUBLIC_UMAMI_SRC=https://analytics.readysetllc.com/script.js
```

### Default Configuration

If environment variables are not set, the system uses these defaults:
- **Website ID**: `5a0ae847-dbb0-456c-b972-9e29944de4b2`
- **Script Source**: `https://analytics.readysetllc.com/script.js`

## Implementation

### Script Loading

The Umami script is automatically loaded in the root layout (`src/app/layout.tsx`) using the `UmamiScript` component.

### Page Tracking

Automatic page view tracking is enabled via `useUmamiPageTracking()` hook in `src/app/client-layout.tsx`.

### Custom Event Tracking

Use the provided hooks to track custom events:

```typescript
import { useUmamiTracking, useUmamiFormTracking } from '@/lib/analytics';

// In your component
const { trackButtonClick, trackProductView, trackAddToCart } = useUmamiTracking();
const { trackFormSubmit, trackFormStart } = useUmamiFormTracking();

// Track button clicks
trackButtonClick('add_to_cart', 'product_page');

// Track form submissions
trackFormSubmit('contact_form', true); // success
trackFormSubmit('contact_form', false, 'Error message'); // failure
```

## Available Tracking Functions

### useUmamiTracking Hook

- `track(eventName, eventData)` - Track custom events
- `trackButtonClick(buttonName, location)` - Track button clicks
- `trackProductView(productName, category, price)` - Track product views
- `trackAddToCart(productName, quantity, price)` - Track add to cart
- `trackPurchase(orderTotal, orderItems, paymentMethod)` - Track purchases
- `trackContactForm(formType)` - Track contact form submissions
- `trackError(errorType, errorMessage, page)` - Track errors
- `trackSocialClick(platform, content)` - Track social media clicks
- `trackSearch(query, results)` - Track search events

### useUmamiFormTracking Hook

- `trackFormStart(formName)` - Track when form is first viewed
- `trackFormSubmit(formName, success, errorMessage)` - Track form submissions
- `trackFormFieldInteraction(formName, fieldName)` - Track field interactions

### useUmamiPerformanceTracking Hook

- `trackPerformance(metricName, value, unit)` - Track performance metrics
- `trackLoadTime(pageName)` - Track page load times

## Event Types

Predefined event types for type safety:

- `page_view` - Page views (automatic)
- `button_click` - Button clicks
- `form_submit` - Form submissions
- `product_view` - Product views
- `add_to_cart` - Add to cart actions
- `purchase` - Purchase completions
- `contact_form` - Contact form interactions
- `newsletter_signup` - Newsletter signups
- `catering_inquiry` - Catering inquiries
- `menu_download` - Menu downloads
- `location_click` - Location clicks
- `social_share` - Social media shares
- `search` - Search events
- `error` - Error tracking

## Development vs Production

- **Development**: Analytics events are logged to console for debugging
- **Production**: Events are sent to Umami analytics server

## Privacy Features

- No cookies used for tracking
- GDPR compliant by default
- Respects user privacy preferences
- Anonymous data collection

## Testing

To test analytics in development:

1. Open browser developer tools
2. Check console for analytics logs
3. Verify events are being tracked
4. Check Umami dashboard for data

## Troubleshooting

### Analytics Not Loading

1. Check environment variables are set correctly
2. Verify website ID is valid
3. Check browser console for errors
4. Ensure script is loading in network tab

### Events Not Tracking

1. Verify `isUmamiLoaded()` returns true
2. Check for JavaScript errors
3. Ensure hooks are properly imported
4. Verify event names match expected types

## Dashboard Access

Access your analytics dashboard at: https://analytics.readysetllc.com

Use your website ID: `5a0ae847-dbb0-456c-b972-9e29944de4b2` 