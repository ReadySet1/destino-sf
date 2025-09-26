# Example Availability Rules Guide

This guide explains the example availability rules that have been set up to demonstrate the system's capabilities.

## 🎯 Overview

The example rules demonstrate various real-world scenarios that restaurants commonly need to handle:

- **Holiday specials** with limited-time availability
- **Seasonal items** that appear/disappear based on time of year
- **Weekend-only** brunch items
- **Pre-order systems** for meal prep and special events
- **Limited edition** items with view-only states
- **Daily specials** and happy hour restrictions

## 📋 Created Example Rules

### 🎄 Holiday Rules

#### 1. Thanksgiving Special
- **Product**: Aji Amarillo Salsa (7oz)
- **Type**: Date Range
- **State**: Available
- **Priority**: 90
- **Duration**: Nov 20 - Nov 30, 2024
- **Purpose**: Demonstrates limited-time holiday promotions

#### 2. Christmas Pre-Order
- **Product**: Aji Huacatay Salsa (7oz)
- **Type**: Date Range  
- **State**: Pre-Order
- **Priority**: 95
- **Duration**: Dec 1 - Dec 25, 2024
- **Features**:
  - Requires $25 deposit
  - Max 10 items per order
  - Expected pickup Dec 23-24
- **Purpose**: Shows pre-order functionality for holiday items

### 🌞 Seasonal Rules

#### 3. Summer Menu Items
- **Product**: Alfajores de Lucuma (10 per packet)
- **Type**: Seasonal
- **State**: Available
- **Priority**: 70
- **Season**: May 1 - September 30 (yearly)
- **Purpose**: Demonstrates seasonal availability patterns

#### 4. Winter Warm Drinks
- **Product**: Alfajores- 6-pack combo
- **Type**: Seasonal
- **State**: Available  
- **Priority**: 70
- **Season**: November 1 - March 31 (yearly)
- **Purpose**: Shows opposite seasonal pattern

### 🥞 Weekend Rules

#### 5. Weekend Brunch Items
- **Product**: Alfajores- Chocolate (1 dozen- packet)
- **Type**: Time-Based
- **State**: Available
- **Priority**: 60
- **Schedule**: Weekends only, 9:00 AM - 3:00 PM
- **Purpose**: Demonstrates day-of-week and time restrictions

### 🔒 Limited Availability Rules

#### 6. Limited Edition Item
- **Product**: Alfajores- Classic (1 dozen- packet)
- **Type**: Custom
- **State**: View Only
- **Priority**: 80
- **Status**: Disabled (activate when sold out)
- **Features**:
  - Shows price
  - Allows wishlist addition
  - Enables availability notifications
- **Purpose**: Shows how to handle sold-out limited items

#### 7. Coming Soon Item  
- **Product**: Alfajores- Gingerbread (1 dozen- packet) Coming Soon!
- **Type**: Custom
- **State**: Coming Soon
- **Priority**: 85
- **Status**: Disabled (activate when ready to tease)
- **Features**:
  - Hides price
  - Allows wishlist addition
  - Enables availability notifications
- **Purpose**: Demonstrates marketing for upcoming products

### 📅 Daily Special Rules

#### 8. Monday Special
- **Product**: Alfajores- Gluten Free (1 dozen- packet)
- **Type**: Time-Based
- **State**: Available
- **Priority**: 50
- **Schedule**: Mondays only, 11:00 AM - 9:00 PM
- **Purpose**: Shows single-day weekly promotions

#### 9. Happy Hour
- **Product**: Alfajores- Lemon (1 dozen- packet)
- **Type**: Time-Based
- **State**: Available
- **Priority**: 55
- **Schedule**: Monday-Friday, 3:00 PM - 6:00 PM
- **Purpose**: Demonstrates daily time-based restrictions

### 🍽️ Pre-Order Rules

#### 10. Weekly Meal Prep
- **Product**: Alfajores- Pride (6-pack)
- **Type**: Date Range
- **State**: Pre-Order
- **Priority**: 75
- **Duration**: Tomorrow - 2 weeks from now
- **Features**:
  - No deposit required
  - Max 5 items per order
  - Next week delivery
- **Purpose**: Shows recurring pre-order systems

## 🎮 Testing the Rules

### View Rules in Admin
1. Go to: `http://localhost:3000/admin/products/availability`
2. You'll see the dashboard with rule statistics
3. Click on "Rules" tab to see all created rules
4. Edit any rule to see the improved calendar UI

### Test Rule Behavior
1. Go to the main products page: `http://localhost:3000/products`
2. Look for products with the example rules applied
3. Check how different states are displayed:
   - **Available**: Normal purchase flow
   - **Pre-Order**: Special pre-order button and messaging
   - **View Only**: No purchase button, just viewing
   - **Coming Soon**: Teaser display

### Modify Rules
1. In the admin panel, click "Edit" on any rule
2. Test the new card-based calendar interface
3. Try changing:
   - Date ranges
   - Time restrictions  
   - Pre-order settings
   - Priority levels

## 🔧 Rule Priority System

The rules are set with different priorities to demonstrate override behavior:

- **95**: Christmas Pre-Order (highest)
- **90**: Thanksgiving Special
- **85**: Coming Soon Item
- **80**: Limited Edition Item
- **75**: Weekly Meal Prep
- **70**: Seasonal rules
- **60**: Weekend Brunch
- **55**: Happy Hour
- **50**: Monday Special (lowest)

Higher priority rules will override lower priority ones when conflicts occur.

## 🧹 Cleanup

To remove all example rules, run:
```bash
pnpm tsx scripts/setup-example-availability-rules.ts
```

The script automatically cleans up existing example rules before creating new ones.

## 🎯 Next Steps

1. **Create your own rules** using the improved UI
2. **Test different scenarios** with your actual products
3. **Adjust priorities** based on your business needs
4. **Set up automated scheduling** for recurring patterns
5. **Monitor rule performance** using the analytics dashboard

The example rules provide a solid foundation for understanding how the availability system works and can be adapted for your specific restaurant needs!
