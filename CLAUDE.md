# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Package Management
**Always use `pnpm` as the package manager** (never npm or yarn):
```bash
pnpm install                    # Install dependencies
pnpm add <package>             # Add new dependency
pnpm dev                        # Start development server on localhost:3000
pnpm dev:turbo                 # Start dev server with Turbopack (faster)
```

### Building & Type Checking
```bash
pnpm build                      # Production build (includes prisma generate)
pnpm type-check                # TypeScript validation
pnpm typecheck-build           # Type check + build
pnpm validate                  # Type check + lint
```

### Testing
```bash
pnpm test                       # Run all tests
pnpm test:critical             # Critical path tests (payment, orders, checkout)
pnpm test:coverage             # Tests with coverage report
pnpm test:unit                 # Unit tests only (lib, utils)
pnpm test:components           # Component tests (jsdom)
pnpm test:api                  # API route tests
pnpm test:e2e                  # Playwright E2E tests
pnpm test:e2e:critical         # Critical E2E flows
pnpm test:watch                # Watch mode

# Run a single test file
pnpm test:basic                # Example: basic utils test
jest --selectProjects node path/to/test.test.ts --no-cache
```

### Database Operations
```bash
pnpm prisma generate           # Generate Prisma client
pnpm prisma db push            # Push schema changes to database
pnpm prisma studio             # Open Prisma Studio (database GUI)
pnpm db:seed                   # Seed database with initial data
pnpm db:reset                  # Reset database (WARNING: destructive)
```

### Code Quality
```bash
pnpm lint                      # Run ESLint
pnpm lint:fix                  # Auto-fix linting issues
pnpm format                    # Format with Prettier
```

### Square Product Sync
```bash
pnpm square-sync               # Sync products from Square catalog
pnpm square-sync-api           # Trigger sync via API endpoint
```

### Utility Scripts
```bash
pnpm diagnose-db               # Diagnose database connection issues
pnpm validate-db               # Validate database configuration
pnpm clean-orders:preview      # Preview order cleanup (dry-run)
pnpm backup-db                 # Backup database
```

## Project Architecture

### Tech Stack Core
- **Framework**: Next.js 15 (App Router with Server Components)
- **Language**: TypeScript 5.7 (strict mode)
- **Database**: PostgreSQL with Prisma ORM
- **State Management**: Zustand (cart state)
- **Styling**: Tailwind CSS with custom design tokens
- **Testing**: Jest (unit/integration) + Playwright (E2E)
- **Package Manager**: pnpm 10.17+

### Application Layers

#### 1. Data Layer (`src/lib/`)
Business logic and data access patterns:
- **`db-unified.ts`**: Centralized database client (use this for all DB operations)
- **`db-connection-manager.ts`**: Connection pooling and management
- **Square Integration** (`src/lib/square/`):
  - `catalog-api.ts`: Product catalog sync
  - `payments-api.ts`: Payment processing
  - `orders-api.ts`: Order management
- **Shipping** (`shippingUtils.ts`, `deliveryUtils.ts`): Weight-based calculations via Shippo
- **Catering** (`catering-api-utils.ts`): Catering order handling
- **Security** (`src/lib/security/`): Rate limiting, CSP, webhook verification

#### 2. API Layer (`src/app/api/`)
RESTful API routes following Next.js 15 App Router conventions:
- **Checkout** (`checkout/`): Payment processing and order creation
- **Orders** (`orders/`): Order CRUD operations
- **Catering** (`catering/`): Catering inquiry and order management
- **Square** (`square/`): Square webhook handlers and sync operations
- **Products** (`products/`): Product catalog operations
- **Admin** (`admin/`): Admin-only operations (protected routes)
- **Webhooks** (`webhooks/`): External service webhook handlers

#### 3. State Management (`src/store/`)
Zustand stores for client-side state:
- **`cart.ts`**: Regular shopping cart (separate from catering)
- **`catering-cart.ts`**: Catering cart with package management
- **`useCartStore.ts`**: Cart hook and utilities

**CRITICAL**: Regular and catering carts are completely separate systems with different flows.

#### 4. Component Architecture (`src/components/`)
Organized by feature domain:
- **Admin** (`admin/`): Admin dashboard, product management, order management
- **Catering** (`Catering/`): Catering menu, packages, inquiry forms
- **Products** (`products/`): Product cards, catalog display
- **Cart & Checkout** (`cart/`, `checkout/`): Shopping experience
- **UI Primitives** (`ui/`): Radix UI components with Tailwind styling
- **Layout** (`Navbar/`, `Footer/`, `Landing/`): Site structure

### Key Business Logic Patterns

#### Shopping Cart System
**Two separate cart systems** (never mix them):
1. **Regular Cart** (`src/store/cart.ts`):
   - Individual product purchases
   - Supports pickup, delivery, and nationwide shipping
   - Integrates with Shippo for shipping calculations

2. **Catering Cart** (`src/store/catering-cart.ts`):
   - Catering packages and à-la-carte items
   - Delivery zone-based pricing (SF, South Bay, Peninsula)
   - Minimum order requirements per zone
   - Event date and attendee count tracking

#### Payment Processing Flow
1. Cart → Checkout page validates cart contents
2. Customer enters details (name, email, phone, fulfillment)
3. **Square Payment Form** (for credit cards) OR Venmo/Cash instructions
4. Order created in database with PENDING status
5. Payment processed via Square API (`src/lib/square/payments-api.ts`)
6. Order status updated, confirmation email sent
7. Webhook handlers (`src/app/api/webhooks/square/`) process async updates

#### Product Sync System
**Hybrid Mode**: Production catalog with sandbox payment testing
- Products sync from Square catalog API
- **Image Protection**: Catering images are NEVER overwritten during sync
- Sync logs tracked in `sync_logs` and `sync_history` tables
- Protected products list prevents accidental deactivation
- Manual overrides preserved via `syncLocked` field

#### Shipping Calculations
Weight-based shipping via Shippo API:
- **Alfajores**: 0.5lb base + 0.4lb per unit
- **Empanadas**: 1.0lb base + 0.8lb per unit
- Real-time rate quotes from USPS, UPS, FedEx
- Shipping configurations in `shipping_configurations` table

### Database Schema Highlights

#### Core Tables
- **`products`**: Product catalog with Square sync tracking
  - Availability fields: `isAvailable`, `isPreorder`, date ranges
  - Sync fields: `syncLocked`, `syncStatus`, `squareVersion`
  - Validation: `mappingStatus`, `correctDescription`

- **`orders`**: Regular orders with comprehensive tracking
  - Status: PENDING → PROCESSING → COMPLETED/CANCELLED
  - Payment tracking: `paymentStatus`, `paymentMethod`
  - Fulfillment: `fulfillmentType`, shipping details
  - Archival: `isArchived`, `archiveReason` (soft delete pattern)

- **`catering_orders`**: Catering-specific orders
  - Event management: `eventDate`, `numberOfPeople`
  - Zone-based delivery: `deliveryZone`, `deliveryFee`
  - Package tracking via `catering_order_items`

- **`profiles`**: User accounts (Supabase Auth integration)
  - Roles: CUSTOMER, ADMIN
  - Relations to orders, catering orders, preferences

#### Advanced Features
- **Product Availability Rules** (`availability_rules`): Seasonal, pre-order, time-based availability
- **Spotlight Picks** (`spotlight_picks`): Featured products on homepage
- **Webhook Queue** (`webhook_queue`): Reliable webhook processing with retry logic
- **Email Alerts** (`email_alerts`): Transactional email tracking

### Authentication & Authorization
- **Supabase Auth** for user authentication
- **Middleware** (`src/middleware.ts`): Route protection
- **Admin Guards** (`src/lib/auth/admin-guard.ts`): Role-based access control
- **Session Management**: Server-side session handling with cookies

### Environment Configuration
Environment variables are critical. Key ones:
- `DATABASE_URL`: PostgreSQL connection string
- `SQUARE_PRODUCTION_TOKEN`: Square API access token
- `SQUARE_LOCATION_ID`: Square location identifier
- `RESEND_API_KEY`: Transactional email service
- `NEXT_PUBLIC_APP_URL`: Application base URL
- `SHIPPO_API_TOKEN`: Shipping rate calculations

See `.env.example` and `docs/ENV_TEMPLATE_SQUARE.md` for complete setup.

## Critical Development Rules

### 1. Database Safety
**NEVER reset or truncate the database without explicit user confirmation.**
- Always ask before destructive operations (DROP, TRUNCATE, DELETE ALL)
- Explain what data will be lost
- Suggest backup options
- Use Supabase MCP tools to check data first

### 2. Cart System Integrity
**Never mix regular and catering cart logic.**
- They have different data structures, flows, and business rules
- Regular cart: `useCartStore` from `src/store/cart.ts`
- Catering cart: `useCateringCartStore` from `src/store/catering-cart.ts`

### 3. Product Sync Protection
**Catering images must never be overwritten during Square sync.**
- Check `syncLocked` field before modifying products
- Catering products have manually curated images
- Sync logic in `src/lib/square/catalog-api.ts` respects these protections

### 4. Payment Testing
**Use Square Sandbox for payment testing, never test with production payments.**
- Test card: `4111 1111 1111 1111`, any future expiration, any CVV
- Hybrid mode: production catalog + sandbox payments
- Verify environment in Square API calls

### 5. Type Safety
**Maintain strict TypeScript standards.**
- No `any` types without justification
- Use Zod schemas for runtime validation
- Prisma types for database operations
- Type guards in `src/lib/type-guards.ts`

### 6. Testing Requirements
**Write tests for all new features.**
- Unit tests: `src/__tests__/lib/`, `src/__tests__/utils/`
- Component tests: `src/__tests__/components/`
- API tests: `src/__tests__/app/api/`
- Critical path coverage required for checkout, payments, orders

### 7. API Design Standards
- Use proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
- Implement error handling with structured responses
- Rate limiting via Upstash Redis (`src/lib/security/rate-limiter.ts`)
- Validate input with Zod schemas
- Log errors with context for debugging

### 8. Component Patterns
- Accessibility-first design (ARIA labels, keyboard navigation)
- Use Radix UI primitives from `src/components/ui/`
- Implement loading states and error boundaries
- Handle empty states gracefully
- Follow atomic design principles

### 9. Performance Considerations
- Use Server Components by default (Next.js 15)
- Client Components only when needed (interactivity, state)
- Optimize database queries with proper indexes
- Implement caching via Redis (`src/lib/cache/redis-service.ts`)
- Monitor with indexed queries (see Prisma schema indexes)

### 10. Package Management
**Always use `pnpm` commands, never npm or yarn.**
- Development server runs on port 3000
- Do NOT suggest starting new servers (assume already running)
- Reference localhost:3000 for testing

### 11. Git Merge Strategy
**ALWAYS use "Rebase and merge" when merging PRs, NEVER "Squash and merge".**
- ✅ Preferred: "Rebase and merge" button in GitHub
- ✅ Alternative: "Create a merge commit" for preserving merge history
- ❌ NEVER: "Squash and merge" - causes branch divergence
- Why: Squashing creates new commit hashes that make development branch diverge from main, accumulating "X commits ahead" problem
- When creating PRs via gh CLI or GitHub UI, explicitly select "Rebase and merge"

## Common Workflows

### Adding a New Product Feature
1. Update Prisma schema if database changes needed
2. Run `pnpm prisma generate` and `pnpm prisma db push`
3. Update Square sync logic if Square integration affected
4. Create/update API routes in `src/app/api/`
5. Implement business logic in `src/lib/`
6. Create UI components in `src/components/`
7. Write tests (unit + integration + E2E)
8. Run `pnpm validate` before committing

### Debugging Payment Issues
1. Check environment variables (Square tokens, location ID)
2. Verify Square API environment (sandbox vs production)
3. Check webhook logs: `webhook_logs` table
4. Review payment sync status: `payment_sync_status` table
5. Test with Square sandbox card: `4111 1111 1111 1111`
6. Check order status and payment status in database

### Investigating Order Problems
1. Query orders table: filter by status, email, or date
2. Check related tables: `order_items`, `payments`, `refunds`
3. Review email alerts: `email_alerts` table for delivery failures
4. Check webhook queue: `webhook_queue` for processing issues
5. Examine sync logs: `sync_logs` for catalog sync problems

### Testing Before Deployment
```bash
pnpm test:critical          # Must pass
pnpm type-check            # Must pass
pnpm build                 # Must succeed
pnpm test:e2e:critical     # Must pass
```

### Git Workflow & Pre-Merge Checks

#### Installing Local Git Hooks (Recommended)
Run the install script to enable automatic pre-commit and pre-push validation:
```bash
./scripts/install-git-hooks.sh
```

This installs two hooks:
- **pre-commit**: Type checking, linting, and formatting validation
- **pre-push**: Build verification and critical tests

**To bypass hooks** (emergencies only):
```bash
git commit --no-verify
git push --no-verify
```

#### Automated PR Validation
**For PRs to `development` branch:**
- GitHub Actions automatically runs comprehensive validation
- All checks must pass before merging
- TypeScript compilation, linting, formatting
- Full test suite (unit, critical, API, component)
- Production build verification
- Database schema validation
- Security audit

**For PRs to `main` branch:**
- Full pre-deployment checklist runs
- Includes E2E tests
- Deployment approval gate
- Creates deployment issue for production releases

#### Manual Pre-Merge Validation
Before creating a PR, run these checks locally:
```bash
# Quick validation
pnpm validate              # Type check + lint

# Full validation (matches CI)
pnpm type-check
pnpm lint
pnpm format --check
pnpm build
pnpm prisma validate
pnpm test:unit
pnpm test:critical
pnpm test:api
pnpm test:components
```

#### Creating a Pull Request
1. **Create feature branch**: `git checkout -b feature/your-feature`
2. **Commit changes**: Use descriptive commit messages
3. **Run local validation**: `pnpm validate && pnpm test:critical`
4. **Push branch**: `git push -u origin feature/your-feature`
5. **Create PR**: Use GitHub UI or `gh pr create`
6. **Wait for CI**: All automated checks must pass
7. **Code review**: Address feedback from reviewers
8. **Merge**: **ALWAYS use "Rebase and merge"** or "Create a merge commit" (NEVER "Squash and merge")

**IMPORTANT - Merge Strategy:**
- ✅ **Preferred**: "Rebase and merge" - keeps individual commits, clean linear history
- ✅ **Alternative**: "Create a merge commit" - preserves all history with merge commit
- ❌ **NEVER USE**: "Squash and merge" - causes branch divergence and accumulates "X commits ahead" issues

**Why avoid squash?** Squashing creates new commit hashes that diverge the development branch from main, causing the "development is XX commits ahead of main" problem even after merging.

**PR Best Practices:**
- Keep PRs focused and reasonably sized
- Write clear PR descriptions
- Link related issues
- Include screenshots for UI changes
- Document breaking changes and migrations
- Add tests for new functionality

## Additional Resources
- Comprehensive documentation in `docs/` directory
- Test infrastructure details: `docs/PHASE_5_TEST_INFRASTRUCTURE_SUMMARY.md`
- Catering system: `docs/README_CATERING.md`
- Square setup: `docs/SQUARE_TOKEN_SETUP.md`
- Shipping integration: `docs/ENHANCED_SHIPPO_INTEGRATION.md`