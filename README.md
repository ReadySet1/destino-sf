# 🥟 Destino SF — Premium Argentine Cuisine & Catering Platform

**San Francisco's premier destination for authentic Argentine empanadas, alfajores, and professional catering services.**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## 🌟 Platform Features

### 🛒 **E-commerce Store**

- **Product Catalog**: Authentic Argentine empanadas, alfajores, beverages
- **Smart Shopping Cart**: Cross-session persistence with intelligent item management
- **Secure Checkout**: Square integration with multiple payment methods (Venmo, Cash)
- **Order Management**: Real-time status tracking and email confirmations
- **Dynamic Shipping**: Weight-based calculations optimized for nationwide delivery

### 🍽️ **Professional Catering Services**

- **Package Selection**: Appetizer packages (5, 7, 9 items) with per-person pricing
- **À-la-carte Menu**: Share platters, desserts, and custom selections
- **Delivery Zones**: San Francisco, South Bay, Peninsula with minimum order requirements
- **Event Management**: Custom quotes, special requests, and lead generation
- **Image Protection**: Curated catering images preserved during product syncs

### 💳 **Advanced Payment Processing**

- **Square Integration**: Production-grade payment processing
- **Multiple Methods**: Credit cards, Venmo instructions, cash for pickup
- **Hybrid Mode**: Production catalog with sandbox payment testing
- **Error Handling**: Comprehensive gift card and payment validation
- **Webhooks**: Real-time order status updates
- **Two-way Catalog Writeback**: Selected admin edits push back to Square via `/api/admin/square/writeback/*`

### 🛡️ **Operational Resilience**

- **Concurrency Primitives**: Pessimistic locks, optimistic locks, request deduplication, duplicate-order prevention (`src/lib/concurrency/`)
- **Admin Auth Guards**: Every `/api/admin/*` route gated by `verifyAdminAccess()` (`src/lib/auth/admin-guard.ts`)
- **Distributed Rate Limiting**: Upstash Redis-backed limiter (`src/lib/rate-limit.ts`) used by contact forms and webhooks
- **Weekly Database Backups**: Automated Supabase dumps via GitHub Actions
- **Cross-admin Sync History**: All admins share visibility into Square sync activity

### 📱 **Modern User Experience**

- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Performance**: Lighthouse budgets enforced in CI, optimized image delivery
- **Accessibility**: WCAG 2.1 AA design patterns with image alt-text guidelines
- **SEO Optimization**: Breadcrumb navigation, FAQ schema, sitemap index
- **Structured Data**: Schema.org markup for rich search results
- **Error Boundaries**: Graceful error handling and recovery

## 🏗️ Technology Stack

### **Frontend & Framework**

- **Next.js 15** - App Router with React Server Components
- **React 19** - Latest React features with concurrent rendering
- **TypeScript** - Full type safety across the entire application
- **Tailwind CSS** - Utility-first styling with custom design system
- **Framer Motion** - Smooth animations and transitions

### **Backend & Database**

- **PostgreSQL** - Robust relational database with advanced indexing
- **Prisma ORM** - Type-safe database access with migrations
- **Supabase** - Authentication and database hosting
- **Server Actions** - Type-safe server-side operations
- **Middleware** - Route protection and request handling

### **Third-party Integrations**

- **Square API** - Payment processing and catalog management
- **Shippo** - Dynamic shipping calculations and label creation
- **Resend** - Transactional email delivery
- **Vercel** - Deployment and hosting platform

### **Developer Experience**

- **pnpm** - Fast, disk-space-efficient package manager (pinned via `packageManager` field)
- **ESLint & Prettier** - Code quality and formatting
- **Husky & lint-staged** - Pre-commit hooks (`scripts/install-git-hooks.sh`)
- **Jest & Playwright** - Unit, integration, component, and E2E coverage

## 🚀 Quick Start

### **Prerequisites**

```bash
Node.js 20+
pnpm 10.17+   # see `packageManager` in package.json
PostgreSQL 14+
```

### **Installation**

```bash
# Clone and install
git clone https://github.com/your-org/destino-sf.git
cd destino-sf
pnpm install

# Environment setup
cp .env.example .env.local
# Configure your environment variables (see docs/ENV_TEMPLATE_SQUARE.md)

# Database setup
pnpm prisma generate
pnpm prisma db push

# Start development
pnpm dev
```

### **Essential Configuration**

```bash
# Required environment variables
DATABASE_URL="postgresql://..."
SQUARE_PRODUCTION_TOKEN="EAAAl..."
SQUARE_LOCATION_ID="L..."
RESEND_API_KEY="re_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 📁 Project Structure

```
destino-sf/
├── 📂 archive/          # Historical backups and one-time scripts
├── 📂 config/           # Configuration files and data mappings
├── 📂 docs/             # Comprehensive documentation
├── 📂 src/              # Main application source
│   ├── 📂 app/          # Next.js App Router pages & API routes
│   ├── 📂 components/   # Reusable React components
│   ├── 📂 lib/          # Core business logic and utilities
│   ├── 📂 hooks/        # Custom React hooks
│   ├── 📂 store/        # Zustand state management
│   ├── 📂 types/        # TypeScript type definitions
│   └── 📂 utils/        # Helper functions
├── 📂 tests/            # E2E and integration tests
├── 📂 prisma/           # Database schema and migrations
├── 📂 public/           # Static assets and images
└── 📂 scripts/          # Development and maintenance scripts
```

## 🧪 Testing & Quality Assurance

Tests live in `src/__tests__/` (Jest) and `tests/e2e/` (Playwright). Jest runs in two projects (`node` and `jsdom`) — see `jest.config.ts`.

### **Running Tests**

```bash
# Critical pre-deployment tests
pnpm test:e2e:critical

# Full test suite with coverage
pnpm test:coverage

# Targeted suites
pnpm test:unit         # lib + utils
pnpm test:components   # jsdom
pnpm test:api          # API routes
pnpm test:integration  # cross-module integration
pnpm test:contracts    # Zod schema contracts
pnpm test:critical     # checkout, orders, square, concurrency

# Mobile and accessibility
pnpm test:e2e:mobile
pnpm test:a11y

# Performance (Lighthouse CI)
pnpm test:performance:lighthouse
pnpm test:performance:lighthouse:mobile
```

### **Quality Gates**

- ✅ **Performance**: Lighthouse budgets enforced via `lighthouserc.json` / `lighthouserc.mobile.json`
- ✅ **Accessibility**: WCAG 2.1 AA, audited via `tests/e2e/accessibility/`
- ✅ **Security**: Admin routes guarded, secrets out of repo, distributed rate limiting
- ✅ **Type Safety**: TypeScript strict mode with `pnpm type-check`

## 🔧 Development Workflow

### **Available Commands**

```bash
# Development
pnpm dev                # Start development server
pnpm dev:turbo         # Start with Turbopack (faster)

# Building & Production
pnpm build             # Build for production (runs prisma generate)
pnpm start             # Start production server

# Code Quality
pnpm lint              # ESLint checking
pnpm lint:fix          # Auto-fix linting issues
pnpm format            # Format with Prettier
pnpm type-check        # TypeScript validation
pnpm validate          # Full validation suite

# Database Operations
pnpm prisma generate   # Generate Prisma client
pnpm prisma db push    # Push schema changes
pnpm prisma studio     # Database browser
pnpm prisma migrate    # Run migrations

# Specialized Tasks
pnpm square-sync       # Sync products from Square (CLI)
pnpm square-sync-api   # Trigger sync via local API endpoint
pnpm backup-db         # Snapshot the configured database
pnpm diagnose-db       # Diagnose DB connection issues
pnpm clean-orders:preview  # Preview test-order cleanup (dry-run)
pnpm analyze           # Bundle analysis (ANALYZE=true next build)
```

## 🍽️ Key Features Deep Dive

### **Smart Shopping Cart**

- **Cross-cart Management**: Separate regular and catering carts
- **Persistence**: Cart state maintained across sessions
- **Validation**: Real-time inventory and minimum order checks
- **Smart Routing**: Automatic cart type detection and routing

### **Dynamic Shipping System**

- **Weight Calculation**: Product-specific weights (alfajores: 0.5+0.4lbs, empanadas: 1.0+0.8lbs)
- **Carrier Integration**: USPS, UPS, FedEx via Shippo API
- **Zone-based Pricing**: Delivery zones with minimum requirements
- **Label Creation**: Automated shipping label generation

### **Catering Management**

- **Package System**: Pre-configured appetizer packages with pricing
- **Image Protection**: Manual images preserved during Square syncs
- **Delivery Zones**: San Francisco ($250+$50), South Bay ($350+$75), Peninsula ($400+$100)
- **Lead Generation**: Comprehensive inquiry forms with follow-up automation

### **Administrative Tools**

- **Product Sync**: Automated Square catalog synchronization
- **Order Management**: Comprehensive order tracking and status updates
- **User Management**: Role-based access with password setup flows
- **Analytics**: Performance monitoring and business metrics

## 📚 Documentation

### **Setup & Configuration**

- 🚀 [Quick Start](./docs/getting-started/quick-start.md)
- 🛠️ [Development Setup](./docs/getting-started/development-setup.md)
- 📋 [Environment Setup](./docs/getting-started/environment-setup.md)
- 🧪 [Test Database Setup](./docs/getting-started/test-database-setup.md)
- 🔐 [Authentication](./docs/security/authentication.md)

### **Feature Documentation**

- 🍽️ [Catering System](./docs/features/catering/README.md)
- 🚚 [Shipping](./docs/features/shipping/)
- 💳 [Square Integration](./docs/features/payments/square-integration.md)
- 🔄 [Square Sync Operations](./docs/operations/product-sync/square-sync.md)
- 🔁 [Concurrency Patterns](./docs/CONCURRENCY_PATTERNS.md)

### **Testing & Quality**

- 🧪 [Testing Strategy](./docs/testing/testing-strategy.md)
- 🎭 [Playwright (E2E) Setup](./docs/testing/e2e-testing/playwright-setup.md)
- 🔬 [Integration Testing](./docs/testing/integration-testing.md)
- 🧱 [Unit Testing](./docs/testing/unit-testing.md)

### **Audit & Roadmap**

- 🛡️ [Q2 2026 Audit Report](./docs/AUDIT_REPORT_2026_03_25.md)
- 🗺️ [Q2 2026 Roadmap](./docs/ROADMAP_2026_Q2.md)
- ⚡ [Performance Guidelines](./docs/PERFORMANCE_GUIDELINES.md)

## 🚀 Deployment

### **Pre-deployment Checklist**

```bash
# 1. Run critical tests
pnpm test:e2e:critical

# 2. Validate TypeScript
pnpm type-check

# 3. Check build
pnpm build

# 4. Performance audit
pnpm test:performance:lighthouse

# 5. Security scan
pnpm audit
```

CI mirrors this via the **Pre-Deployment Checklist** workflow on PRs to `main`. PRs to `development` run the **Essential Quality Checks** workflow (type-check, lint, test, build, security scan).

### **Environment Configuration**

- **Production**: Full Square integration with live payments
- **Staging**: Hybrid mode (production catalog, sandbox payments)
- **Development**: Full sandbox mode for safe testing

### **Monitoring**

- **Performance**: Core Web Vitals tracking
- **Errors**: Automated error reporting and alerting
- **Business Metrics**: Order completion, conversion rates
- **Infrastructure**: Database performance and API health

## 🔍 Troubleshooting

### **Common Issues**

#### Development Setup

```bash
# Clear cache and reinstall
rm -rf .next node_modules
pnpm install
pnpm dev
```

#### Database Issues

```bash
# Reset and regenerate
pnpm prisma db push --force-reset
pnpm prisma generate
```

#### Square API Issues

```bash
# Verify the local catalog sync runs end-to-end
pnpm square-sync

# Inspect Square writeback health (admin auth required)
curl -b cookies.txt http://localhost:3000/api/admin/square/writeback/health

# Update tokens (see docs/SQUARE_TOKEN_SETUP.md)
```

> ⚠️ Production debug routes (`/api/debug/*`, `/api/test-*`, `/test-*`) were removed in the Q2 2026 audit. Use Jest tests, the admin dashboard, or the writeback health endpoint instead.

#### Test Failures

```bash
# Debug mode
pnpm test:e2e:debug

# Generate reports
pnpm test:e2e:report
```

### **Support Resources**

- 📖 [Comprehensive Documentation](./docs/)
- 🐛 [Issue Templates](./.github/ISSUE_TEMPLATE/)
- 📞 [Support Contacts](./docs/README.md)

## 📈 Project Status

### **Recent Work (Q2 2026)**

- 🛡️ **Security audit follow-ups**: secrets purge, admin auth guards on every `/api/admin/*` route, in-memory rate limiter retired in favor of Upstash Redis
- 🔁 **Square writeback**: two-way Destino → Square catalog updates with health endpoint
- 💾 **Weekly Supabase backup**: automated DB dumps via GitHub Actions
- 🔒 **Concurrency primitives**: pessimistic + optimistic locks, request deduplication, duplicate-order prevention
- 👥 **Cross-admin sync history**: every admin sees every admin-triggered Square sync, with `Started by` attribution

See [`docs/ROADMAP_2026_Q2.md`](./docs/ROADMAP_2026_Q2.md) for the live roadmap.

## 🤝 Contributing

### **Branch & PR Workflow**

1. Branch off **`development`** (not `main`).
2. Name the branch by intent: `feat/<scope>`, `fix/<scope>`, `docs/<scope>`, `chore/<scope>`.
3. Run local validation before pushing: `pnpm validate && pnpm test:critical`.
4. Open a PR against `development`. PRs to `main` are reserved for releases.
5. **Always use "Rebase and merge"** in GitHub — never "Squash and merge". Squashing diverges `development` from `main` and accumulates the "X commits ahead" problem (see `CLAUDE.md` §11).
6. CI on `development`: type-check, lint, test, build, security scan, Lighthouse, accessibility.
7. CI on `main`: full pre-deployment checklist + E2E + deployment gate.

### **Code Standards**

- **TypeScript**: Strict mode; minimize `any` (warn-level rule)
- **Testing**: Jest for unit/integration/component, Playwright for E2E
- **Logging**: `console.error` / `console.warn` only — `console.log` is a lint warning
- **Performance**: Lighthouse budgets enforced; new routes ship a `loading.tsx` skeleton
- **Accessibility**: WCAG 2.1 AA target, validated via `tests/e2e/accessibility/`
- **Admin routes**: every `/api/admin/*` handler must call `verifyAdminAccess()` first

## 📄 License

This project is proprietary and confidential. All rights reserved by Destino SF.

---

**🌟 Built with passion for San Francisco's Argentine food community**

_Delivering authentic flavors and exceptional catering experiences since 2024_ ✨
