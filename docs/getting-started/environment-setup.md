# Square Environment Configuration Template

Copy the content below to your `.env.local` file and replace the placeholder values with your actual Square tokens.

```bash
# === SQUARE HYBRID CONFIGURATION ===
# This setup allows you to:
# - Use PRODUCTION for catalog operations (to get real product data)
# - Use SANDBOX for transaction operations (to test payments safely)

SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=true

# === PRODUCTION TOKENS (for catalog operations) ===
# Get these from: https://developer.squareup.com/apps → Your App → Production → Credentials
SQUARE_PRODUCTION_TOKEN=your_production_token_here_starts_with_EAAA
SQUARE_LOCATION_ID=your_location_id_here_starts_with_L

# === SANDBOX TOKENS (for transaction testing) ===
# Get these from: https://developer.squareup.com/apps → Your App → Sandbox → Credentials
SQUARE_SANDBOX_TOKEN=your_sandbox_token_here_starts_with_EAAA
SQUARE_SANDBOX_APPLICATION_ID=your_sandbox_app_id_here

# === WEBHOOK CONFIGURATION ===
SQUARE_WEBHOOK_SIGNATURE_KEY=your_webhook_signature_key

# === LEGACY SUPPORT (fallback if SQUARE_PRODUCTION_TOKEN not set) ===
SQUARE_ACCESS_TOKEN=your_production_token_here_starts_with_EAAA
USE_SQUARE_SANDBOX=false
```

## Quick Setup Steps

1. **Copy the template above to your `.env.local` file**

2. **Get your Production Token:**
   - Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
   - Select your application
   - Go to **Production** tab
   - Copy the **Access Token** (starts with `EAAA`)
   - Replace `your_production_token_here_starts_with_EAAA`

3. **Get your Sandbox Token:**
   - In the same Square app
   - Go to **Sandbox** tab
   - Copy the **Access Token** (starts with `EAAA`)
   - Replace `your_sandbox_token_here_starts_with_EAAA`

4. **Get your Location ID:**
   - In Square Dashboard, go to **Account & Settings** → **Locations**
   - Copy the Location ID (starts with `L`)
   - Replace `your_location_id_here_starts_with_L`

5. **Test your configuration:**

   ```bash
   # Start your dev server
   pnpm dev

   # In another terminal, test the configuration
   curl http://localhost:3000/api/debug/square-config
   ```

## Alternative Configurations

If you want a different setup, uncomment one of these sections in your `.env.local`:

### Full Production Mode (be careful - real transactions!)

```bash
SQUARE_CATALOG_USE_PRODUCTION=true
SQUARE_TRANSACTIONS_USE_SANDBOX=false
USE_SQUARE_SANDBOX=false
```

### Full Sandbox Mode (everything in sandbox)

```bash
SQUARE_CATALOG_USE_PRODUCTION=false
SQUARE_TRANSACTIONS_USE_SANDBOX=true
USE_SQUARE_SANDBOX=true
```
