

## 🔍 **Development vs Production Database Comparison Report**

[1 tool called]

Based on my comprehensive analysis of your development and production databases, here are the key findings:

## **📊 Database Environment Overview**

### **🗄️ Projects Identified:**
- **Production:** `destino-production` (ID: `ocusztulyiegeawqptrs`) - PostgreSQL 17.4.1.074
- **Development:** `destino-development` (ID: `drrejylrcjbeldnzodjd`) - PostgreSQL 17.4.1.069

---

## **🔧 Major Schema Differences**

### **⚠️ Critical Schema Discrepancies:**

1. **Availability System Tables (Development Only)**
   - `availability_rules` table - **EXISTS IN DEV ONLY**
   - `availability_schedule` table - **EXISTS IN DEV ONLY**
   - This represents a major feature that's implemented in development but missing in production

2. **Store Settings Schema Differences**
   - Production has `usage_flags` column (jsonb) - **MISSING IN DEV**
   - Development missing this production column

3. **Column Type Differences**
   - Products table `description_validated_at` column:
     - **Production:** `timestamp with time zone`
     - **Development:** `timestamp without time zone`

---

## **📈 Data Volume Comparison**

| **Metric** | **Production** | **Development** | **Difference** |
|------------|----------------|-----------------|----------------|
| **Products** | 129 total | 129 total | ✅ Same |
| **Active Products** | 127 | 129 | ⚠️ Dev has 2 more active |
| **Available Products** | 126 | 126 | ✅ Same |
| **Categories** | 15 | 16 | ⚠️ Dev has 1 more |
| **Orders** | 6 total | 39 total | 🔴 **Dev has 33 more** |
| **Archived Orders** | 2 | 0 | ⚠️ Production has archived orders |
| **User Profiles** | 5 total | 7 total | ⚠️ Dev has 2 more |
| **Admin Profiles** | 3 | 3 | ✅ Same |
| **Customer Profiles** | 2 | 4 | ⚠️ Dev has 2 more customers |
| **Variants** | 6 | 122 | 🔴 **MAJOR: Dev has 116 more** |
| **Payments** | 0 | 11 | ⚠️ Dev has payment records |
| **Webhook Logs** | 13 | 683 | 🔴 **Dev has 670 more webhook logs** |
| **Protected Products** | 12 | 28 | ⚠️ Dev has 16 more |
| **Catering Orders** | 0 | 20 | ⚠️ Dev has catering data |

---

## **🔄 Migration Status Analysis**

### **Production Migrations:** 26 total
- **Latest:** `add_missing_fee_columns_urgent` (2025-09-13)
- **Notable:** Production-specific urgent migrations for fees

### **Development Migrations:** 32 total  
- **Latest:** `add_availability_system` (2025-09-12)
- **Notable:** Includes comprehensive availability system implementation

### **🚨 Key Migration Discrepancies:**
1. **Development is ahead** with 6 more migrations
2. **Availability system migrations** exist only in development
3. **Different migration timing and naming patterns**

---

## **🎯 Critical Issues Identified**

### **🔴 High Priority:**
1. **Missing Availability System in Production**
   - Feature completely missing from production
   - Could impact product management functionality
   - Development has advanced availability rules and scheduling

2. **Significant Data Discrepancy**
   - Development has 6.5x more orders than production
   - Development has 20x more variants
   - This suggests either:
     - Production data was recently cleaned/reset
     - Development has accumulated test data
     - Different data sync processes

### **🟡 Medium Priority:**
1. **Column Type Inconsistency**
   - Timestamp timezone differences could cause issues
   - May affect data synchronization

2. **Missing `usage_flags` Column in Development**
   - Production feature not reflected in development schema

### **🟢 Low Priority:**
1. **Minor row count differences** in categories and profiles
2. **Different webhook activity levels** (expected for environments)

---

## **🔮 Recommendations**

### **Immediate Actions Required:**
1. **Investigate Availability System Deployment**
   - Determine if this feature should be in production
   - Plan migration strategy if needed

2. **Data Synchronization Review**
   - Determine if production data is intentionally minimal
   - Consider data migration strategy if development data is more current

3. **Schema Alignment**
   - Synchronize `usage_flags` column between environments
   - Standardize timestamp column types

### **Monitoring Recommendations:**
1. **Set up automated schema comparison** checks
2. **Implement migration consistency validation**
3. **Regular data volume monitoring** between environments

---

## **📋 Summary**

Your **development database is significantly more advanced** than production, both in terms of schema (availability system) and data volume. This suggests either:
- Development is ahead of production in feature deployment
- Production underwent recent data cleanup
- Different data management strategies between environments

**Next Steps:** Prioritize investigating the availability system deployment status and determining the intended data synchronization strategy between environments.