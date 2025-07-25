#!/bin/bash

# Clean up deprecated SQUARE_WEBHOOK_SIGNATURE_KEY environment variables
# The codebase now uses SQUARE_WEBHOOK_SECRET consistently

set -e

echo "🧹 Cleaning up deprecated webhook environment variables..."

# Remove SQUARE_WEBHOOK_SIGNATURE_KEY from all environments
echo "Removing SQUARE_WEBHOOK_SIGNATURE_KEY from development..."
vercel env rm SQUARE_WEBHOOK_SIGNATURE_KEY development || echo "Variable not found in development"

echo "Removing SQUARE_WEBHOOK_SIGNATURE_KEY from preview..."
vercel env rm SQUARE_WEBHOOK_SIGNATURE_KEY preview || echo "Variable not found in preview"

echo "Removing SQUARE_WEBHOOK_SIGNATURE_KEY from production..."
vercel env rm SQUARE_WEBHOOK_SIGNATURE_KEY production || echo "Variable not found in production"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📋 Current webhook environment should only use:"
echo "   SQUARE_WEBHOOK_SECRET (for all environments)"
echo ""
echo "🔄 Remember to redeploy after cleanup:"
echo "   vercel --prod" 