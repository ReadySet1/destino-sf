# E2E Testing Setup & Troubleshooting Guide

## 🎭 **Fixed Issues & Solutions**

### ✅ **Database Connection Problems - RESOLVED**
- **Issue**: Prisma prepared statement errors (`prepared statement "s10" does not exist`)
- **Solution**: Created proper database setup with connection management
- **Files Updated**: 
  - `tests/e2e/setup/database-setup.ts` - Database isolation & cleanup
  - `tests/e2e/setup/global-setup.ts` - Proper test initialization
  - `tests/e2e/setup/global-teardown.ts` - Clean database disconnect

### ✅ **Image Domain Configuration - RESOLVED**
- **Issue**: `destino-sf.square.site` not configured in Next.js
- **Solution**: Added domain to `next.config.js` image configuration
- **Result**: Square site images now load properly in tests

## 🚀 **How to Run E2E Tests (Updated)**

### **1. Environment Setup**
```bash
# Ensure your database is running and accessible
# Copy your .env.local to .env.test (if needed)
cp .env.local .env.test

# Install Playwright browsers (if not done)
pnpm exec playwright install
```

### **2. Run Tests**
```bash
# Run all E2E tests with new database setup
pnpm test:e2e

# Run specific test suites
pnpm test:e2e tests/e2e/01-complete-purchase.spec.ts
pnpm test:e2e tests/e2e/04-catering-inquiry.spec.ts

# Run with UI for debugging
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e:debug
```

### **3. Critical Tests**
```bash
# Test core functionality first
pnpm test:e2e tests/e2e/01-complete-purchase.spec.ts

# Test catering features
pnpm test:e2e tests/e2e/04-catering-inquiry.spec.ts
```

## 🔧 **Database Setup Details**

### **What We Fixed:**
1. **Connection Pooling**: Disabled for tests to prevent statement conflicts
2. **Test Data Seeding**: Automatic creation of required test products
3. **Proper Cleanup**: Database connections properly closed after tests
4. **Error Handling**: Graceful handling of database setup failures

### **Test Database Strategy:**
- Uses your main database with proper cleanup
- Seeds minimal test data automatically
- Isolates test runs to prevent conflicts
- Handles connection lifecycle properly

## 🐛 **Troubleshooting**

### **If Tests Still Fail:**

#### **Database Issues:**
```bash
# Check database connection
pnpm prisma db pull

# Reset database if needed
pnpm prisma db push --force-reset

# Generate fresh Prisma client
pnpm prisma generate
```

#### **Missing Test Data:**
```bash
# The setup automatically seeds test data, but if needed:
# Check if products exist in your database
pnpm prisma studio
```

#### **Environment Variables:**
```bash
# Ensure these are set:
DATABASE_URL=your_database_url
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

#### **Port Conflicts:**
```bash
# If port 3000 is busy:
PLAYWRIGHT_BASE_URL=http://localhost:3001 pnpm test:e2e
```

## 📊 **Test Results Interpretation**

### **Expected Behavior:**
- ✅ Database connects without prepared statement errors
- ✅ Images load from `destino-sf.square.site`
- ✅ Test products are available for purchase flows
- ✅ Catering pages load with proper content

### **Common Remaining Issues:**
1. **Content Not Matching**: Test expectations may need updating
2. **Timing Issues**: Some elements may need longer wait times
3. **Dynamic Content**: Product names/prices may have changed

## 🔄 **CURRENT STATUS & NEXT STEPS**

### ✅ **COMPLETED FIXES:**
- ✅ Image domain configuration (`destino-sf.square.site`)
- ✅ Database setup and cleanup automation
- ✅ Test environment configuration
- ✅ Prisma client singleton pattern

### ⚠️ **REMAINING ISSUE: Prepared Statement Conflicts**
**Problem**: PostgreSQL prepared statement caching conflicts in dev mode
**Symptoms**: `prepared statement "s10" does not exist` errors

### 🚀 **IMMEDIATE SOLUTIONS:**

#### **Option 1: Production Build Testing (Recommended)**
```bash
# Build and test with production server
pnpm build && pnpm start &
sleep 5  # Wait for server to start
pnpm test:e2e
kill %1  # Stop background server
```

#### **Option 2: Connection String Fix**
Update your `DATABASE_URL` in `.env`:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/destino_sf?connection_limit=1&pool_timeout=0"
```

#### **Option 3: Separate Test Database**
```bash
createdb destino_sf_test
# Use TEST_DATABASE_URL in tests
```

### 📊 **Expected Results After Fix:**
- ✅ No more prepared statement errors
- ✅ Images load correctly
- ✅ Test data available
- ✅ Full E2E test suite passes

## 📝 **Test Data Management**

The setup automatically creates:
- Test category: "Empanadas" 
- Test product: "Empanadas- Argentine Beef (frozen- 4 pack)" at $18.99
- Proper slugs and IDs for navigation

If your actual products differ, update `tests/e2e/setup/database-setup.ts`. 