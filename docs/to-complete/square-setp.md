# **Square Environment Configuration Plan**

## **Current Domain Setup Analysis**

Based on your Vercel configuration, you have:
- **Development:** `https://development.destinosf.com/`
- **Production:** `https://www.destinosf.com/`

## **Square Environment Configuration Strategy**

### **Option 1: Hybrid Approach (Recommended)**
```typescript
// This matches your current sophisticated setup
const environments = {
  development: {
    catalog: 'production',      // Real product data
    payments: 'sandbox',        // Safe testing
    webhooks: 'development.destinosf.com'
  },
  production: {
    catalog: 'production',      // Real product data  
    payments: 'production',     // Real payments
    webhooks: 'www.destinosf.com'
  }
}
```

### **Option 2: Full Separation (Alternative)**
```typescript
const environments = {
  development: {
    catalog: 'sandbox',         // Test data only
    payments: 'sandbox',        // Safe testing
    webhooks: 'development.destinosf.com'
  },
  production: {
    catalog: 'production',      // Real product data
    payments: 'production',     // Real payments  
    webhooks: 'www.destinosf.com'
  }
}
```

---

## **Environment Variables Setup Plan**

### **Development Environment (`development.destinosf.com`)**

#### **Vercel Environment Variables**
```bash
# Square Configuration - Development
SQUARE_ENVIRONMENT=development
USE_SQUARE_SANDBOX=true
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=true

# Square Tokens
SQUARE_SANDBOX_TOKEN=EAAAl... # Your sandbox token
SQUARE_PRODUCTION_TOKEN=EAAAl... # Your production token (for catalog)
SQUARE_ACCESS_TOKEN=EAAAl... # Fallback to sandbox token

# Webhook Configuration
SQUARE_WEBHOOK_SIGNATURE_KEY=wbhk_... # Sandbox webhook signature
NEXT_PUBLIC_APP_URL=https://development.destinosf.com
```

### **Production Environment (`www.destinosf.com`)**

#### **Vercel Environment Variables**
```bash
# Square Configuration - Production
SQUARE_ENVIRONMENT=production
USE_SQUARE_SANDBOX=false
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=false

# Square Tokens
SQUARE_PRODUCTION_TOKEN=EAAAl... # Your production token
SQUARE_ACCESS_TOKEN=EAAAl... # Same as production token
# SQUARE_SANDBOX_TOKEN not needed in production

# Webhook Configuration  
SQUARE_WEBHOOK_SIGNATURE_KEY=wbhk_... # Production webhook signature
NEXT_PUBLIC_APP_URL=https://www.destinosf.com
```

---

## **Square Dashboard Configuration**

### **1. Webhook Endpoints Setup**

#### **Development Webhooks**
```bash
Webhook URL: https://development.destinosf.com/api/webhooks/square
Environment: Sandbox
Events: payment.created, payment.updated, order.created, order.updated
```

#### **Production Webhooks**
```bash
Webhook URL: https://www.destinosf.com/api/webhooks/square  
Environment: Production
Events: payment.created, payment.updated, order.created, order.updated
```

### **2. Application Settings**

#### **Development Application**
```bash
Application Name: Destino SF (Development)
Redirect URLs: https://development.destinosf.com/auth/callback
Domain: development.destinosf.com
Environment: Sandbox for payments, Production for catalog
```

#### **Production Application**  
```bash
Application Name: Destino SF
Redirect URLs: https://www.destinosf.com/auth/callback
Domain: www.destinosf.com
Environment: Production
```

---

## **Implementation Steps**

### **Step 1: Square Dashboard Setup (30 mins)**

#### **A. Create/Update Applications**
1. **Development App:**
   - Go to Square Developer Dashboard
   - Create new app or update existing "Destino SF (Development)"
   - Set redirect URL to `https://development.destinosf.com/auth/callback`

2. **Production App:**
   - Create/update "Destino SF" production app
   - Set redirect URL to `https://www.destinosf.com/auth/callback`

#### **B. Configure Webhooks**
1. **Development Webhooks:**
   ```bash
   URL: https://development.destinosf.com/api/webhooks/square
   Environment: Sandbox
   ```

2. **Production Webhooks:**
   ```bash
   URL: https://www.destinosf.com/api/webhooks/square
   Environment: Production
   ```

### **Step 2: Vercel Environment Configuration (20 mins)**

#### **A. Development Environment**
```bash
# In Vercel Dashboard -> destino-sf -> Settings -> Environment Variables
# Target: Preview (development branch)

SQUARE_ENVIRONMENT=development
USE_SQUARE_SANDBOX=true
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=true
SQUARE_SANDBOX_TOKEN=[your_sandbox_token]
SQUARE_PRODUCTION_TOKEN=[your_production_token]  
SQUARE_WEBHOOK_SIGNATURE_KEY=[sandbox_webhook_key]
NEXT_PUBLIC_APP_URL=https://development.destinosf.com
```

#### **B. Production Environment**
```bash
# In Vercel Dashboard -> destino-sf -> Settings -> Environment Variables  
# Target: Production

SQUARE_ENVIRONMENT=production
USE_SQUARE_SANDBOX=false
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=false
SQUARE_PRODUCTION_TOKEN=[your_production_token]
SQUARE_ACCESS_TOKEN=[your_production_token]
SQUARE_WEBHOOK_SIGNATURE_KEY=[production_webhook_key]
NEXT_PUBLIC_APP_URL=https://www.destinosf.com
```

### **Step 3: Code Configuration Update (10 mins)**

#### **Update Environment Detection**
```typescript
// src/lib/square/client.ts - Update environment detection
private static initializeConfig(): void {
  const isDevelopment = process.env.VERCEL_URL?.includes('development') || 
                       process.env.NEXT_PUBLIC_APP_URL?.includes('development');
  const isProduction = process.env.VERCEL_URL?.includes('destinosf.com') && 
                      !isDevelopment;

  // Force specific configurations based on domain
  const forceCatalogProduction = isProduction || 
                                process.env.SQUARE_CATALOG_USE_PRODUCTION === 'true';
  const forceTransactionSandbox = isDevelopment && 
                                 process.env.SQUARE_TRANSACTIONS_USE_SANDBOX === 'true';
  
  // Rest of your existing logic...
}
```

### **Step 4: Webhook Configuration Update (15 mins)**

#### **Update Webhook Handler**
```typescript
// src/app/api/webhooks/square/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get('x-square-hmacsha256-signature');
  const body = await request.text();
  
  // Use environment-specific webhook signature
  const webhookSignature = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  
  // Environment-specific validation
  const environment = process.env.SQUARE_ENVIRONMENT || 'development';
  
  logger.info(`Processing Square webhook in ${environment} environment`);
  
  // Rest of your webhook handling...
}
```

---

## **Testing & Validation Plan**

### **Development Testing (`development.destinosf.com`)**
```bash
# Test sandbox payments work
curl -X POST https://development.destinosf.com/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "sourceId": "cnon:card-nonce-ok"}'

# Test webhook endpoint
curl -X POST https://development.destinosf.com/api/webhooks/square \
  -H "x-square-hmacsha256-signature: test"
```

### **Production Testing (`www.destinosf.com`)**
```bash
# Test production connectivity (without real payments)
curl -X GET https://www.destinosf.com/api/square/locations

# Test webhook endpoint
curl -X POST https://www.destinosf.com/api/webhooks/square \
  -H "x-square-hmacsha256-signature: test"
```

---

## **Environment Validation Checklist**

### **Development Environment ✅**
- [ ] Sandbox payments work
- [ ] Production catalog data loads
- [ ] Webhooks receive sandbox events
- [ ] No real money transactions possible

### **Production Environment ✅**
- [ ] Production payments work
- [ ] Production catalog data loads  
- [ ] Webhooks receive production events
- [ ] Real transactions process correctly

### **Security Validation ✅**
- [ ] Different webhook signatures per environment
- [ ] Sandbox tokens don't work in production
- [ ] Production tokens don't leak to development
- [ ] Environment isolation maintained

---

## **Timeline: ~75 minutes total**

This plan maintains your sophisticated hybrid approach while properly isolating environments by domain. The key advantage is that development gets real product data (for realistic testing) but all payments remain in sandbox mode for safety.