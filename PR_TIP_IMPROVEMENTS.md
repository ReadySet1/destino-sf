# PR: Fix Tip Selection and Display Issues

## 🎯 Summary

This PR resolves two critical issues related to customer tipping:

1. **DES-41**: Tip pre-selection issue where customers were being charged 15% tips without explicitly choosing
2. **DES-42**: Missing tip amounts in admin panel order details

The solution implements conditional tipping (delivery-only) with 0% default and ensures tip amounts are properly captured and displayed in the admin interface.

## 📋 Changes

### 1. Conditional Tipping Logic (DES-41)

**Files Modified:**
- `src/lib/square/tip-settings.ts`
- `src/app/actions/orders.ts`
- `src/lib/square/checkout-links.ts`

**Implementation:**

- ✅ **Delivery orders** (`local_delivery`): Show tip options (0%, 10%, 15%) with **0% as default**
- ✅ **Pickup orders**: Tip option completely removed
- ✅ **Shipping orders** (`nationwide_shipping`): Tip option completely removed
- ✅ **Catering orders**: Use delivery tip settings (0%, 10%, 15% with 0% default)

**Rationale:**
Tips are meant for delivery drivers. Customers picking up their own orders or receiving shipped items don't need to tip. This prevents confusion and accidental charges.

### 2. Tip Capture and Display (DES-42)

**Files Modified:**
- `src/lib/webhook-handlers.ts`

**Implementation:**

- ✅ Extract `tip_money.amount` from Square payment webhooks
- ✅ Save to `order.gratuityAmount` database field (converted from cents to dollars)
- ✅ Enhanced logging for tip capture debugging
- ✅ Admin panel already displays gratuity when present (no UI changes needed)

**Square Payment Structure:**
```typescript
{
  "amount_money": { "amount": 7245 },  // Base amount in cents
  "tip_money": { "amount": 1083 },     // Tip amount in cents
  "total_money": { "amount": 8328 }    // Total including tip
}
```

## 🧪 Testing Performed

### ✅ Validation
- [x] TypeScript type checking passed
- [x] ESLint linting passed
- [x] Production build successful
- [x] Unit tests passing
- [x] Critical webhook tests passing

### 🔍 Manual Testing Checklist

**Tip Selection (DES-41):**
- [ ] Delivery order shows 0%, 10%, 15% tip options with 0% pre-selected
- [ ] Pickup order shows no tip option
- [ ] Nationwide shipping order shows no tip option
- [ ] Catering order shows 0%, 10%, 15% tip options with 0% pre-selected
- [ ] Customer can change tip selection before checkout
- [ ] Custom tip amount field works correctly

**Tip Display (DES-42):**
- [ ] Create test order with tip via Square sandbox
- [ ] Verify webhook receives `tip_money` in payment object
- [ ] Verify `order.gratuityAmount` saved correctly in database
- [ ] Verify admin panel displays "Gratuity/Tip" line item
- [ ] Verify order total includes tip amount

### 🧪 Test Scenarios

**Scenario 1: Delivery Order with Tip**
1. Add items to cart
2. Select local delivery fulfillment
3. Proceed to checkout
4. Verify tip options show 0%, 10%, 15% (0% pre-selected)
5. Select 10% tip
6. Complete payment via Square
7. Verify webhook captures tip amount
8. Check admin panel shows tip in order details

**Scenario 2: Pickup Order (No Tip)**
1. Add items to cart
2. Select pickup fulfillment
3. Proceed to checkout
4. Verify NO tip option is shown
5. Complete payment
6. Check admin panel order shows no gratuity line item

**Scenario 3: Shipping Order (No Tip)**
1. Add items to cart
2. Select nationwide shipping
3. Proceed to checkout
4. Verify NO tip option is shown
5. Complete payment
6. Check admin panel order shows no gratuity line item

## 🗄️ Database Migrations

**No new migrations required.**

Existing schema already supports tips via `orders.gratuityAmount` field:
```prisma
model Order {
  // ...
  gratuityAmount Decimal @default(0) @map("gratuity_amount") @db.Decimal(10, 2)
  // ...
}
```

## ⚠️ Breaking Changes

**None.** This is a backward-compatible fix:
- Existing orders without tips continue to work (gratuityAmount defaults to 0)
- Existing checkout flows enhanced with better tip control
- No API contract changes
- No environment variable changes

## 📸 Visual Changes

### Before:
- Tip automatically pre-selected at 15% for all order types
- No tip amount visible in admin panel

### After:
- **Delivery orders**: Tip defaults to 0% (customer must explicitly choose)
- **Pickup/Shipping**: No tip option shown
- **Admin panel**: Tip displays as "Gratuity/Tip" line item when present

## 🔧 Technical Details

### Code Quality
- ✅ No new `any` types introduced
- ✅ Proper TypeScript typing throughout
- ✅ Consistent with existing code patterns
- ✅ Production logging follows project conventions
- ✅ Error handling for edge cases

### Files Changed Summary
```
src/app/actions/orders.ts        | 15 +++++++++++----
src/lib/square/checkout-links.ts |  5 +++--
src/lib/square/tip-settings.ts   | 25 +++++++++++++++++++++++++
src/lib/webhook-handlers.ts      | 29 +++++++++++++++++++++++------
4 files changed, 62 insertions(+), 12 deletions(-)
```

### New Functions Added
- `createDeliveryOrderTipSettings()` - 0%, 10%, 15% with 0% default
- `createNoTipSettings()` - Disables tipping entirely

### Modified Functions
- `handlePaymentCreated()` - Now captures tip_money
- `handlePaymentUpdated()` - Now captures tip_money
- `createOrderAndGenerateCheckoutUrl()` - Conditional tip logic based on fulfillment method

## 📝 Reviewer Checklist

- [ ] Code follows TypeScript/Next.js best practices
- [ ] No sensitive data in commits
- [ ] Tests pass and cover new functionality
- [ ] Documentation is clear and accurate
- [ ] No unnecessary console.logs (production logging is intentional)
- [ ] Database schema changes are backward-compatible
- [ ] Error handling is comprehensive
- [ ] Edge cases are handled properly

## 🔗 Related Issues

- Resolves [DES-41](https://linear.app/ready-set-llc/issue/DES-41) - Tip automatically pre-selected at 15%
- Resolves [DES-42](https://linear.app/ready-set-llc/issue/DES-42) - Tip amount not showing in admin panel

## 📚 Additional Context

### Why Conditional Tipping?
The client requested that tips should only be available for delivery orders since:
- Tips are meant for delivery drivers
- Pickup customers don't need to tip (they're picking up themselves)
- Shipping customers don't need to tip (no driver involved)

This approach is cleaner than showing tips for all methods but defaulting to 0%, as it makes the intent explicit and prevents customer confusion.

### Why 0% Default for Delivery?
Previously, tips were pre-selected at 15%, which resulted in customers being charged tips they didn't intentionally choose. By defaulting to 0%, customers must make an explicit choice to add a tip, ensuring informed consent.

### Implementation Decision
We chose to conditionally show/hide the tip option rather than always showing it with 0% default because:
1. **Clarity**: Makes it clear when tipping is appropriate
2. **User Experience**: Prevents confusion about why a tip option exists for pickup/shipping
3. **Best Practices**: Follows Square's recommendations for different fulfillment types
4. **Code Intent**: Explicit conditional logic is easier to understand and maintain

## 🚀 Deployment Notes

1. **No database migrations required** - existing schema supports this
2. **No environment variable changes** - uses existing Square configuration
3. **Backward compatible** - existing orders continue to work
4. **Immediate effect** - tip behavior changes take effect immediately after deployment
5. **Monitoring**: Watch webhook logs for tip capture confirmation (look for `💵 Captured tip amount` logs)

## ✅ Post-Deployment Verification

1. Create test order with each fulfillment method
2. Verify tip options appear correctly
3. Complete test payment with tip on delivery order
4. Check webhook logs for tip capture
5. Verify admin panel shows tip amount
6. Verify order total is correct

---

**Ready for Review** ✨
