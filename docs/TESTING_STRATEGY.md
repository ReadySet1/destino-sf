# Testing Strategy for 90% Coverage

## Current Status
- **Total Tests**: 302 tests
- **Passing**: 294 tests (97.4%)
- **Failing**: 8 tests (2.6%)
- **Current Coverage**: ~3.73% (needs significant improvement)

## Failing Tests to Fix

### 1. Supabase Mocking Issues (3 tests)
- **File**: `src/__tests__/app/api/admin/orders.test.ts`
- **Issue**: `userProfile.data?.role` is undefined because mock isn't returning expected structure
- **Fix**: Update Supabase mocks to return proper data structure

### 2. Email Test Issues (2 tests)  
- **File**: `src/__tests__/app/api/orders/create.test.ts`
- **Issue**: `customerName` and `to` email are undefined in email calls
- **Fix**: Ensure test data includes proper customer information

### 3. Formatting Test Issues (3 tests)
- **File**: `src/__tests__/utils/formatting.test.ts`
- **Issues**: 
  - Error logging not being called when expected
  - Intl.NumberFormat mocking issues
  - Timezone-dependent date formatting failures
- **Fix**: Mock error handling properly and use timezone-agnostic date tests

## Priority Areas for New Tests

### High Priority (Critical Business Logic)
1. **Payment Processing** - `src/lib/square/`
2. **Order Management** - `src/app/actions/orders.ts`
3. **Cart Logic** - `src/store/cart.ts`, `src/utils/cart-helpers.ts`
4. **Shipping Calculations** - `src/lib/shippingUtils.ts` (already 100% covered ✅)
5. **Authentication** - `src/app/actions/auth.ts`

### Medium Priority (Core Features)
1. **Product Management** - `src/app/actions/`
2. **Email Service** - `src/lib/email.ts`
3. **Image Processing** - `src/lib/image-utils.ts`
4. **Database Operations** - `src/lib/db.ts`, `src/lib/prisma.ts`

### Low Priority (UI/Components)
1. **React Components** - Focus on core business logic components
2. **Utility Functions** - Many already have good coverage

## Implementation Plan

### Phase 1: Fix Existing Failing Tests (Week 1)
- [x] ✅ Fix serialization utility (COMPLETED)
- [ ] Fix Supabase mocking in admin tests
- [ ] Fix email service tests
- [ ] Fix formatting timezone issues

### Phase 2: Core Business Logic Tests (Week 2)
- [ ] Add comprehensive tests for `src/lib/square/` modules
- [ ] Add tests for order creation and management
- [ ] Add tests for cart functionality
- [ ] Add tests for authentication flows

### Phase 3: API Route Tests (Week 3)  
- [ ] Test all API routes in `src/app/api/`
- [ ] Test error handling and edge cases
- [ ] Test authorization and validation

### Phase 4: Integration Tests (Week 4)
- [ ] Database integration tests
- [ ] Payment processing integration
- [ ] Email service integration
- [ ] End-to-end workflow tests

## Coverage Targets

### Current File Coverage Analysis
```
HIGH COVERAGE ALREADY:
- src/lib/deliveryUtils.ts: 100% ✅
- src/lib/shippingUtils.ts: 100% ✅  
- src/lib/dateUtils.ts: 89%+ ✅
- src/utils/serialization.ts: 63%+ (improving)

NEEDS IMMEDIATE ATTENTION:
- src/app/actions/orders.ts: 9.39%
- src/lib/square/*: 0.43%
- src/lib/email.ts: 0%
- src/store/*: 0%
- src/app/api/*: mostly 0%
```

### Target Coverage by Phase
- **Phase 1 End**: 20-30% coverage
- **Phase 2 End**: 50-60% coverage  
- **Phase 3 End**: 75-85% coverage
- **Phase 4 End**: 90%+ coverage

## Testing Standards

### Test Structure
- Use descriptive test names
- Group related tests in describe blocks
- Include positive, negative, and edge case tests
- Mock external dependencies properly
- Use proper setup and teardown

### Mocking Strategy
- Mock database calls consistently
- Mock external APIs (Square, Supabase, email)
- Use dependency injection where possible
- Keep mocks simple and focused

### Coverage Rules
- Aim for 90%+ line coverage
- Aim for 85%+ branch coverage
- Focus on business logic over UI code
- Exclude config files and dev scripts from coverage

## Commands for Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test types
pnpm test:unit
pnpm test:components
pnpm test:api

# Run specific test files
pnpm jest src/__tests__/lib/orders.test.ts
```

## Next Steps

1. **Immediate**: Fix the 8 failing tests
2. **This Week**: Start Phase 2 with Square API and order management tests
3. **Ongoing**: Monitor coverage with each PR
4. **Target**: Reach 90% coverage within 4 weeks 