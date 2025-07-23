# Square API Authentication Setup Guide

This guide will help you fix the authentication issues with the Square API.

## Error Summary

The application is experiencing the following issues:

1. **Production Token Authentication Error**: Your Square production token is invalid or expired
2. **Sandbox Token Configuration Error**: The Square sandbox token is not configured
3. **DNS Resolution Issue**: The application cannot connect to `sandbox.squareup.com`
4. **Next.js Image Configuration Warning**: Using deprecated `images.domains` instead of `remotePatterns`

## Solutions Implemented

We've made the following code changes to fix these issues:

1. Improved token selection logic in `src/lib/square/catalog-api.ts`
2. Updated Next.js config to use `remotePatterns` instead of `domains` in `next.config.js`
3. Added DNS resolution testing in the connection test API
4. Created test scripts to verify API connectivity
5. Added a token updater script to easily update tokens

## How to Fix the Authentication Issues

### 1. Update Your API Tokens

You need to update your Square API tokens in your `.env.local` file.

Create or edit your `.env.local` file with the following variables:

```
# Square API Configuration
# This is the token used for production environment
SQUARE_ACCESS_TOKEN=your_production_token_here
SQUARE_PRODUCTION_TOKEN=your_production_token_here

# This is the token used for sandbox/development environment
SQUARE_SANDBOX_TOKEN=your_sandbox_token_here

# Set to 'true' to use the sandbox environment, 'false' for production
USE_SQUARE_SANDBOX=false
```

### 2. Obtain New Square Tokens

If your tokens are expired or invalid, you'll need to create new ones:

1. Go to the [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Select your application
3. Navigate to the "Credentials" tab
4. Generate new access tokens for both production and sandbox environments
5. Update your `.env.local` file with these new tokens

### 3. Test Your Connection

After updating your tokens, test the connection using the provided script:

```bash
npm run script -- src/scripts/test-square-connection.ts
```

Or use the API endpoint:

```
GET /api/square/test-connection
```

### 4. DNS Resolution Issues

If you're experiencing DNS resolution issues with `sandbox.squareup.com`:

1. Check your internet connection
2. Check if your firewall or network is blocking these domains
3. Try using a different DNS server
4. If using a VPN, try disabling it temporarily

### 5. Constraint Violations During Sync

The warnings about constraint violations during product sync are expected behavior. The system is detecting duplicate products and updating them instead of creating new ones.

## Additional Scripts

### Token Updater

Use the token updater script to easily update your Square tokens:

```bash
# Update production token
npm run script -- src/scripts/update-square-token.ts --production --token YOUR_NEW_TOKEN

# Update sandbox token
npm run script -- src/scripts/update-square-token.ts --sandbox --token YOUR_NEW_SANDBOX_TOKEN
```

## Need Further Help?

If you continue to experience issues:

- Check the Square Developer status page for any outages
- Verify your token permissions have the necessary scopes (ITEMS_READ, MERCHANT_PROFILE_READ, etc.)
- Consider regenerating your tokens if they are older than 30 days
- Check your Square app settings to ensure the correct redirect URLs are configured
