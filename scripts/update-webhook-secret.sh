#!/bin/bash

# Update Square Webhook Secret in Vercel
# Usage: ./scripts/update-webhook-secret.sh <webhook_secret>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <webhook_secret>"
    echo "Example: $0 whsec_1234567890abcdef"
    exit 1
fi

WEBHOOK_SECRET="$1"

echo "🔑 Updating Square Webhook Secret in Vercel..."

# Update development environment
echo "Updating development environment..."
vercel env add SQUARE_WEBHOOK_SECRET "$WEBHOOK_SECRET" development --force

# Update preview environment (if needed)
echo "Updating preview environment..."
vercel env add SQUARE_WEBHOOK_SECRET "$WEBHOOK_SECRET" preview --force

# Note: Production should be updated separately for security
echo "✅ Webhook secret updated for development and preview environments"
echo ""
echo "⚠️  For production, please update manually:"
echo "   vercel env add SQUARE_WEBHOOK_SECRET \"$WEBHOOK_SECRET\" production --force"
echo ""
echo "🔄 Redeploy your development environment:"
echo "   vercel --prod" 