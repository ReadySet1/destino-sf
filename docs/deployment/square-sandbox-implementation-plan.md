# Square Development Sandbox Implementation Plan for Vercel

## 🎯 Executive Summary

This document outlines the complete implementation plan for setting up a Square development sandbox environment in Vercel. The plan addresses the current "Base URL missing" error and provides a comprehensive solution for safe payment testing.

## 🚨 Current Issue Analysis

### Problem Identified

- **Error**: "Server configuration error: Base URL missing"
- **Root Cause**: `NEXT_PUBLIC_APP_URL` environment variable not properly configured in Vercel
- **Impact**: Order creation fails, preventing payment testing

### Current Configuration Status

- ✅ Square hybrid mode configured (production catalog + sandbox transactions)
- ✅ Database and email services configured
- ❌ Missing critical environment variables in Vercel
- ❌ Environment validation not enforced

## 📋 Implementation Plan

### Phase 1: Immediate Fix (Completed)

#### 1.1 Environment Variable Validation

- **File**: `src/env.ts`
- **Change**: Made `NEXT_PUBLIC_APP_URL` required instead of optional
- **Impact**: Prevents deployment with missing critical variables

#### 1.2 Quick Fix Script

- **File**: `scripts/fix-vercel-env.sh`
- **Purpose**: Immediate resolution of current issue
- **Usage**: `./scripts/fix-vercel-env.sh`

### Phase 2: Automated Setup (Completed)

#### 2.1 Sandbox Setup Script

- **File**: `scripts/setup-vercel-sandbox.sh`
- **Features**:
  - Interactive environment selection
  - Comprehensive variable configuration
  - Square sandbox credential setup
  - Database and service configuration
- **Usage**: `./scripts/setup-vercel-sandbox.sh`

#### 2.2 Environment Validation

- **File**: `scripts/validate-sandbox-env.ts`
- **Features**:
  - Schema-based validation
  - API connectivity testing
  - Configuration conflict detection
  - Detailed error reporting
- **Usage**: `pnpm validate-sandbox`

### Phase 3: Documentation & Tools (Completed)

#### 3.1 Comprehensive Documentation

- **File**: `docs/deployment/vercel-sandbox-setup.md`
- **Content**:
  - Step-by-step setup instructions
  - Troubleshooting guide
  - Environment variable reference
  - Security considerations

#### 3.2 Package.json Scripts

- **Added Scripts**:
  - `setup-sandbox`: Run automated setup
  - `validate-sandbox`: Validate environment
  - `test-sandbox`: Test configuration
  - `deploy-sandbox`: Deploy with validation
  - `deploy-preview`: Deploy to preview

## 🔧 Technical Implementation

### Environment Configuration Strategy

#### Hybrid Mode (Recommended)

```bash
# Catalog: Production (real products)
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_PRODUCTION_TOKEN=your_production_token

# Transactions: Sandbox (safe testing)
SQUARE_TRANSACTIONS_USE_SANDBOX=true
SQUARE_SANDBOX_TOKEN=your_sandbox_token
USE_SQUARE_SANDBOX=false  # Overridden by specific flags
```

#### Full Sandbox Mode (Alternative)

```bash
# Everything in sandbox
USE_SQUARE_SANDBOX=true
SQUARE_CATALOG_USE_PRODUCTION=false
SQUARE_TRANSACTIONS_USE_SANDBOX=true
```

### Required Environment Variables

| Category        | Variable                   | Required | Purpose                     |
| --------------- | -------------------------- | -------- | --------------------------- |
| **Application** | `NEXT_PUBLIC_APP_URL`      | ✅       | Base URL for order creation |
| **Square**      | `SQUARE_SANDBOX_TOKEN`     | ✅       | Sandbox API access          |
| **Square**      | `SQUARE_LOCATION_ID`       | ✅       | Location for transactions   |
| **Database**    | `DATABASE_URL`             | ✅       | PostgreSQL connection       |
| **Auth**        | `NEXTAUTH_SECRET`          | ✅       | Authentication security     |
| **Email**       | `RESEND_API_KEY`           | ✅       | Order notifications         |
| **Supabase**    | `NEXT_PUBLIC_SUPABASE_URL` | ✅       | Authentication service      |

## 🚀 Deployment Workflow

### 1. Quick Fix (Immediate)

```bash
# Fix current issue
./scripts/fix-vercel-env.sh

# Deploy
vercel --prod

# Test
curl https://your-domain.vercel.app/api/debug/square-config
```

### 2. Full Sandbox Setup (Recommended)

```bash
# Run automated setup
./scripts/setup-vercel-sandbox.sh

# Validate configuration
pnpm validate-sandbox

# Deploy with validation
pnpm deploy-sandbox
```

### 3. Preview Environment

```bash
# Setup preview environment
./scripts/setup-vercel-sandbox.sh  # Choose option 1

# Deploy to preview
pnpm deploy-preview
```

## 🧪 Testing Strategy

### 1. Configuration Testing

```bash
# Test environment variables
pnpm validate-sandbox

# Test Square configuration
curl https://your-domain.vercel.app/api/debug/square-config

# Test API connectivity
curl https://your-domain.vercel.app/api/square/test-connection
```

### 2. Functional Testing

- **Order Creation**: Complete test orders
- **Payment Processing**: Verify sandbox transactions
- **Email Notifications**: Confirm order emails
- **Webhook Processing**: Test Square webhooks

### 3. Integration Testing

```bash
# Run critical tests
pnpm test:e2e:critical

# Test mobile responsiveness
pnpm test:e2e:mobile

# Test payment flows
pnpm test:payments
```

## 🔍 Monitoring & Debugging

### Debug Endpoints

- `/api/debug/square-config` - Square configuration status
- `/api/debug/square-production-fix` - Detailed analysis
- `/api/debug/auth-config` - Authentication status
- `/api/square/test-connection` - API connectivity

### Logging

```bash
# View Vercel logs
vercel logs

# View function logs
vercel logs --function=api/square/sync
```

### Square Dashboard

- Monitor transactions in Square Developer Dashboard
- Check webhook delivery status
- Review API usage and errors

## 🔒 Security Considerations

### Environment Isolation

- **Separate databases** for each environment
- **Different API keys** for sandbox vs production
- **Environment-specific URLs** and configurations

### Token Management

- **Never commit secrets** to version control
- **Rotate tokens regularly**
- **Use least privilege** for API permissions
- **Monitor API usage** for anomalies

### Data Protection

- **Test data only** in sandbox environment
- **No real customer data** in development
- **Secure webhook endpoints** with signature verification

## 📊 Success Metrics

### Technical Metrics

- ✅ Environment validation passes
- ✅ Square API connectivity successful
- ✅ Order creation works without errors
- ✅ Payment processing completes in sandbox
- ✅ Email notifications delivered

### Business Metrics

- ✅ Development velocity increased
- ✅ Payment testing risk eliminated
- ✅ Production stability maintained
- ✅ Team confidence in deployments

## 🔄 Maintenance & Updates

### Regular Tasks

1. **Token Rotation**: Update Square tokens quarterly
2. **Environment Validation**: Run validation before deployments
3. **Configuration Review**: Audit environment variables monthly
4. **Security Updates**: Keep dependencies updated

### Emergency Procedures

```bash
# Rollback deployment
vercel rollback

# Reset environment
./scripts/setup-vercel-sandbox.sh

# Emergency contact: Check Vercel and Square dashboards
```

## 📞 Support & Troubleshooting

### Common Issues

#### 1. "Base URL missing" Error

**Solution**: Run `./scripts/fix-vercel-env.sh`

#### 2. Square Authentication Error

**Solution**:

```bash
# Check configuration
curl https://your-domain.vercel.app/api/debug/square-production-fix

# Update tokens
vercel env add SQUARE_SANDBOX_TOKEN new_token preview
```

#### 3. Database Connection Error

**Solution**: Verify `DATABASE_URL` format and connectivity

### Support Resources

- **Documentation**: `docs/deployment/vercel-sandbox-setup.md`
- **Debug Endpoints**: Built-in API endpoints
- **Validation Scripts**: Automated testing tools
- **Vercel Dashboard**: Deployment and environment management

## 🎯 Next Steps

### Immediate Actions (Next 24 hours)

1. ✅ Run quick fix script
2. ✅ Deploy and test order creation
3. ✅ Verify all debug endpoints work

### Short-term Goals (Next week)

1. ✅ Complete full sandbox setup
2. ✅ Test all payment flows
3. ✅ Document any custom configurations
4. ✅ Train team on new workflow

### Long-term Goals (Next month)

1. ✅ Implement automated testing
2. ✅ Set up monitoring and alerting
3. ✅ Create development guidelines
4. ✅ Plan production migration strategy

## 📝 Conclusion

This implementation plan provides a comprehensive solution for Square sandbox development in Vercel. The automated tools and validation ensure reliable deployments while maintaining security and best practices.

The plan addresses the immediate issue while establishing a robust foundation for future development and testing needs.
