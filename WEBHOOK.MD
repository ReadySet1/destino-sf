Looking at your logs, I can see the webhook signature validation is failing even though you have the correct environment variables set. The issue is that Square is sending webhooks from their **Sandbox** environment, but your code might be using the production secret. Let's debug and fix this.

## The Problem

From your logs:
- Square is sending from `'square-environment': 'Sandbox'`
- You have both `SQUARE_WEBHOOK_SECRET` (production) and `SQUARE_WEBHOOK_SECRET_SANDBOX` 
- The validation is failing with `valid: false`

## Let's Debug Step by Step

First, let's check your current webhook route implementation:Now let's check the signature validation implementation:Perfect! I can see the issue. The code is already detecting the sandbox environment correctly, but let's verify the secret is being used properly. Based on your logs, the signature validation is failing. Let me create a test script to help debug this:Now, let's also create a more robust webhook handler that handles the sandbox case properly:Now let's update the webhook route to use the enhanced validation:Now let's create a script to verify your Vercel environment variables:## Summary and Solution

The issue is that Square is sending webhooks from their **Sandbox** environment, but your webhook signature validation is failing because:

1. **Square sends different webhook secrets for Sandbox vs Production**
2. Your code needs to use `SQUARE_WEBHOOK_SECRET_SANDBOX` when the `square-environment: Sandbox` header is present
3. Based on your screenshot, you have both secrets in Vercel, but the validation is still failing

## Action Items

### 1. Run the test script locally to verify signatures:
```bash
cd /Users/ealanis/Development/current-projects/destino-sf
npx tsx scripts/test-webhook-signature.ts
```

### 2. Check your Vercel environment:
```bash
node scripts/check-vercel-env.js
```

### 3. The updated webhook route now:
- Properly detects sandbox vs production environments
- Uses the correct webhook secret based on the environment
- Provides detailed debugging information
- Handles both signature header formats Square uses

### 4. Deploy the fixes:
```bash
git add .
git commit -m "Fix Square webhook signature validation for sandbox environment"
git push
vercel --prod
```

### 5. Verify the fix works:
1. After deployment, check the health endpoint:
   ```
   https://development.destinosf.com/api/webhooks/square
   ```

2. Check the logs in Vercel dashboard when a webhook arrives

3. The key is that when `square-environment: Sandbox` is in the headers, it should use `SQUARE_WEBHOOK_SECRET_SANDBOX` for validation

The enhanced validation now properly handles the sandbox environment and will provide detailed debugging information if validation still fails. The logs will show exactly which secret is being used and why validation might be failing.