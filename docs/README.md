# Destino SF Documentation

Welcome to the Destino SF documentation. This comprehensive guide covers everything you need to know about developing, deploying, and maintaining the platform.

## Platform Overview

Destino SF is a premium Argentine cuisine e-commerce and catering platform that combines traditional flavors with modern technology. The platform serves both retail customers seeking authentic Argentine products and businesses requiring professional catering services.

## Technology Stack

- **Frontend:** Next.js 15 with App Router, TypeScript, React 18
- **Backend:** Next.js API Routes, Server Actions
- **Database:** PostgreSQL with Prisma ORM
- **Styling:** Tailwind CSS with shadcn/ui components
- **Payments:** Square Payment API
- **Shipping:** Shippo Integration
- **Authentication:** Custom JWT-based system with magic links
- **Deployment:** Vercel with automatic CI/CD
- **Testing:** Jest (unit), Playwright (E2E)
- **Monitoring:** Sentry for error tracking

## Key Features

### E-commerce Platform
- Product catalog with categories and search
- Shopping cart with real-time calculations
- Secure checkout process with Square payments
- Order management and tracking
- Customer account management

### Catering System
- Specialized catering packages and pricing
- Delivery zone validation with minimum order requirements
- Advanced filtering for catering-specific items
- Business inquiry and quote system
- Professional presentation and packaging options

### Business Features
- Inventory management with Square sync
- Real-time shipping rate calculation
- Automated order processing
- Customer communication system
- Admin dashboard for operations

## Quick Links

- [🚀 Quick Start Guide](getting-started/quick-start.md) - Get up and running in minutes
- [🏗️ Architecture Overview](architecture/system-overview.md) - Understand the system design
- [📚 API Reference](api/rest-api/README.md) - Complete API documentation
- [🧪 Testing Guide](testing/testing-strategy.md) - Testing strategies and setup
- [🚀 Deployment Guide](deployment/overview.md) - Production deployment procedures
- [🔧 Troubleshooting](troubleshooting/common-issues.md) - Common issues and solutions

## Documentation Structure

This documentation is organized into the following sections:

### Getting Started
Essential guides for setting up your development environment and understanding the project structure.

### Architecture
Technical documentation covering system design, database schema, and architectural decisions.

### Features
Detailed documentation for each major feature including e-commerce, catering, payments, and shipping.

### API Reference
Complete REST API documentation with examples and type definitions.

### Testing
Comprehensive testing guides covering unit tests, integration tests, and end-to-end testing.

### Deployment
Step-by-step deployment procedures and environment configuration.

### Operations
Day-to-day operational procedures including product sync, monitoring, and maintenance.

### Troubleshooting
Common issues, solutions, and debugging guides.

### Security
Security implementation details, authentication system, and best practices.

## Development Workflow

```bash
# Clone the repository
git clone <repository-url>
cd destino-sf

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Set up the database
pnpm prisma generate
pnpm prisma migrate dev
pnpm db:seed

# Run tests
pnpm test

# Start development server
pnpm dev
```

## Project Status

**Current Version:** Production Ready  
**Last Updated:** January 2025  
**Deployment:** Live on Vercel  
**Test Coverage:** 85%+

## Contributing

This is a private project. For development team members:

1. Follow the [development setup guide](getting-started/development-setup.md)
2. Review the [testing strategy](testing/testing-strategy.md) before making changes
3. Use the [deployment checklist](deployment/pre-deployment-checklist.md) before releases

## Support

For technical support or questions:
- Review the [troubleshooting guide](troubleshooting/common-issues.md)
- Check the [FAQ section](appendix/glossary.md)
- Contact the development team

## License

Private project - All rights reserved.

---

**Note:** This documentation is automatically updated and synchronized with the codebase. Last updated: January 2025.
