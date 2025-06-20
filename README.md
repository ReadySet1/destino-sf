# 🥟 Destino SF - Argentine Cuisine & Catering

Welcome to Destino SF, San Francisco's premier destination for authentic Argentine empanadas, alfajores, and catering services. Built with Next.js, TypeScript, and modern web technologies.

## 🌟 Features

- **🛒 E-commerce Store**: Browse and purchase authentic Argentine products
- **🍽️ Catering Services**: Professional catering packages for events
- **💳 Secure Payments**: Integrated with Square for safe transactions
- **📱 Mobile Responsive**: Optimized for all devices
- **🚀 Modern Stack**: Next.js 15, TypeScript, Prisma, Tailwind CSS

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **Database**: PostgreSQL with Prisma ORM
- **Payments**: Square Web SDK
- **Email**: Resend for transactional emails
- **Deployment**: Vercel
- **Testing**: Playwright for E2E, Jest for unit tests

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (package manager)
- PostgreSQL database
- Square developer account

### Installation
```bash
# Clone the repository
git clone https://github.com/your-org/destino-sf.git
cd destino-sf

# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Setup database
pnpm prisma generate
pnpm prisma db push

# Start development server
pnpm dev
```

Visit `http://localhost:3000` to see the application.

## 🧪 Testing

### Pre-Production Testing
Before deploying to production, follow our comprehensive testing plan:
- 📋 [Production Testing Plan](./docs/testing/PRODUCTION_TESTING_PLAN.md)
- 🎭 [Playwright Setup Guide](./docs/testing/playwright-setup.md)
- 📊 [Test Data Setup](./docs/testing/test-data-setup.md)
- 🚀 [Deployment Checklist](./docs/testing/deployment-checklist.md)

### Running Tests

#### Critical Pre-Deployment Tests
```bash
# Critical flows (must pass before production)
pnpm test:e2e:critical

# Mobile testing
pnpm test:e2e:mobile

# Complete pre-deployment suite
pnpm test:pre-deploy
```

#### Development Testing
```bash
# Full end-to-end test suite
pnpm test:e2e

# Run with UI for debugging
pnpm test:e2e:ui

# Debug mode
pnpm test:e2e:debug

# Generate test reports
pnpm test:e2e:report
```

#### Unit & Integration Tests
```bash
# Run all Jest tests
pnpm test

# Unit tests only
pnpm test:unit

# Component tests
pnpm test:components

# API tests
pnpm test:api
```

### Test Coverage
- ✅ Complete purchase journey
- ✅ Cart management
- ✅ Catering inquiries
- ✅ Payment processing
- ✅ User authentication
- ✅ Mobile responsiveness
- ✅ Cross-browser compatibility

## 📝 Development

### Project Structure
```
destino-sf/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── lib/                 # Utility libraries
│   ├── hooks/               # Custom React hooks
│   ├── store/               # State management (Zustand)
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Helper functions
├── tests/
│   ├── e2e/                 # Playwright end-to-end tests
│   └── __tests__/           # Jest unit/integration tests
├── docs/                    # Documentation
├── prisma/                  # Database schema and migrations
└── public/                  # Static assets
```

### Development Commands
```bash
# Development
pnpm dev                     # Start development server
pnpm dev:turbo              # Start with Turbopack

# Building
pnpm build                  # Build for production
pnpm start                  # Start production server

# Code Quality
pnpm lint                   # ESLint checking
pnpm lint:fix               # Fix linting issues
pnpm format                 # Format code with Prettier
pnpm type-check             # TypeScript type checking
pnpm validate               # Run type-check and lint

# Database
pnpm prisma generate        # Generate Prisma client
pnpm prisma db push         # Push schema changes
pnpm prisma studio          # Open Prisma Studio
```

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://..."

# Square (Sandbox for development)
SQUARE_APPLICATION_ID="sandbox-app-id"
SQUARE_ACCESS_TOKEN="sandbox-access-token"
SQUARE_ENVIRONMENT="sandbox"

# Email
RESEND_API_KEY="your-resend-api-key"

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### Prisma Database Schema
The application uses PostgreSQL with Prisma ORM. Key models include:
- `Product`: Menu items (empanadas, alfajores)
- `Category`: Product categories
- `Order`: Customer orders
- `CateringOrder`: Catering inquiries
- `Customer`: Customer information

## 🍽️ Features Deep Dive

### E-commerce Store
- Product catalog with categories
- Shopping cart with persistence
- Secure checkout process
- Order confirmation and tracking
- Email notifications

### Catering Services
- Package selection
- Custom inquiry forms
- Lead generation
- Quote management
- Event planning integration

### Payment Processing
- Square integration for secure payments
- Credit card processing
- Order confirmation
- Receipt generation
- Refund handling

## 🚢 Deployment

### Production Deployment
1. Follow the [Deployment Checklist](./docs/testing/deployment-checklist.md)
2. Run critical tests: `pnpm test:e2e:critical`
3. Verify mobile compatibility: `pnpm test:e2e:mobile`
4. Deploy to Vercel or your preferred platform

### Environment Setup
- Configure production environment variables
- Set up production database
- Configure Square production keys
- Set up email service
- Configure domain and SSL

## 📊 Monitoring & Analytics

### Performance Monitoring
- Core Web Vitals tracking
- Page load time monitoring
- Error rate tracking
- User experience metrics

### Business Metrics
- Order completion rate
- Payment success rate
- Cart abandonment rate
- Catering inquiry conversion

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite: `pnpm test:e2e:critical`
6. Submit a pull request

### Code Standards
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Conventional commits for commit messages
- Component testing with Jest
- E2E testing with Playwright

## 📚 Documentation

- [Testing Strategy](./docs/testing/PRODUCTION_TESTING_PLAN.md)
- [Playwright Setup](./docs/testing/playwright-setup.md)
- [Test Data Management](./docs/testing/test-data-setup.md)
- [Deployment Process](./docs/testing/deployment-checklist.md)

## 🐛 Troubleshooting

### Common Issues

#### Test Failures
```bash
# Run tests in debug mode
pnpm test:e2e:debug

# Check test reports
pnpm test:e2e:report
```

#### Database Issues
```bash
# Reset database
pnpm prisma db push --force-reset

# Regenerate Prisma client
pnpm prisma generate
```

#### Build Issues
```bash
# Check TypeScript errors
pnpm type-check

# Clear Next.js cache
rm -rf .next
pnpm build
```

## 📞 Support

For support, please:
1. Check the documentation
2. Review the troubleshooting guide
3. Run the diagnostic commands
4. Create an issue with detailed information

## 📄 License

This project is private and proprietary to Destino SF.

---

**Built with ❤️ for San Francisco's Argentine food community** 