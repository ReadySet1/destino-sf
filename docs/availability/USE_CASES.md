# Availability Use Cases

This document details the 5 most common availability scenarios based on analysis of the current codebase and typical e-commerce patterns for Destino SF.

## Use Case Summary

| Use Case            | Frequency | Current Complexity | Primary Pain Point             |
| ------------------- | --------- | ------------------ | ------------------------------ |
| Seasonal Products   | Very High | Medium             | Month/day config + yearly flag |
| Holiday Promotions  | High      | Medium             | Date range priority conflicts  |
| Pre-Order System    | High      | High               | 5+ required fields             |
| Time-Based Hours    | Medium    | Low                | Day/time matrix selection      |
| View-Only Marketing | Medium    | Low                | State selection confusion      |

---

## 1. Seasonal Products

### Frequency: Very High

Products that are only available during specific seasons (e.g., winter empanadas, summer drinks).

### Real-World Scenario

> "We want to sell our Hot Chocolate Alfajores only during winter months (November through February). They should appear in the catalog year-round but only be purchasable during winter."

### Current Admin Workflow

1. Navigate to Admin → Products → Select Product
2. Click "Manage Availability"
3. Click "Create New Rule"
4. Select Rule Type: "SEASONAL"
5. Set State: "AVAILABLE"
6. Configure Start Month: November
7. Configure Start Day: 1
8. Configure End Month: February
9. Configure End Day: 28
10. Enable "Repeats Yearly" checkbox
11. Set Priority (if other rules exist)
12. Add optional message
13. Click Save
14. Create ANOTHER rule for "VIEW_ONLY" for non-winter months
15. Set appropriate priority so rules don't conflict

**Total: 15+ steps, 2 rules required**

### Pain Points

1. **Two rules required**: Need one rule for "available" period and another for "view only" period
2. **Month/day confusion**: Start day 1 and end day 28 are easy to misconfigure
3. **Priority management**: Must understand priority system to avoid conflicts
4. **No visual feedback**: Can't see at a glance which months are covered
5. **Yearly flag buried**: Easy to forget, causes rule to expire

### Proposed Simplified Workflow

1. Navigate to Product → Click "Set Availability"
2. Quick Action: "Seasonal Availability" button
3. Select pattern: "Winter (Nov-Feb)" from presets OR custom month range
4. Confirm: System auto-creates complementary rules
5. Done

**Total: 4 steps, visual calendar shows result immediately**

---

## 2. Holiday Promotions

### Frequency: High

Time-limited availability for holiday specials (Thanksgiving, Christmas, Valentine's Day).

### Real-World Scenario

> "We're offering a special Christmas Empanada Box from December 1-25. After the 25th, it should show as 'Sold Out' until next year."

### Current Admin Workflow

1. Navigate to Admin → Products → Select Product
2. Click "Manage Availability"
3. Click "Create New Rule"
4. Select Rule Type: "DATE_RANGE"
5. Set State: "AVAILABLE"
6. Set Start Date: December 1, 2024
7. Set End Date: December 25, 2024
8. Set Priority: 10 (higher than default)
9. Add message: "Limited holiday special!"
10. Click Save
11. Create ANOTHER rule for after promotion
12. Select Rule Type: "DATE_RANGE"
13. Set State: "SOLD_OUT"
14. Set Start Date: December 26, 2024
15. Set End Date: December 31, 2024 (or whenever)
16. Set Priority: 5
17. Click Save
18. Remember to update NEXT year

**Total: 18+ steps, 2 rules, manual yearly update**

### Pain Points

1. **Manual date entry**: No date picker presets for common holidays
2. **Two rules needed**: Promotion period + post-promotion handling
3. **No recurrence**: Must recreate rules every year
4. **Priority confusion**: Which rule should "win"?
5. **State proliferation**: SOLD_OUT vs COMING_SOON vs VIEW_ONLY?

### Proposed Simplified Workflow

1. Navigate to Product → Click "Set Availability"
2. Quick Action: "Holiday Promotion" button
3. Select holiday: "Christmas" (auto-fills Dec 1-25)
4. Choose post-promotion behavior: "Show as Sold Out"
5. Optional: Enable "Repeat yearly"
6. Done

**Total: 5 steps, holiday presets reduce errors**

---

## 3. Pre-Order System

### Frequency: High

Products available for advance purchase with future delivery date.

### Real-World Scenario

> "We want to take pre-orders for our Thanksgiving Empanada Catering Package. Customers order by November 20, pick up November 27-28. We require a 50% deposit and can only take 50 orders."

### Current Admin Workflow

1. Navigate to Admin → Products → Select Product
2. Click "Manage Availability"
3. Click "Create New Rule"
4. Select Rule Type: "PRE_ORDER"
5. Set State: "PRE_ORDER"
6. Set Pre-Order Start Date: November 1
7. Set Pre-Order End Date: November 20
8. Set Delivery/Pickup Date: November 27
9. Configure Deposit: Enable
10. Set Deposit Type: Percentage
11. Set Deposit Amount: 50
12. Set Maximum Quantity: 50
13. Add Pre-Order Message: "Order now for Thanksgiving pickup!"
14. Set Priority
15. Click Save
16. Create rule for AFTER pre-order window closes
17. Set to VIEW_ONLY or SOLD_OUT

**Total: 17+ steps, many required fields**

### Pain Points

1. **Too many required fields**: Deposit, dates, limits all mandatory-feeling
2. **Date confusion**: Pre-order window vs delivery date vs availability date
3. **No quantity tracking**: Admin must manually track order count
4. **Complex deposit config**: Type + amount + behavior
5. **Message required**: System should have smart default

### Proposed Simplified Workflow

1. Navigate to Product → Click "Set Availability"
2. Select: "Set up Pre-Order"
3. Wizard Step 1: When can customers order? [Nov 1 - Nov 20]
4. Wizard Step 2: When will they receive it? [Nov 27]
5. Wizard Step 3 (optional): Deposit? [50%] Limit? [50 orders]
6. Done - System generates appropriate messaging

**Total: 5 steps, smart defaults for optional fields**

---

## 4. Time-Based Hours

### Frequency: Medium

Products available only during specific hours or days of the week.

### Real-World Scenario

> "Our fresh empanadas are only available for same-day pickup on weekdays between 10am-6pm. Weekend orders are pickup-only on Saturday 10am-2pm."

### Current Admin Workflow

1. Navigate to Admin → Products → Select Product
2. Click "Manage Availability"
3. Click "Create New Rule"
4. Select Rule Type: "TIME_BASED"
5. Set State: "AVAILABLE"
6. Select Days: Monday, Tuesday, Wednesday, Thursday, Friday
7. Set Start Time: 10:00 AM
8. Set End Time: 6:00 PM
9. Set Timezone
10. Set Priority
11. Click Save
12. Create ANOTHER rule for Saturday
13. Repeat steps 5-11 with Saturday, 10am-2pm
14. Create ANOTHER rule for "outside hours" behavior

**Total: 14+ steps, multiple rules for simple schedule**

### Pain Points

1. **Multiple rules for one schedule**: Weekdays + Saturday = 2 rules minimum
2. **No visual schedule**: Hard to see full week at a glance
3. **Timezone complexity**: Easy to misconfigure
4. **Day selection tedious**: Clicking 5 checkboxes for "weekdays"
5. **Outside-hours behavior**: Need additional rule for "what happens at 7pm?"

### Proposed Simplified Workflow

1. Navigate to Product → Click "Set Availability"
2. Select: "Set Hours"
3. Visual weekly schedule (like Google Calendar availability)
4. Drag to paint available hours
5. Or use preset: "Business Hours" / "Weekend Only"
6. Done - System handles "outside hours" automatically

**Total: 4 steps, visual schedule builder**

---

## 5. View-Only Marketing

### Frequency: Medium

Products shown in catalog for marketing/awareness but not purchasable.

### Real-World Scenario

> "We want to showcase our upcoming Spring Collection. Customers should see the products and sign up for notifications, but can't purchase yet."

### Current Admin Workflow

1. Navigate to Admin → Products → Select Product
2. Click "Manage Availability"
3. Click "Create New Rule"
4. Decide between: VIEW_ONLY vs COMING_SOON vs HIDDEN
5. (Confusion about which state to use)
6. Select State: "COMING_SOON" (probably?)
7. Select Rule Type: "ALWAYS_AVAILABLE" (confusing name for non-available)
8. Or select DATE_RANGE if launch date known
9. Add message: "Coming Spring 2025!"
10. Enable "Notify When Available" (if it exists?)
11. Set Priority
12. Click Save

**Total: 12 steps, state confusion is main issue**

### Pain Points

1. **State confusion**: VIEW_ONLY vs COMING_SOON vs SOLD_OUT - what's the difference?
2. **Misleading rule type**: "ALWAYS_AVAILABLE" for a non-available product?
3. **No clear "notify me" integration**: Separate system?
4. **Message is afterthought**: Should be prominent
5. **No preview**: Can't see how it looks to customers

### Proposed Simplified Workflow

1. Navigate to Product → Click "Set Availability"
2. Select: "Not Available"
3. Select reason: "Coming Soon" / "Sold Out" / "Seasonal" / "Other"
4. Auto-generated message based on reason (editable)
5. Toggle: "Allow notification signup" [Yes/No]
6. Done

**Total: 5 steps, clear reason selection**

---

## Cross-Cutting Pain Points

Issues that affect multiple use cases:

### 1. State Proliferation

- 7 states with subtle differences
- Admin doesn't know which to choose
- Some states have identical customer-facing behavior

### 2. Rule Priority System

- Numeric priority is confusing
- Higher vs lower priority? (currently: higher number = higher priority)
- Conflicts aren't visible until they happen

### 3. No Bulk Operations

- Can't set multiple products to same availability
- Each product requires individual configuration
- Copy/paste rules not possible

### 4. No Preview

- Can't see how customer will experience the product
- Must save, then check storefront, then edit if wrong

### 5. Form Overwhelm

- 15+ fields visible at once
- Not clear which are required vs optional
- No progressive disclosure

---

## Recommended Quick Actions

Based on use case analysis, these operations should be one-click:

| Quick Action            | Use Cases Addressed | Default Behavior                          |
| ----------------------- | ------------------- | ----------------------------------------- |
| "Mark as Sold Out"      | 2, 5                | State: Not Available, Reason: Sold Out    |
| "Set Coming Soon"       | 5                   | State: Not Available, Reason: Coming Soon |
| "Make Available Now"    | All                 | Remove restrictions, State: Available     |
| "Set Up Pre-Order"      | 3                   | Opens wizard with pre-order preset        |
| "Seasonal Availability" | 1                   | Opens wizard with season selector         |

---

## Summary

The current system requires **10-18 steps** for common operations that should take **3-5 steps**.

Key simplification opportunities:

1. **Reduce states** from 7 to 4
2. **Add presets** for common patterns (holidays, seasons)
3. **Visual scheduling** instead of form fields
4. **Smart defaults** reduce required input
5. **Quick actions** for common operations
