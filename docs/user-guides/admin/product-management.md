# Product Management - Admin Guide

Understand how products work in Destino SF! This guide explains how products are managed through Square POS integration and what admin controls are available.

## 🎯 What You'll Learn

- Understanding Square POS integration
- Managing product sync from Square
- Working with readonly product data
- Troubleshooting sync issues

## 🔗 Square Integration Overview

### How Products Work
**Important**: Products in Destino SF are **synchronized from Square POS** and are **readonly** in the web platform.

**Product Data Flow**:
1. **Products created in Square POS** (Point of Sale system)
2. **Sync process pulls data** to Destino SF platform
3. **Website displays** synchronized products
4. **All changes must be made in Square POS**

### What This Means
- ✅ **Products automatically sync** from your Square POS
- ✅ **Inventory levels update** from Square
- ✅ **Pricing stays consistent** across POS and website
- ❌ **Cannot add products** directly in Destino SF
- ❌ **Cannot edit products** through the website
- ❌ **Cannot manage inventory** in the platform

## 📊 Product Data Display

### What You Can View
**Product Information Available**:
- **Product Name**: As entered in Square POS
- **Description**: Product descriptions from Square
- **Pricing**: Current Square pricing
- **Categories**: Category assignments from Square
- **Images**: Product photos (may need manual management)
- **Availability**: In-stock/out-of-stock status
- **Square ID**: Unique identifier linking to Square

### Product Organization
**Categories**:
- **Synced from Square**: Categories come from your Square catalog
- **Hierarchical Structure**: Matches Square category organization
- **Website Display**: Categories organize menu navigation

**Product Variants**:
- **Size Options**: Small, medium, large variations
- **Pricing Tiers**: Different prices for different sizes
- **Square Management**: All variants managed in Square POS

## 🔄 Sync Management

### Manual Sync Process
**When to Sync**:
- After adding new products in Square
- After updating prices in Square POS  
- After changing product availability
- When products seem out of date on website

**How to Sync**:
1. **Go to** Admin Dashboard → Sync
2. **Click** "Sync Products from Square"
3. **Wait** for sync completion
4. **Verify** products updated correctly

### Automatic Sync
**Background Sync**:
- **Periodic Updates**: System automatically syncs periodically
- **Webhook Updates**: Real-time updates when possible
- **Inventory Changes**: Stock levels update regularly

### Sync Status Monitoring
**Check Sync Health**:
- **Last Sync Time**: When products were last updated
- **Sync Errors**: Any issues with Square connection
- **Product Count**: Number of products synced
- **Missing Images**: Products needing image updates

## 🖼️ Image Management

### Product Images
**Image Sources**:
- **Square Images**: Photos uploaded to Square POS
- **Manual Upload**: Additional images can be added manually
- **Image Protection**: System preserves custom images during sync

**Managing Images**:
- **View Current Images**: See all product photos
- **Add Additional Images**: Upload supplementary photos
- **Image Quality**: Ensure high-quality food photography
- **Update Process**: Changes may require manual intervention

### Image Troubleshooting
**Common Issues**:
- **Missing Images**: Products without photos
- **Broken Links**: Images that no longer load
- **Quality Issues**: Low-resolution or poor photos

**Solutions**:
- **Upload in Square**: Add images to Square POS first
- **Manual Addition**: Add images through admin interface
- **Sync Again**: Re-sync to pull updated images

## ⚙️ Product Settings

### Availability Management
**In Square POS**:
- **Mark items unavailable** when out of stock
- **Set inventory levels** for automatic management
- **Seasonal availability** for limited-time items

**On Website**:
- **Products automatically hide** when marked unavailable in Square
- **Stock status reflects** Square inventory levels
- **Customer sees** accurate availability

### Pricing Updates
**Price Changes**:
1. **Update prices in Square POS**
2. **Sync products** to Destino SF
3. **Verify pricing** on website
4. **Test ordering process** to confirm accuracy

## 📈 Analytics and Reporting

### Available Analytics
**Basic Metrics**:
- **Product Views**: Which products customers view most
- **Order Frequency**: Most frequently ordered items
- **Category Performance**: Popular menu categories

**Note**: Detailed business analytics are handled in Square POS, not in Destino SF.

### Sales Reporting
**Square Reports**:
- **Use Square Dashboard** for detailed sales analytics
- **Product Performance**: Square provides comprehensive reporting
- **Inventory Reports**: Stock movement and turnover
- **Revenue Analysis**: Profit margins and trends

## 🚨 Troubleshooting

### Common Sync Issues
**Products Not Appearing**:
1. **Check Square connection** in admin settings
2. **Verify products are active** in Square POS
3. **Run manual sync** from admin dashboard
4. **Check error logs** for sync failures

**Pricing Mismatches**:
1. **Confirm prices in Square POS**
2. **Force sync** to update pricing
3. **Clear cache** if prices still wrong
4. **Contact support** if issues persist

**Missing Categories**:
1. **Verify categories exist** in Square
2. **Check category assignment** in Square POS
3. **Resync categories** specifically
4. **Manually organize** if needed

### Error Resolution
**Sync Failures**:
- **Check internet connection**
- **Verify Square API credentials**
- **Look for Square service outages**
- **Try sync again after delay**

**Product Issues**:
- **Individual product problems** may need manual fixing
- **Bulk issues** suggest sync problems
- **Image problems** often need separate resolution

## 📞 Getting Help

### When to Contact Support
**Technical Issues**:
- Sync consistently failing
- Products not updating after multiple syncs  
- Square connection problems
- Data corruption or missing products

**Square Support**:
- **Product setup questions**: Contact Square support
- **POS configuration**: Square handles POS setup
- **Inventory management**: Square provides inventory training

### Internal Support
**Contact Information**:
- **Technical Support**: admin-support@destino-sf.com
- **Training Resources**: Available in admin dashboard
- **Documentation**: Keep this guide bookmarked

## 💡 Best Practices

### Daily Operations
- **Check sync status** regularly
- **Monitor product availability** 
- **Review customer feedback** about menu items
- **Keep Square POS updated** with current offerings

### Product Organization
- **Use clear product names** in Square
- **Write descriptive descriptions** for customer clarity
- **Organize categories logically** for easy browsing
- **Maintain high-quality images** for better sales

### Inventory Management
- **Update availability promptly** when items run out
- **Set realistic inventory levels** in Square
- **Plan for seasonal items** and limited offers
- **Coordinate with kitchen staff** on availability

## ❓ Frequently Asked Questions

**Q: Can I add products directly in Destino SF?**
A: No, all products must be created in Square POS first, then synced to the website.

**Q: How often do products sync automatically?**
A: Products sync automatically several times per day, but you can run manual syncs anytime.

**Q: What happens if I change prices in Square?**
A: Run a sync to update website pricing. Changes may take a few minutes to appear.

**Q: Can I hide certain products from the website?**
A: Mark products as unavailable in Square POS to hide them from the website.

**Q: Why don't my new Square products appear immediately?**
A: Run a manual sync from the admin dashboard to pull new products immediately.

## 🔜 What's Next?

Ready to master more admin functions?
- **[Order Management](order-management.md)**: Processing customer orders
- **[Dashboard Overview](dashboard-overview.md)**: Understanding your control center

Master the Square integration for seamless operations! 🔄
