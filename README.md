# 🥟 Destino SF - Premium Argentine Cuisine & Catering Platform

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

### 📱 **Modern User Experience**

- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Performance**: 90%+ Lighthouse scores, optimized image delivery
- **Accessibility**: WCAG-compliant design patterns
- **Progressive Enhancement**: Works offline with service worker
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

- **pnpm** - Fast, disk space efficient package manager
- **ESLint & Prettier** - Code quality and formatting
- **Husky & lint-staged** - Pre-commit hooks
- **Jest & Playwright** - Comprehensive testing suite (86%+ coverage)

## 🚀 Quick Start

### **Prerequisites**

```bash
Node.js 18.17+
pnpm 8.0+
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

### **Test Coverage: 86.3%** ✅

- **505+ Tests** across unit, integration, and E2E
- **99.4% Success Rate** with automated flaky test detection
- **Cross-browser Testing** (Chromium, Firefox, WebKit)
- **Mobile Testing** with device emulation

### **Running Tests**

```bash
# Critical pre-deployment tests
pnpm test:e2e:critical

# Full test suite
pnpm test:coverage

# Component and unit tests
pnpm test

# Mobile responsiveness
pnpm test:e2e:mobile

# Performance testing
pnpm test:lighthouse
```

### **Quality Gates**

- ✅ **Performance**: Lighthouse score ≥90%
- ✅ **Accessibility**: WCAG 2.1 AA compliance
- ✅ **Security**: Zero critical vulnerabilities
- ✅ **Type Safety**: 100% TypeScript coverage

## 🔧 Development Workflow

### **Available Commands**

```bash
# Development
pnpm dev                # Start development server
pnpm dev:turbo         # Start with Turbopack (faster)

# Building & Production
pnpm build             # Build for production
pnpm start             # Start production server
pnpm preview           # Preview production build

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
pnpm sync:square       # Sync products from Square
pnpm test:health       # System health check
pnpm check:images      # Validate product images
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

- 📋 [Environment Setup](./docs/ENV_TEMPLATE_SQUARE.md)
- 🔑 [Square API Configuration](./docs/SQUARE_TOKEN_SETUP.md)
- 🔐 [User Management](./docs/PASSWORD_SETUP.md)
- 🧪 [Test Database Setup](./docs/TEST_DATABASE_GUIDE.md)

### **Feature Documentation**

- 🍽️ [Catering System](./docs/README_CATERING.md)
- 🚚 [Shipping Integration](./docs/ENHANCED_SHIPPO_INTEGRATION.md)
- 🖼️ [Image Management](./docs/DESSERT_IMAGES_FINAL_STATUS.md)
- 🔄 [Product Sync Process](./docs/PRODUCTION_SYNC_AUDIT_REPORT.md)

### **Testing & Quality**

- 🧪 [Testing Strategy](./docs/TESTING_STRATEGY.md)
- 📊 [Test Infrastructure](./docs/PHASE_5_TEST_INFRASTRUCTURE_SUMMARY.md)
- 🎭 [Playwright Setup](./docs/testing/playwright-setup.md)
- ✅ [Production Testing Plan](./docs/testing/PRODUCTION_TESTING_PLAN.md)

### **Performance & Optimization**

- ⚡ [Performance Optimizations](./docs/PERFORMANCE_OPTIMIZATIONS_SUMMARY.md)
- 🔄 [Sync Improvements](./docs/SYNC_IMPROVEMENTS.md)
- 🏗️ [Project Cleanup](./docs/PROJECT_CLEANUP_SUMMARY.md)

### **Implementation Guides**

- 📦 [Box Lunch Features](./docs/IMPLEMENTATION_SUMMARY.md)
- 🍰 [Catering Restoration](./docs/CATERING_RESTORATION_SUMMARY.md)
- 🛠️ [Database Fixes](./docs/CATERING_DATABASE_FIX.md)

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
pnpm test:lighthouse

# 5. Security scan
pnpm audit
```

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
# Test configuration
curl http://localhost:3000/api/debug/square-config

# Update tokens (see docs/SQUARE_TOKEN_SETUP.md)
```

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

### **Current Metrics**

- ✅ **Test Coverage**: 86.3% (Target: 85%+)
- ✅ **Performance**: 90%+ Lighthouse scores
- ✅ **TypeScript**: 100% type coverage
- ✅ **Security**: Zero critical vulnerabilities
- ✅ **Accessibility**: WCAG 2.1 AA compliant

### **Recent Achievements**

- 🏆 **Project Cleanup**: Organized root folder with 50% reduction in clutter
- 🏆 **Test Infrastructure**: Comprehensive testing with automated CI/CD
- 🏆 **Performance**: Optimized database queries and API rate limiting
- 🏆 **Feature Complete**: Full catering system with image protection

### **Upcoming Enhancements**

- 🔄 **International Shipping**: Customs and duty calculations
- 📊 **Advanced Analytics**: Customer behavior and business intelligence
- 🤖 **AI Integration**: Smart product recommendations
- 📱 **Mobile App**: Native iOS/Android applications

## 🤝 Contributing

### **Development Process**

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Follow TypeScript and ESLint guidelines
4. Add comprehensive tests for new functionality
5. Run the full test suite: `pnpm test:coverage`
6. Submit a pull request with detailed description

### **Code Standards**

- **TypeScript**: Strict mode with comprehensive type coverage
- **Testing**: Jest for unit/integration, Playwright for E2E
- **Documentation**: Update relevant docs for new features
- **Performance**: Maintain 90%+ Lighthouse scores
- **Accessibility**: WCAG 2.1 AA compliance required

## 📄 License

This project is proprietary and confidential. All rights reserved by Destino SF.

---

**🌟 Built with passion for San Francisco's Argentine food community**

_Delivering authentic flavors and exceptional catering experiences since 2024_ ✨

## Testing

This project has comprehensive test coverage for both unit and integration scenarios. The test suite includes dedicated testing for the main menu sections: **Spotlight Picks** and **"Our Menus: What We Make"**.

### Menu Sections Testing

#### Components Covered

- **Component**: `FeaturedProducts` (`src/components/Marketing/FeaturedProducts.tsx`)
  - **Purpose**: Displays the dynamic "Spotlight Picks" section on the homepage
  - **Test Location**: `src/__tests__/components/Marketing/FeaturedProducts.test.tsx`
  - **Coverage**: Component rendering, API integration, product cards, interactive features, fallback behavior

- **Component**: `ShopByCategory` (`src/components/Marketing/ShopByCategory.tsx`)
  - **Purpose**: Shows the "Our Menus: What We Make" section with category cards
  - **Test Location**: `src/__tests__/components/Marketing/ShopByCategory.test.tsx`
  - **Coverage**: Category rendering, background patterns, navigation links, responsive design

- **Component**: `ProductList` (`src/components/Products/ProductList.tsx`)
  - **Purpose**: Displays the main product offerings
  - **Test Location**: `src/__tests__/components/Products/ProductList.test.tsx`
  - **Coverage**: Product information, layout, accessibility, navigation consistency

#### Test Categories

##### Unit Tests

- **Component Rendering**: Ensures all components render correctly with proper structure
- **API Integration**: Tests data fetching, error handling, and fallback scenarios
- **Interactive Features**: Validates user interactions, modals, and personalization features
- **Accessibility**: Checks ARIA labels, keyboard navigation, and semantic structure
- **Responsive Design**: Verifies layout adaptation across different screen sizes

##### Integration Tests

- **Cross-Section Data Consistency**: Ensures data flows correctly between related sections
- **Navigation Flow**: Tests user journey from spotlight picks to category pages
- **Performance**: Validates render times and handles large datasets efficiently
- **Error Resilience**: Ensures one section's failure doesn't break others

##### API Tests

- **Endpoint Testing**: Validates all CRUD operations for spotlight picks
- **Authentication**: Tests admin access controls and permissions
- **Data Validation**: Ensures proper validation of input data
- **Response Format**: Confirms consistent API response structure

#### Running Menu Section Tests

```bash
# Run all spotlight picks related tests
npm run test:spotlight
npm run test:spotlight:watch     # Watch mode
npm run test:spotlight:coverage  # With coverage

# Run menu category tests
npm run test:menus
npm run test:menus:watch
npm run test:menus:coverage

# Run all menu sections together
npm run test:menu-sections
npm run test:menu-sections:watch
npm run test:menu-sections:coverage

# Run integration tests
npm run test:integration
npm run test:integration:watch
npm run test:integration:coverage

# Run API tests
npm run test:api
npm run test:api:watch
npm run test:api:coverage

# Run enhanced performance/error tests
npm run test:menu-enhanced
npm run test:menu-enhanced:watch
npm run test:menu-enhanced:coverage

# Run ALL menu-related tests
npm run test:all-menu
npm run test:all-menu:watch
npm run test:all-menu:coverage

# Run specific test types
npm run test:performance      # Performance-focused tests
npm run test:accessibility    # Accessibility tests
```

#### Test Features

**Comprehensive Scenarios**:

- ✅ Component rendering with and without data
- ✅ API success and failure scenarios
- ✅ Product-based vs custom spotlight picks
- ✅ Interactive modal functionality
- ✅ Background pattern rendering (48 isotipo images)
- ✅ Navigation link consistency across sections
- ✅ Error boundary and fallback behavior
- ✅ Performance under load
- ✅ Accessibility compliance
- ✅ Responsive design validation

**Mock Data Factories**:

- Realistic spotlight pick data with products and custom content
- Category and product information matching production structure
- Error scenarios for robust testing
- Performance testing with large datasets

**Test Utilities**:

- Common assertion helpers for accessibility and performance
- Mock setup utilities for consistent test environments
- Response format validation helpers
- Cross-browser compatibility checks

### Other Testing

#### Unit Tests

```bash
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

#### E2E Tests

```bash
npm run test:e2e          # Run end-to-end tests
npm run test:e2e:ui       # Run E2E tests with UI
```

#### Linting

```bash
npm run lint              # Check code style
npm run lint:fix          # Fix linting issues
```

### Test Coverage Goals

- **Unit Tests**: >90% coverage for menu components
- **Integration Tests**: All user flows tested
- **API Tests**: All endpoints covered
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: <200ms initial render, <100ms interactions
