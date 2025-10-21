# E2E Test Setup Guide

This document describes the setup required for E2E tests to run successfully.

## Test Database Requirements

### Required Test Users

The E2E tests expect the following users to exist in your test database:

#### 1. Admin Test User
```
Email: test@destino-sf.com
Password: password123
Role: ADMIN
```

#### 2. Regular Test User
```
Email: regular-user@destino-sf.com
Password: password123
Role: CUSTOMER
```

### Creating Test Users

You can create these users using the Supabase dashboard or by running the following SQL:

```sql
-- Create admin test user profile
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
VALUES (
  'test-admin-uuid',  -- Replace with actual Supabase auth user ID
  'test@destino-sf.com',
  'ADMIN',
  NOW(),
  NOW()
);

-- Create regular test user profile
INSERT INTO public.profiles (id, email, role, created_at, updated_at)
VALUES (
  'test-user-uuid',  -- Replace with actual Supabase auth user ID
  'regular-user@destino-sf.com',
  'CUSTOMER',
  NOW(),
  NOW()
);
```

**Note**: You must first create these users in Supabase Auth (via dashboard or auth API), then create corresponding profiles with the UUIDs from Supabase Auth.

## Test Environment Variables

Ensure your `.env.local` or test environment has:

```bash
# Database
DATABASE_URL="your-test-database-url"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Square (Sandbox)
SQUARE_PRODUCTION_TOKEN="your-square-sandbox-token"
SQUARE_LOCATION_ID="your-square-location-id"
```

## Test Product Data

The tests use the following real products from your catalog:

- **Empanadas - Argentine Beef (frozen- 4 pack)**: $17.00
  - Slug: `empanadas-argentine-beef-frozen-4-pack`

- **Alfajores - Classic (1 dozen- packet)**: $14.00
  - Slug: `alfajores-classic-1-dozen-packet`

Make sure these products exist in your database and are active.

## Running Tests

### Run all E2E tests:
```bash
pnpm test:e2e
```

### Run specific test file:
```bash
pnpm test:e2e tests/e2e/03-authentication.spec.ts
```

### Run tests in UI mode:
```bash
pnpm test:e2e:ui
```

## Known Test Skips

The following tests are currently skipped and require implementation:

### Authentication Tests (`03-authentication.spec.ts`)
- ✅ `should register new user` - Active
- ✅ `should login existing user` - Active (requires test user)
- ✅ `should show validation errors for invalid credentials` - Active
- ✅ `should validate email format during registration` - Active
- ✅ `should validate password strength during registration` - Active
- ⏭️ `should validate password confirmation during registration` - **SKIPPED** (no confirm password field)
- ✅ `should protect admin routes for unauthenticated users` - Active
- ⏭️ `should protect admin routes for non-admin users` - **SKIPPED** (requires test users)
- ⏭️ `should allow logout functionality` - **SKIPPED** (requires test users)
- ✅ `should handle forgot password flow` - Active
- ⏭️ `should persist authentication across page reloads` - **SKIPPED** (requires test users)

## Troubleshooting

### Issue: "No such file or directory" errors
**Solution**: Make sure your app is running on `localhost:3000` before running tests.

```bash
pnpm dev
# In another terminal:
pnpm test:e2e
```

### Issue: "Timed out waiting for..." errors
**Solution**:
1. Check that all product slugs in `tests/e2e/fixtures/test-data.ts` match your database
2. Verify the app is accessible at `http://localhost:3000`
3. Check browser console for JavaScript errors

### Issue: "Element not found" errors
**Solution**:
1. Verify `data-testid` attributes exist in components
2. Check that UI elements are visible (not hidden by CSS)
3. Wait for network idle before assertions

### Issue: Authentication tests fail
**Solution**:
1. Create test users in Supabase Auth dashboard
2. Create corresponding profiles in the database
3. Verify user credentials match `test-data.ts`

## Test Data Cleanup

After running tests, you may want to clean up test data:

```sql
-- Delete test orders
DELETE FROM orders WHERE email LIKE '%@example.com';

-- Delete test catering inquiries
DELETE FROM catering_orders WHERE email LIKE '%@example.com';
```

## Future Improvements

- [ ] Automated test user seeding script
- [ ] Test database reset script
- [ ] Mock payment processing for faster tests
- [ ] Parallel test execution
- [ ] Visual regression testing
