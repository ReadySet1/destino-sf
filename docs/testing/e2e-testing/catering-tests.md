# 🎭 Catering Testing Guide - Destino SF

## Overview

This guide covers running the enhanced catering inquiry flow tests, including authentication handling and email notification verification.

## 🔐 Authentication in Tests

### Test User Setup

We've created predefined test users for different scenarios:

```typescript
// Available test users (from tests/e2e/utils/auth-helpers.ts)
const testUsers = {
  admin: {
    email: 'test@destino-sf.com',
    password: 'password123',
    role: 'admin',
  },
  customer: {
    email: 'customer@test.com',
    password: 'password123',
    role: 'customer',
  },
  cateringCustomer: {
    email: 'catering@company.com',
    password: 'password123',
    role: 'customer',
  },
};
```

### Authentication Methods

**1. Login with Credentials:**

```typescript
import { AuthHelpers } from './utils/auth-helpers';

// Login as admin
await AuthHelpers.loginAsAdmin(page);

// Login as customer
await AuthHelpers.loginAsCustomer(page);

// Login as catering customer
await AuthHelpers.loginAsCateringCustomer(page);

// Custom login
await AuthHelpers.loginWithPassword(page, {
  email: 'custom@example.com',
  password: 'password123',
});
```

**2. Handle Different Auth States:**

```typescript
// Check if logged in
const isLoggedIn = await AuthHelpers.isLoggedIn(page);

// Ensure logged out (clean state)
await AuthHelpers.ensureLoggedOut(page);

// Logout current user
await AuthHelpers.logout(page);
```

## 🧪 Running Catering Tests

### Quick Commands

```bash
# Run all enhanced catering tests
pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts

# Run original catering tests
pnpm exec playwright test tests/e2e/04-catering-inquiry.spec.ts

# Run both catering test suites
pnpm exec playwright test --grep "catering"

# Run with UI for debugging
pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts --ui

# Run in headed mode (see browser)
pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts --headed

# Run specific test
pnpm exec playwright test -g "should complete full catering inquiry flow"
```

### Test Scenarios Covered

**Enhanced Catering Test (`06-catering-inquiry-enhanced.spec.ts`):**

1. **Complete Catering Inquiry Flow** ⭐ CRITICAL
   - Navigate to catering page
   - Verify package options and pricing
   - Submit inquiry with test data:
     - Event Date: `2025-07-15`
     - Guest Count: `25`
     - Event Type: `Corporate Event`
     - Special Requests: `Sample special request`
   - Verify form submission success

2. **Form Validation Testing**
   - Test empty form submission
   - Verify required field validation
   - Check error message display

3. **Package Display Verification**
   - Verify all appetizer packages (5, 7, 9)
   - Check pricing format and per-person costs
   - Validate share platters and desserts sections

4. **Contact Information & FAQ**
   - Verify contact details display
   - Test FAQ section interaction
   - Check FAQ content accuracy

5. **Authenticated User Flow**
   - Login as catering customer
   - Test pre-filled form fields
   - Submit inquiry as authenticated user

## 📧 Email Notification Testing

### What Gets Tested

The catering inquiry form triggers two types of notifications:

1. **Admin Notification** (`CATERING_INQUIRY_RECEIVED`)
   - Sent to: `james@destinosf.com` (admin email)
   - Contains: Customer details, event info, special requests
   - Priority: `MEDIUM`

2. **Customer Auto-Response** (`CONTACT_FORM_RECEIVED`)
   - Sent to: Customer's email address
   - Contains: Thank you message, next steps
   - Priority: `LOW`

### Email System Verification

**Current Implementation:**

- Form submission calls `submitCateringInquiry` server action
- Creates `CateringOrder` record in database
- Triggers `AlertService.sendContactFormReceived()`
- Uses Resend API to send emails

**Testing Approach:**

```typescript
// In tests, we verify:
1. Form submission success (no errors)
2. Success message display
3. Form reset after submission
4. Database record creation (if testing backend)

// For email verification in development:
// Check Resend dashboard or logs for sent emails
```

## 🎯 Test Data

### Pre-configured Test Scenarios

**Corporate Event (Default):**

```typescript
{
  contact: {
    name: 'Sarah Wilson',
    email: 'catering@company.com',
    phone: '(555) 246-8135',
    company: 'Tech Startup Inc'
  },
  event: {
    type: 'Corporate Event',
    date: '2025-07-15',
    guestCount: 25,
    specialRequests: 'Vegetarian options needed for 15 guests'
  }
}
```

**Wedding Event:**

```typescript
{
  contact: {
    name: 'Maria Rodriguez',
    email: 'maria@weddingparty.com',
    guestCount: 75
  },
  event: {
    type: 'Wedding Reception',
    specialRequests: 'Mix of traditional and vegetarian empanadas'
  }
}
```

## 🔧 Troubleshooting

### Common Issues

**1. Authentication Failures**

```bash
# If login fails, check:
- Are test users created in your database?
- Is Supabase properly configured?
- Check browser dev tools for auth errors

# Reset auth state:
await AuthHelpers.ensureLoggedOut(page);
```

**2. Form Submission Issues**

```bash
# If form doesn't submit:
- Check network tab for API errors
- Verify form field selectors are correct
- Look for validation errors
- Check server action logs
```

**3. Email Notification Issues**

```bash
# To verify emails are sent:
- Check Resend dashboard (if configured)
- Look at server logs for email send attempts
- Verify RESEND_API_KEY in environment
- Check spam folder for test emails
```

**4. Test Data Issues**

```bash
# If test data doesn't match:
- Update test-data.ts with current content
- Check if catering packages changed
- Verify pricing and text matches current site
```

### Debug Mode

**Run with Debug Information:**

```bash
# Enable verbose logging
DEBUG=pw:test pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts

# Run with trace on failure
pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts --trace on-first-retry

# Run single test with full output
pnpm exec playwright test -g "should complete full catering inquiry flow" --headed --timeout=60000
```

## 📊 Test Results

### Success Criteria

✅ **Navigation & Display**

- Catering page loads without errors
- Package options display correctly
- Pricing shows per-person costs
- Images load properly

✅ **Form Functionality**

- Form accepts valid input
- Validation works for required fields
- Success message appears after submission
- Form resets after successful submission

✅ **Data Verification**

- Contact information displays correctly
- FAQ section works properly
- All package types are visible

✅ **Authentication Integration**

- Login flow works for test users
- Authenticated users can submit inquiries
- Form pre-fills for logged-in users (if implemented)

### Expected Output

```bash
Running 5 tests using 1 worker

✓ should complete full catering inquiry flow with admin notification (15.2s)
✓ should validate catering form fields and show errors (3.1s)
✓ should display all catering package options correctly (2.8s)
✓ should display contact information and FAQ section (2.5s)
✓ should handle catering inquiry with user authentication (8.7s)

5 passed (32.3s)
```

## 🚀 Next Steps

1. **Run the Enhanced Test:**

   ```bash
   pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts
   ```

2. **Verify Email Setup:**
   - Check Resend configuration
   - Test email sending in development
   - Verify admin notification emails

3. **Monitor Results:**
   - Check database for catering orders
   - Verify email logs
   - Test with real email addresses

4. **Extend Testing:**
   - Add email content verification
   - Test with different event types
   - Add mobile responsiveness tests
