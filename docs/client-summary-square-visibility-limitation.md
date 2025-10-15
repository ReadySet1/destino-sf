# Square API Limitation: "Site Visibility" Settings

## Executive Summary

We discovered a limitation in Square's API that prevents automatic synchronization of certain product visibility settings. This document explains the issue and our solution.

## The Problem

### Square Dashboard vs API Discrepancy

**What You See in Square Dashboard:**

- **Site Visibility** options: "Visible", "Hidden", "Unavailable"
- Easy dropdown to set products as unavailable for online sales

**What Square's API Actually Provides:**

- These "Site Visibility" settings are **NOT accessible** through Square's Catalog API
- The `available_online` field does not correspond to these dashboard settings
- **This is a documented limitation** in Square's API (confirmed via Square Developer Forums)

### Impact on Your Store

**Example: Alfajores de Lucuma (10 per packet)**

- ✅ Set to "Site visibility: Unavailable" in Square Dashboard
- ❌ Still appeared as "Available" in your website
- 🔄 Sync process couldn't detect this setting change

## Our Solution

### Manual Availability Override System

We've implemented a **Manual Availability Override** section in your admin panel that works around this API limitation.

**Location:** Admin → Products → Click any product → "Manual Availability Override" section

**New Controls:**

- **Available for Purchase** - Checkbox to enable/disable sales
- **Site Visibility** - Dropdown: Public/Private
- **Pre-order Item** - Mark items as pre-order
- **Item State** - Active/Inactive/Seasonal/Archived

**Visual Indicators:**

- **Admin Products List:** Shows colored badges (Available/Unavailable/Pre-order/Seasonal)
- **"Edit" buttons** added to each product row for quick access

## How to Use

### When Square "Site Visibility: Unavailable" Doesn't Sync:

1. **Navigate:** Go to Admin → Products
2. **Find Product:** Look for the item (e.g., "Alfajores de Lucuma")
3. **Click Edit:** Use the new "Edit" button in the Actions column
4. **Manual Override:** Scroll to "Manual Availability Override" (yellow section)
5. **Set Unavailable:** Uncheck "Available for Purchase"
6. **Save:** Click "Update Product"

**Result:**

- ✅ Product shows "Unavailable" badge in admin
- ✅ Product is hidden from public store pages
- ✅ Proper filtering works as expected

## Technical Details

### Why This Limitation Exists

Square's Catalog API was designed primarily for inventory and pricing management. The "Site Visibility" settings are part of their e-commerce layer, which has limited API access. This affects many developers, not just your project.

### Our Workaround Benefits

1. **Immediate Control** - Override any product availability instantly
2. **Visual Feedback** - Clear badges show status at a glance
3. **Future-Proof** - Works regardless of Square API limitations
4. **Consistent Experience** - Products properly hidden from customers

## Cost & Time Investment

- **Development Time:** 4 hours to research, implement, and test
- **Ongoing Maintenance:** None - works independently of Square API
- **Alternative Approaches:** Would require complex webhook systems or manual database updates

## Recommendation

This manual override system is the most reliable solution given Square's API limitations. It provides immediate control and visual clarity while working around the technical constraints.

**For day-to-day use:**

- Use Square Dashboard for normal product management
- Use our Manual Override for visibility settings that don't sync properly
- Check admin badges to verify all products show correct availability status

---

**Questions?** Contact your development team for any clarification on this implementation.
