# Catering Minimum Order Requirements

This document describes the implementation of minimum order thresholds for catering orders in the Destino SF application.

## Overview

The system now enforces a separate minimum purchase threshold specifically for catering orders. When customers attempt to checkout with catering items, the system verifies that the total cart value meets or exceeds the configured catering minimum amount. If the minimum is not met, the checkout process is blocked and an appropriate error message is displayed.

## Implementation Details

### Database Changes

- Added a `cateringMinimumAmount` field to the `StoreSettings` model in the database
- This field stores the minimum order amount (in dollars) required for catering orders
- The field defaults to $0 (no minimum), but the application defaults to $150

### Validation Logic

1. When a customer attempts to checkout, the system checks if their cart contains any catering products
2. If catering products are present, the total cart value is compared against the `cateringMinimumAmount` setting
3. If the cart value is below the minimum, checkout is prevented with an error message
4. Regular non-catering orders continue to use the standard `minOrderAmount` setting

### Detecting Catering Orders

A cart is identified as a catering order if any product in the cart belongs to a category with "catering" in its name (case-insensitive match).

## Configuration

Administrators can configure the catering minimum order amount through the admin settings panel:

1. Navigate to Admin > Settings
2. Find the "Catering Minimum Order Amount ($)" field
3. Enter the desired minimum amount
4. Save changes

## Workflow

1. Customer adds catering products to cart
2. Customer proceeds to checkout
3. System validates cart total against catering minimum
4. If minimum is not met, error message is displayed: "Catering orders require a minimum purchase of $X"
5. Customer must add more items or cancel the order

## Implementation Files

- `prisma/schema.prisma`: Database schema definition with the new field
- `src/lib/cart-helpers.ts`: Helper functions for checking catering orders and validating minimums
- `src/app/actions/orders.ts`: Server-side validation in checkout process
- `src/components/Store/CheckoutForm.tsx`: Client-side validation in the checkout form
- `src/app/(dashboard)/admin/settings/components/SettingsForm.tsx`: Admin UI for configuring the minimum
