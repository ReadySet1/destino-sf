# Quick Start Guide

Get up and running with Destino SF in minutes. This guide covers the essential steps to set up your development environment and start working with the platform.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18.17 or higher
- **pnpm** package manager (recommended)
- **Git** for version control
- **PostgreSQL** for local database development

## 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd destino-sf

# Install dependencies
pnpm install
```

## 2. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env.local

# Edit the environment file with your configuration
# See the Environment Setup guide for detailed instructions
```

### Required Environment Variables

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/destino_sf"

# Next.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Square (for payments)
SQUARE_APPLICATION_ID="your-square-app-id"
SQUARE_ACCESS_TOKEN="your-square-access-token"
SQUARE_ENVIRONMENT="sandbox" # or "production"

# Shippo (for shipping)
SHIPPO_TOKEN="your-shippo-token"
```

For complete environment setup, see [Environment Setup Guide](environment-setup.md).

## 3. Database Setup

```bash
# Generate Prisma client
pnpm prisma generate

# Run database migrations
pnpm prisma migrate dev

# Seed the database with sample data
pnpm db:seed
```

## 4. Verify Installation

```bash
# Run tests to ensure everything works
pnpm test

# Start the development server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application running.

## 5. Quick Verification Checklist

Verify your setup by checking these key features:

### Frontend

- [ ] Homepage loads correctly
- [ ] Product catalog displays items
- [ ] Shopping cart functionality works
- [ ] Catering section is accessible

### Backend

- [ ] API endpoints respond correctly
- [ ] Database connections work
- [ ] Authentication system functions

### Test Suite

```bash
# Run unit tests
pnpm test:unit

# Run component tests
pnpm test:components

# Run critical path tests
pnpm test:critical
```

## Development Workflow

### Daily Development

```bash
# Start development server with hot reload
pnpm dev

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm type-check
```

### Code Quality

```bash
# Run linter
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code
pnpm format

# Run all quality checks
pnpm validate
```

## Key Development Commands

| Command           | Description              |
| ----------------- | ------------------------ |
| `pnpm dev`        | Start development server |
| `pnpm build`      | Build for production     |
| `pnpm test`       | Run all tests            |
| `pnpm test:e2e`   | Run end-to-end tests     |
| `pnpm lint`       | Run ESLint               |
| `pnpm type-check` | TypeScript type checking |

## Project Structure Overview

```
destino-sf/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   ├── components/       # React components
│   ├── lib/             # Utility libraries and configurations
│   ├── types/           # TypeScript type definitions
│   └── styles/          # Tailwind CSS styles
├── prisma/              # Database schema and migrations
├── tests/               # Test files
├── docs/                # Documentation (this folder)
├── public/              # Static assets
└── scripts/             # Build and utility scripts
```

## Next Steps

Now that you have the basic setup running:

1. **Explore the Features**: Check out the [Features Documentation](../features/ecommerce/README.md)
2. **Understand the Architecture**: Read the [System Overview](../architecture/system-overview.md)
3. **Set up Testing**: Follow the [Testing Setup Guide](../testing/e2e-testing/README.md)
4. **Learn the API**: Browse the [API Documentation](../api/rest-api/README.md)

## Common Issues

If you encounter issues during setup:

### Database Connection Issues

```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Reset the database if needed
pnpm db:reset
```

### Environment Variable Issues

- Verify all required variables are set in `.env.local`
- Check the [Environment Setup Guide](environment-setup.md) for detailed configuration

### Port Already in Use

```bash
# Use a different port
pnpm dev -- -p 3001
```

## Getting Help

- 📚 [Complete Documentation](../README.md)
- 🔧 [Troubleshooting Guide](../troubleshooting/common-issues.md)
- 🏗️ [Development Setup](development-setup.md)
- 🧪 [Testing Guide](../testing/testing-strategy.md)

---

**Next:** [Environment Setup Guide](environment-setup.md) →
