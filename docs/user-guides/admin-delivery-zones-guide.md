# Admin Guide: Managing Delivery Zones

This guide explains how to configure and manage both delivery zone systems from the admin interface.

## 🎯 Quick Start

1. **Access Admin Panel**: Navigate to `/admin/settings`
2. **Choose Zone Type**: 
   - **Catering Zones** tab for large orders
   - **Regular Zones** tab for individual products
3. **Configure Zones**: Add, edit, or delete delivery areas
4. **Test Changes**: Verify with sample addresses

---

## 🍽️ Managing Catering Delivery Zones

**Use Case**: Large catering orders, corporate events, bulk deliveries

### Adding a New Catering Zone

1. Click **"Catering Zones"** tab
2. Click **"Add Zone"** button
3. Fill in the required fields:

#### Basic Information
- **Zone Identifier**: Unique code (e.g., `east_bay`)
- **Zone Name**: Display name (e.g., `East Bay`)
- **Description**: Brief explanation of coverage area

#### Pricing & Requirements
- **Minimum Catering Order**: Required order value (e.g., `$350.00`)
- **Delivery Fee**: Fixed charge (e.g., `$75.00`)
- **Estimated Delivery Time**: Customer expectation (e.g., `2-3 hours`)

#### Coverage Areas
- **Cities**: Comma-separated list (e.g., `Oakland, Berkeley, Alameda`)
- **Postal Codes**: Specific ZIP codes (e.g., `94601, 94602, 94603`)

#### Settings
- **Zone is active**: Enable immediately after creation

4. Click **"Save Zone"**

### Example Catering Zone Configuration
```
Zone Identifier: south_bay
Zone Name: South Bay Catering
Description: San José, Santa Clara, and surrounding areas
Minimum Order: $350.00
Delivery Fee: $75.00
Est. Time: 2-3 hours
Cities: San Jose, Santa Clara, Sunnyvale, Campbell
Postal Codes: 95110, 95111, 95050, 95051, 94085, 94086
Active: ✓
```

---

## 🥟 Managing Regular Product Delivery Zones

**Use Case**: Individual empanadas, alfajores, small orders

### Adding a New Regular Zone

1. Click **"Regular Zones"** tab
2. Click **"Add Zone"** button
3. Fill in the required fields:

#### Basic Information
- **Zone Identifier**: Unique code (e.g., `peninsula`)
- **Zone Name**: Display name (e.g., `Peninsula Area`)
- **Description**: Coverage explanation

#### Pricing & Delivery
- **Delivery Fee**: Fixed charge (e.g., `$25.00`)
- **Free Delivery Over**: Threshold for free delivery (e.g., `$75.00`)
  - Set to `$0.00` if no free delivery offered
- **Estimated Delivery Time**: Customer expectation (e.g., `45-90 minutes`)

#### Coverage Areas
- **Cities**: Comma-separated list
- **Postal Codes**: Specific ZIP codes

#### Settings  
- **Zone is active**: Enable immediately

4. Click **"Save Zone"**

### Example Regular Zone Configuration
```
Zone Identifier: sf_nearby
Zone Name: San Francisco Nearby
Description: SF and immediate surrounding - free delivery over $75
Delivery Fee: $15.00
Free Over: $75.00
Est. Time: 30-60 minutes
Cities: San Francisco, Daly City, South San Francisco
Postal Codes: 94102, 94103, 94110, 94111, 94014, 94015
Active: ✓
```

---

## ✏️ Editing Existing Zones

### To Modify a Zone:
1. Find the zone in the appropriate tab
2. Click the **"Edit"** button
3. Make necessary changes
4. Click **"Save Zone"**

### Common Edits:
- **Add new postal codes** as you expand service area
- **Adjust delivery fees** based on operational costs
- **Update delivery times** based on actual performance
- **Modify minimums** for catering based on demand

---

## 🗑️ Deleting Zones

### ⚠️ Important Warning
Deleting a zone will immediately affect customer checkout. Only delete zones that are:
- No longer served
- Replaced by other zones
- Causing system conflicts

### To Delete a Zone:
1. Click the **"Delete"** button next to the zone
2. **Confirm deletion** in the dialog box
3. Zone is immediately removed from system

### What Happens When You Delete:
- ✅ Existing orders are **not affected**
- ❌ New customers in that area **cannot place orders**
- ⚠️ Checkout will show **"outside delivery area"**

---

## 🔄 Activating/Deactivating Zones

### Toggle Zone Status:
- Use the **switch toggle** next to each zone
- **Active**: Zone accepts new orders
- **Inactive**: Zone hidden from customers

### Use Cases for Deactivation:
- **Temporary service suspension** in an area
- **Testing new configurations** before going live
- **Seasonal adjustments** (e.g., holiday restrictions)
- **Operational capacity** management

---

## 📊 Best Practices

### Zone Configuration Strategy

#### Catering Zones
1. **Start with major metro areas**
2. **Set realistic minimums** that cover delivery costs
3. **Account for travel time** in delivery estimates
4. **Use geographic clusters** to optimize routes

#### Regular Zones  
1. **Balance coverage with profitability**
2. **Offer free delivery thresholds** to increase order size
3. **Keep fees reasonable** for individual customers
4. **Ensure quick delivery times** for competitive advantage

### Postal Code Management
- **Be comprehensive**: Include all codes in service areas
- **Avoid overlaps**: Each postal code should belong to one zone
- **Regular updates**: Add codes as service expands
- **Validation**: Test with real customer addresses

### Pricing Strategy
- **Cover actual costs**: Factor in driver time, fuel, vehicle wear
- **Competitive analysis**: Research local market rates
- **Value perception**: Balance fees with service quality
- **Profitability**: Ensure margins support business goals

---

## 🧪 Testing Your Configuration

### Before Going Live:
1. **Test with sample addresses** in each zone
2. **Verify fee calculations** match expectations  
3. **Check free delivery thresholds** work correctly
4. **Confirm geographic coverage** is complete

### Testing Script:
```bash
# Run comprehensive test
npx tsx scripts/test-delivery-systems.ts
```

### Manual Testing:
1. Visit your store checkout page
2. Add products to cart (regular and catering)
3. Enter addresses from different zones
4. Verify correct fees and messaging appear

---

## 📈 Monitoring & Optimization

### Key Metrics to Track:
- **Zone utilization**: Orders per zone
- **Average order value**: By zone and product type
- **Delivery success rate**: Fulfillment performance
- **Customer feedback**: Satisfaction with delivery

### Regular Reviews:
- **Monthly**: Review zone performance and customer patterns
- **Quarterly**: Adjust fees based on operational costs
- **Annually**: Evaluate geographic expansion opportunities

### Optimization Opportunities:
- **Consolidate low-volume zones**
- **Split high-volume zones** for better service
- **Adjust fees** based on demand elasticity
- **Expand coverage** to high-demand areas

---

## 🆘 Troubleshooting

### Common Issues & Solutions:

#### "Zone not found" errors
- **Check postal codes**: Ensure customer's ZIP is included
- **Verify city names**: Check spelling and variations
- **Confirm zone is active**: Toggle switch should be ON

#### Wrong delivery fees
- **Verify product type**: Regular vs catering pricing
- **Check order total**: For free delivery thresholds
- **Review zone settings**: Confirm fee amounts

#### Customer confusion
- **Clear messaging**: Update zone descriptions
- **Consistent naming**: Use recognizable area names
- **Accurate estimates**: Set realistic delivery times

### Getting Help:
- **System logs**: Check console for calculation errors
- **Test script**: Run diagnostic tools
- **Admin interface**: Use built-in validation features

---

## 📞 Support Resources

### Quick Reference Links:
- **System Overview**: `/docs/features/delivery/delivery-systems-overview.md`
- **API Documentation**: `/docs/api/delivery-zones.md`
- **Testing Tools**: `scripts/test-delivery-systems.ts`

### For Technical Issues:
1. Check system logs for errors
2. Run test script to validate configuration
3. Review zone coverage completeness
4. Verify database connectivity

---

*Last Updated: January 2025*  
*For Admin Dashboard Version: v2.0*
