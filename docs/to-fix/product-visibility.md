# **Updated Master Plan: Product Visibility Feature**

## 🎯 **Current State Analysis**

### **What's Already Implemented:**
1. **Database Schema** ✅
   - `visibility` field (PUBLIC/PRIVATE)
   - `isAvailable` boolean flag
   - `isPreorder` boolean flag
   - `itemState` field (ACTIVE/INACTIVE/SEASONAL/ARCHIVED)
   - `AvailabilityRule` table with comprehensive rule-based system
   - `AvailabilitySchedule` table for automated scheduling

2. **Availability Management UI** ✅
   - Admin page at `/admin/products/availability`
   - Rule creation and management interface
   - Bulk editor for multiple products
   - Timeline visualization
   - Statistics dashboard

3. **Core Infrastructure** ✅
   - `AvailabilityEngine` for rule evaluation
   - `AvailabilityScheduler` for automated state changes
   - `AvailabilityValidators` for data validation
   - Server actions for CRUD operations

4. **Product Types** ✅
   - Extended Product interface with visibility fields
   - Availability types and enums defined

### **What's Missing/Incomplete:**

## 📋 **Implementation Tasks**

### **Phase 1: Fix Core Visibility Logic** ✅ COMPLETED

#### 1.1 **Fix Product Queries** ✅ COMPLETED (2-3 hours)
**Problem:** The API endpoint `/api/products/route.ts` has visibility filtering but it's not consistently applied across all product queries.

**Tasks:**
- [x] Update all product queries to respect visibility rules
- [x] Ensure availability evaluation is applied in store-facing endpoints
- [x] Add proper caching with visibility consideration
- [x] Test with different visibility states

**Files modified:**
- [x] `/src/app/api/products/route.ts` - Updated to use ProductVisibilityService
- [x] `/src/app/api/products/by-category/[categoryId]/route.ts` - Enhanced with visibility filtering
- [x] `/src/app/(store)/products/category/[slug]/page.tsx` - Integrated unified service

#### 1.2 **Integrate Availability Engine** ✅ COMPLETED (2-3 hours)
**Problem:** The AvailabilityEngine exists but isn't being called consistently in product fetching.

**Tasks:**
- [x] Add availability evaluation to all product queries
- [x] Create a unified product fetching service
- [x] Implement proper caching strategy for evaluated availability
- [x] Add performance monitoring

**New file created:**
- [x] `/src/lib/services/product-visibility-service.ts` - Unified product fetching with visibility rules

### **Phase 2: Complete Square Sync Integration** ✅ COMPLETED

#### 2.1 **Enhance Production Sync** ✅ COMPLETED (3-4 hours)
**Problem:** Square sync doesn't properly handle visibility settings from the API limitation.

**Tasks:**
- [x] Preserve manual visibility overrides during sync
- [x] Add logic to detect pre-order indicators in product names/attributes
- [x] Implement seasonal product detection
- [x] Add sync logging for visibility changes

**Files modified:**
- [x] `/src/lib/square/production-sync.ts` - Enhanced with override preservation and detection
- [x] `/src/lib/products/display-order.ts` - Added unified service integration

#### 2.2 **Add Sync Conflict Resolution** ✅ COMPLETED (2 hours)
**Tasks:**
- [x] Create UI for resolving conflicts between Square and manual settings
- [x] Add audit trail for visibility changes
- [x] Implement rollback mechanism

**New files created:**
- [x] `/src/app/api/admin/sync-conflicts/route.ts` - Conflict detection and resolution API
- [x] `/src/app/api/admin/sync-conflicts/rollback/route.ts` - Rollback mechanism
- [x] `/src/components/admin/sync/SyncConflictManager.tsx` - Admin UI for conflicts
- [x] `/src/app/(dashboard)/admin/sync-conflicts/page.tsx` - Admin page

### **Phase 3: Complete Admin UI Features** 🎨 Priority: Medium

#### 3.1 **Enhance Product Edit Page** (2-3 hours)
**Tasks:**
- [ ] Add availability rule quick-create widget
- [ ] Show current evaluated state in real-time
- [ ] Add preview of future state changes
- [ ] Implement rule conflict warnings

**Files to modify:**
- `/src/app/(dashboard)/admin/products/[id]/page.tsx`

#### 3.2 **Add Visibility Badges to Product List** (1-2 hours)
**Tasks:**
- [ ] Show visibility state badges in admin product list
- [ ] Add quick toggle for availability
- [ ] Implement filter by visibility state
- [ ] Add bulk visibility actions

**Files to modify:**
- `/src/app/(dashboard)/admin/products/page.tsx`

### **Phase 4: Implement Automation** ⚙️ Priority: Medium

#### 4.1 **Background Jobs** (4-5 hours)
**Tasks:**
- [ ] Create cron job for processing scheduled availability changes
- [ ] Implement webhook handler for real-time updates
- [ ] Add job monitoring and error recovery
- [ ] Create admin UI for job management

**New files to create:**
```typescript
// src/app/api/cron/availability/route.ts
// src/lib/jobs/availability-processor.ts
```

#### 4.2 **Notification System** (3-4 hours)
**Tasks:**
- [ ] Email notifications for state changes
- [ ] Admin dashboard alerts
- [ ] Customer waitlist for unavailable items
- [ ] Pre-order reminders

### **Phase 5: Customer-Facing Features** 🛍️ Priority: High

#### 5.1 **Product Display Logic** (2-3 hours)
**Tasks:**
- [ ] Implement "Coming Soon" badge for pre-order items
- [ ] Add "View Only" mode for restricted products
- [ ] Show expected availability dates
- [ ] Implement proper 404 for hidden products

**Files to modify:**
- `/src/components/Products/ProductCard.tsx`
- `/src/components/store/ProductCard.tsx`
- `/src/app/(store)/products/[slug]/page.tsx`

#### 5.2 **Shopping Cart Validation** (2 hours)
**Tasks:**
- [ ] Validate product availability at cart addition
- [ ] Re-validate at checkout
- [ ] Handle availability changes during session
- [ ] Clear messaging for unavailable items

### **Phase 6: Testing & Documentation** ✅ Priority: Critical

#### 6.1 **Testing** (3-4 hours)
**Tasks:**
- [ ] Unit tests for AvailabilityEngine
- [ ] Integration tests for visibility filtering
- [ ] E2E tests for customer journey
- [ ] Performance testing with large rule sets

#### 6.2 **Documentation** (2 hours)
**Tasks:**
- [ ] Admin user guide for visibility management
- [ ] API documentation for visibility endpoints
- [ ] Troubleshooting guide
- [ ] Rule creation best practices

## 🚀 **Recommended Implementation Order**

### **Week 1: Core Functionality**
1. **Day 1-2:** Fix Product Queries (Phase 1.1) + Integrate Availability Engine (Phase 1.2)
2. **Day 3-4:** Customer-Facing Features (Phase 5)
3. **Day 5:** Testing core functionality

### **Week 2: Admin & Automation**
1. **Day 1-2:** Complete Admin UI Features (Phase 3)
2. **Day 3-4:** Square Sync Integration (Phase 2)
3. **Day 5:** Background Jobs setup (Phase 4.1)

### **Week 3: Polish & Deploy**
1. **Day 1-2:** Notification System (Phase 4.2)
2. **Day 3-4:** Complete Testing (Phase 6.1)
3. **Day 5:** Documentation & Deployment

## 🎯 **Success Metrics**
- [ ] All products correctly filtered by visibility rules
- [ ] Admin can create/edit visibility rules without code changes
- [ ] Automated state changes work reliably
- [ ] Zero visibility-related customer complaints
- [ ] Page load time < 200ms with visibility checks

## ⚠️ **Risk Mitigation**
1. **Performance:** Implement aggressive caching for evaluation results
2. **Complexity:** Start with simple rules, add complex ones gradually
3. **Square Sync:** Always preserve manual overrides
4. **User Experience:** Clear messaging about product availability

## 📊 **Estimated Total Time**
- **Core Development:** 35-45 hours
- **Testing & QA:** 8-10 hours
- **Documentation:** 4-5 hours
- **Total:** ~50-60 hours (2-3 weeks with normal pace)

This plan builds upon the existing infrastructure and focuses on completing the integration between all the pieces that are already in place. The key is to ensure consistent visibility evaluation across all product queries and provide a seamless experience for both admins and customers.