# Manual QA Checklist — PR #139

**PR:** Q2 2026 Audit: Security, Performance, Testing & Code Quality
**Branch:** development → main

---

## Pre-Merge (Test on Current Production)

### Customer-Facing Pages
- [x] **Homepage** — loads correctly, featured products display
- [x] **Products page** (`/products`) — all products visible, images load
- [x] **Product detail** — click into any product, verify details + "Add to Cart" works
- [x] **Category pages** (`/products/category/empanadas`) — products filter correctly
- [x] **Menu page** (`/menu`) — full menu renders
- [x] **About page** (`/about`) — content displays
- [x] **Contact page** (`/contact`) — form submits successfully (use test data)

### Checkout Flow (Critical Path)
- [ ] **Add items to cart** — add 2-3 different products
- [ ] **Open cart** — verify items, quantities, and totals are correct
- [ ] **Go to checkout** — page loads, form fields appear
- [ ] **Complete a test purchase** — use Square sandbox card `4111 1111 1111 1111`, any future date, any CVV
- [ ] **Order confirmation** — confirmation page displays with order details

### Admin Dashboard
- [ ] **Login as admin** — redirects to admin dashboard
- [ ] **Products list** — loads and displays all products
- [ ] **Orders list** — loads and displays orders
- [ ] **Trigger a product sync** — starts without errors
- [ ] **Archive/unarchive a product** — works correctly

### Auth
- [ ] **Sign in** — login with existing account works
- [ ] **Sign up** — create new account works
- [ ] **Account page** (`/account`) — shows order history after login
- [ ] **Sign out** — logs out and redirects properly

---

## Post-Merge (Test After Deploy)

### Customer-Facing (Verify Nothing Broke)
- [ ] **Homepage** — loads, no blank screen, featured products show
- [ ] **Products page** — all products visible
- [ ] **Product detail** — any product page loads correctly
- [ ] **Menu page** — renders fully
- [ ] **About / Contact / Privacy / Terms** — all load (these now have ISR caching)

### Checkout Flow (Most Critical)
- [ ] **Full purchase flow** — cart → checkout → payment → confirmation
- [ ] **Checkout loading state** — briefly see smooth skeleton animation before form appears (NEW)
- [ ] **Products loading state** — briefly see skeleton on `/products` before content appears (NEW)

### Deleted Routes (Verify They Return 404)
- [ ] `/api/debug/database` → **404**
- [ ] `/api/debug/square-config` → **404**
- [ ] `/api/test-email` → **404**
- [ ] `/api/prisma-test` → **404**
- [ ] `/api/square/test-connection` → **404**

### Admin Security (Verify Auth Guards)
- [ ] **Incognito window** (not logged in): `/api/admin/settings` → **401**
- [ ] **Incognito window** (not logged in): `/api/admin/orders/list` → **401**
- [ ] **Regular customer account**: `/api/admin/settings` → **403**
- [ ] **Admin account**: admin routes work normally

### Contact Form (Rate Limiting Changed)
- [ ] **Submit contact form** — works normally
- [ ] **Submit 5+ times rapidly** — gets rate-limited (doesn't crash)

### Performance (Visual Check)
- [ ] **Admin dashboard** — loading skeleton appears briefly before content (NEW)
- [ ] **Admin orders** — loading skeleton appears briefly before content (NEW)
- [ ] **Admin products** — loading skeleton appears briefly before content (NEW)
- [ ] **Checkout page** — header loads instantly, form streams in (NEW)

---

## Quick Smoke Test (10 Minutes)

If short on time, do these 5 checks:

1. [ ] **Homepage loads** — no errors
2. [ ] **Buy something** — full checkout with test card `4111 1111 1111 1111`
3. [ ] **Admin dashboard loads** — logged in as admin
4. [ ] **`/api/debug/database` returns 404** — deleted routes are gone
5. [ ] **`/api/admin/settings` returns 401 in incognito** — auth guards work
