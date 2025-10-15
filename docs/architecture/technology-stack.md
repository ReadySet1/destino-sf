# Technology Stack

## Frontend Stack

### Framework & Runtime

- **Next.js 15**: React framework with App Router
- **React 18**: Component library with latest features
- **TypeScript**: Type-safe development

### Styling & UI

- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality React components
- **Radix UI**: Accessible, unstyled component primitives

### State Management

- **Zustand**: Lightweight state management
- **React Query (TanStack Query)**: Server state management
- **Context API**: Component-level state sharing

## Backend Stack

### Database & ORM

- **PostgreSQL**: Primary database (Vercel Postgres)
- **Prisma**: Type-safe database ORM
- **Redis**: Caching and session storage

### API & Services

- **Next.js API Routes**: RESTful API endpoints
- **tRPC**: Type-safe API layer
- **Zod**: Runtime type validation

## Third-Party Integrations

### Payments

- **Square**: Payment processing and POS integration
- **Square Webhooks**: Real-time payment updates

### Shipping

- **Shippo**: Shipping rates and label generation
- **USPS/FedEx/UPS**: Multi-carrier shipping

### Content Management

- **Sanity CMS**: Headless content management
- **Cloudinary**: Image optimization and delivery

### Analytics & Monitoring

- **Vercel Analytics**: Performance monitoring
- **Sentry**: Error tracking and performance monitoring
- **Umami**: Privacy-focused web analytics

## Development Tools

### Code Quality

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Husky**: Git hooks
- **lint-staged**: Pre-commit linting

### Testing

- **Jest**: Unit testing framework
- **Playwright**: End-to-end testing
- **Testing Library**: React component testing

### Deployment & Infrastructure

- **Vercel**: Hosting and deployment platform
- **Vercel Edge Functions**: Serverless computing
- **GitHub Actions**: CI/CD pipeline

## Architecture Principles

### Type Safety

- End-to-end TypeScript coverage
- Runtime validation with Zod
- Prisma-generated types for database operations

### Performance

- Static site generation where possible
- Optimistic UI updates
- Image optimization and CDN delivery
- Database query optimization

### Security

- Environment variable validation
- Input sanitization and validation
- CSRF protection
- Rate limiting on API endpoints

### Scalability

- Serverless architecture
- Database connection pooling
- Caching strategies
- Horizontal scaling capabilities
