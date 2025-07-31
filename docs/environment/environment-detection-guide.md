# Environment Detection Implementation Guide

This guide documents the comprehensive environment detection system implemented for the Destino SF platform.

## Overview

The environment detection system provides:
- **Automatic environment detection** (development, staging, production)
- **Infrastructure detection** (local Docker, cloud, hybrid)
- **Database environment switching** (local PostgreSQL, Supabase cloud)
- **Service availability checking** (Square, Redis, Shippo, etc.)
- **Visual environment indicators** in development
- **Environment-specific scripts** for easy switching

## Architecture

### Core Components

1. **`src/lib/env-check.ts`** - Environment detection utility
2. **`src/components/EnvironmentIndicator.tsx`** - Visual environment feedback
3. **`src/lib/db-adaptive.ts`** - Adaptive database connection management
4. **Environment-specific scripts** - In `src/scripts/`
5. **Enhanced `next.config.js`** - Startup environment logging

### Environment Types

The system detects and manages four types of environments:

```typescript
type AppEnvironment = 'development' | 'production' | 'test' | 'staging';
type InfraEnvironment = 'local' | 'cloud' | 'hybrid';
type DatabaseEnvironment = 'local-docker' | 'local-postgres' | 'supabase-cloud' | 'production';
type SquareEnvironment = 'sandbox' | 'production';
```

## Environment Detection Logic

### Application Environment
- **Development**: `NODE_ENV=development`
- **Production**: `NODE_ENV=production` 
- **Test**: `NODE_ENV=test`
- **Staging**: `NODE_ENV=staging` or `VERCEL_ENV=preview`

### Infrastructure Environment
- **Local**: `USE_LOCAL_DOCKER=true` or local database URLs
- **Cloud**: `USE_SUPABASE_CLOUD=true` or `VERCEL=1`
- **Hybrid**: Local database + cloud services

### Database Environment
- **Local Docker**: `host.docker.internal` in DATABASE_URL or `USE_LOCAL_DOCKER=true`
- **Local PostgreSQL**: `localhost` or `127.0.0.1` in DATABASE_URL
- **Supabase Cloud**: `supabase.co` in DATABASE_URL
- **Production**: Production environment with external database

### Square Environment
- **Sandbox**: `USE_SQUARE_SANDBOX=true` or `SQUARE_ENVIRONMENT=sandbox`
- **Production**: `SQUARE_ENVIRONMENT=production` or production app environment

## Quick Start

### 1. Environment Setup

Create your `.env.local` file:

```bash
# Copy the template (create .env.example first if it doesn't exist)
cp .env.example .env.local
```

### 2. Choose Your Development Environment

**Option A: Full Local Development**
```env
USE_LOCAL_DOCKER=true
USE_SQUARE_SANDBOX=true
DATABASE_URL=postgresql://postgres:password@localhost:5432/destino_sf
```

**Option B: Hybrid Development**
```env
USE_SUPABASE_CLOUD=true
USE_SQUARE_SANDBOX=true
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres
```

**Option C: Cloud Development**
```env
USE_SUPABASE_CLOUD=true
SQUARE_ENVIRONMENT=sandbox
DATABASE_URL=postgresql://user:pass@db.xxx.supabase.co:5432/postgres
```

### 3. Validate Your Environment

```bash
# Check environment configuration
pnpm env:check

# Show detailed environment info
pnpm env:info

# Validate specific requirements
pnpm env:validate --require-redis --require-shippo
```

### 4. Start Development

```bash
# Standard development
pnpm dev

# Force local Docker environment
pnpm dev:local

# Force cloud environment  
pnpm dev:cloud

# Start with specific database
pnpm dev:local-docker
```

## Available Scripts

### Environment Management
```bash
pnpm env:check          # Comprehensive environment analysis
pnpm env:info           # Detailed environment information (JSON)
pnpm env:validate       # Validate environment requirements
```

### Development Scripts
```bash
pnpm dev:local          # Start with local Docker
pnpm dev:cloud          # Start with cloud services
pnpm dev:local-docker   # Start with local Docker + sandbox Square
pnpm dev:staging        # Start in staging mode
```

### Database Management
```bash
pnpm db:status          # Check database connection status
pnpm db:local           # Reset and seed local database
pnpm db:cloud           # Reset and seed cloud database
```

### Square Integration
```bash
pnpm square:sandbox     # Test Square sandbox connection
pnpm square:production  # Test Square production connection
```

## Environment Indicator Component

The `EnvironmentIndicator` component provides visual feedback about the current environment:

### Usage

```tsx
import { EnvironmentIndicator, EnvironmentBadgeSimple } from '@/components/EnvironmentIndicator';

// Full indicator (development only)
<EnvironmentIndicator 
  position="bottom-right"
  showDetails={true}
  developmentOnly={true}
/>

// Simple badge
<EnvironmentBadgeSimple />
```

### Features

- **Real-time environment detection**
- **Service status indicators**
- **Validation error/warning display**
- **Quick action buttons**
- **Automatic hiding in production**

## Adaptive Database Management

The `AdaptiveDatabaseManager` automatically adapts database connections to the environment:

### Usage

```typescript
import { adaptiveDatabase, getDatabaseClient, checkDatabaseHealth } from '@/lib/db-adaptive';

// Get optimized Prisma client
const client = await getDatabaseClient();

// Check connection health
const health = await checkDatabaseHealth();

// Switch environments
await adaptiveDatabase.switchEnvironment('supabase-cloud');

// Run migrations
await adaptiveDatabase.runMigrations();
```

### Features

- **Automatic connection optimization** based on environment
- **Connection health monitoring**
- **Environment switching capabilities**
- **Migration management**
- **Connection pooling optimization**

## Environment Variables Reference

### Core Configuration
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://...
```

### Environment Detection
```env
USE_LOCAL_DOCKER=true          # Enable local Docker mode
USE_SUPABASE_CLOUD=true        # Enable Supabase cloud mode
USE_SQUARE_SANDBOX=true        # Enable Square sandbox
```

### Database URLs
```env
DATABASE_URL=postgresql://...              # Main database URL
LOCAL_DATABASE_URL=postgresql://...        # Local database URL
SUPABASE_DATABASE_URL=postgresql://...     # Supabase database URL
DIRECT_URL=postgresql://...                # Direct connection URL (Supabase)
```

### Square Configuration
```env
USE_SQUARE_SANDBOX=true
SQUARE_ENVIRONMENT=sandbox
SQUARE_ACCESS_TOKEN=your-token
SQUARE_SANDBOX_TOKEN=your-sandbox-token
SQUARE_PRODUCTION_TOKEN=your-production-token
```

### Debug Configuration
```env
DEBUG=true
VERBOSE_LOGGING=true
ENABLE_DEBUG_LOGGING=true
```

## Best Practices

### 1. Environment Variable Organization

**`.env.local` (Local Development)**
- Local overrides and development-specific values
- Docker URLs and local database connections
- Sandbox API keys and test credentials

**`.env` (Shared Configuration)**
- Default values and fallbacks
- Non-sensitive configuration
- Feature flags and settings

### 2. Development Workflow

1. **Start with environment check**: `pnpm env:check`
2. **Use appropriate dev script**: `pnpm dev:local` or `pnpm dev:cloud`
3. **Monitor environment indicator** during development
4. **Validate before deployment**: `pnpm env:validate`

### 3. Environment Switching

```bash
# Switch to local development
pnpm dev:local

# Switch to cloud development  
pnpm dev:cloud

# Check what environments are available
pnpm env:info --sections environments,connections
```

### 4. Database Environment Management

```bash
# Check current database status
pnpm db:status

# Switch to local database (if available)
USE_LOCAL_DOCKER=true pnpm dev

# Switch to cloud database (if available)
USE_SUPABASE_CLOUD=true pnpm dev
```

## Troubleshooting

### Common Issues

**Environment Detection Not Working**
```bash
# Check if environment variables are loaded
pnpm env:info --sensitive

# Validate environment configuration
pnpm env:validate --verbose
```

**Database Connection Issues**
```bash
# Check database status
pnpm db:status

# Test database health
node -e "import('./src/lib/db-adaptive.js').then(m => m.checkDatabaseHealth().then(console.log))"
```

**Square Integration Issues**
```bash
# Test Square connection
pnpm square:sandbox

# Check Square configuration
pnpm env:info --sections connections
```

### Debug Mode

Enable debug logging:
```env
DEBUG=true
VERBOSE_LOGGING=true
ENABLE_DEBUG_LOGGING=true
```

View detailed logs:
```bash
# Environment detection logs
pnpm env:check --verbose

# Database connection logs  
pnpm db:status

# Application logs with environment info
pnpm dev  # Check console output
```

## Migration Guide

### From Manual Environment Management

1. **Install the new system**:
   ```bash
   # Environment utilities are already included
   ```

2. **Update your `.env.local`**:
   ```bash
   # Add environment detection variables
   USE_LOCAL_DOCKER=true  # or USE_SUPABASE_CLOUD=true
   ```

3. **Test the new system**:
   ```bash
   pnpm env:check
   ```

4. **Update your workflow**:
   ```bash
   # Instead of: pnpm dev
   # Use: pnpm dev:local or pnpm dev:cloud
   ```

### From Existing Environment Setup

The system is backward compatible. Your existing environment variables will continue to work, with additional detection and management capabilities.

## Advanced Usage

### Custom Environment Detection

```typescript
import { environmentDetection } from '@/lib/env-check';

// Custom validation requirements
const validation = environmentDetection.validate({
  requireDatabase: true,
  requireSquare: false,
  requireRedis: true,
  requireShippo: false,
});

// Get switching capabilities
const switching = environmentDetection.canSwitch();
console.log('Available database environments:', switching.availableTargets.database);
```

### Custom Environment Indicator

```tsx
import { useState, useEffect } from 'react';
import { environmentDetection } from '@/lib/env-check';

function CustomEnvironmentDisplay() {
  const [env, setEnv] = useState(null);
  
  useEffect(() => {
    const environment = environmentDetection.detect();
    setEnv(environment);
  }, []);
  
  if (!env || env.features.isProduction) return null;
  
  return (
    <div className="fixed top-0 left-0 bg-blue-500 text-white px-2 py-1 text-xs">
      {env.app} - {env.database} - {env.square}
    </div>
  );
}
```

### Programmatic Environment Switching

```typescript
import { adaptiveDatabase } from '@/lib/db-adaptive';

async function switchToCloud() {
  try {
    const success = await adaptiveDatabase.switchEnvironment('supabase-cloud');
    if (success) {
      console.log('Successfully switched to cloud database');
    }
  } catch (error) {
    console.error('Failed to switch environment:', error);
  }
}
```

## API Reference

### `environmentDetection`

```typescript
import { environmentDetection } from '@/lib/env-check';

// Detect current environment
const env = environmentDetection.detect();

// Validate environment
const validation = environmentDetection.validate(requirements);

// Get environment info
const info = environmentDetection.getInfo(includeSensitive);

// Create environment logger
const logger = environmentDetection.createLogger();

// Check switching capabilities
const switching = environmentDetection.canSwitch();
```

### `adaptiveDatabase`

```typescript
import { adaptiveDatabase } from '@/lib/db-adaptive';

// Get database client
const client = await adaptiveDatabase.getClient();

// Check health
const health = await adaptiveDatabase.checkHealth();

// Switch environment
await adaptiveDatabase.switchEnvironment('local-docker');

// Run migrations
await adaptiveDatabase.runMigrations();

// Get statistics
const stats = await adaptiveDatabase.getConnectionStats();
```

## Support

For issues with the environment detection system:

1. **Check the environment status**: `pnpm env:check`
2. **Review environment variables**: `pnpm env:info`
3. **Validate configuration**: `pnpm env:validate --verbose`
4. **Check database connection**: `pnpm db:status`
5. **Review logs**: Enable debug mode and check console output