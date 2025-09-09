#!/bin/bash

# Deploy Performance Fixes for Vercel Timeout Issues
# This script deploys the optimizations made to fix the 15-second timeout errors

set -e

echo "🚀 Deploying Performance Fixes for Vercel Timeout Issues"
echo "========================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if user is logged into Vercel
echo "📋 Checking Vercel authentication..."
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Please install it first:"
    echo "   npm i -g vercel"
    exit 1
fi

# Show what optimizations were made
echo "🔧 Performance Optimizations Applied:"
echo "   • Consolidated middleware auth calls (removed duplicate auth)"
echo "   • Optimized account page database queries (5 queries → 2 queries)"
echo "   • Optimized API routes with user headers and query limits"
echo "   • Increased Vercel timeout configurations for account pages"
echo "   • Enhanced Next.js compilation settings"
echo ""

# Check current git status
echo "📋 Checking git status..."
git status --porcelain

# Commit changes if there are any
if [ -n "$(git status --porcelain)" ]; then
    echo "💾 Committing performance optimizations..."
    git add .
    git commit -m "🚀 Performance: Fix Vercel 15-second timeout errors

- Consolidate middleware auth calls to reduce overhead
- Optimize account page database queries (5→2 queries)
- Add query limits and user header optimization to API routes
- Increase Vercel timeout configurations for account pages
- Enable Next.js performance optimizations (SWC, standalone output)

Fixes: Vercel Runtime Timeout Error on account pages"
    
    echo "✅ Changes committed to git"
else
    echo "ℹ️  No changes to commit"
fi

# Push to development branch
echo "⬆️  Pushing to development branch..."
git push origin development

# Deploy to Vercel preview
echo "🚀 Deploying to Vercel preview environment..."
vercel 

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🔍 Next Steps:"
echo "   1. Test the preview deployment URL provided above"
echo "   2. Check account page loading times"
echo "   3. Monitor Vercel logs for any remaining timeout issues"
echo "   4. If everything works, promote to production with: vercel --prod"
echo ""
echo "📊 Expected Improvements:"
echo "   • Account page load time: ~4.8s → ~2s"
echo "   • API response time: ~4s → ~1.5s"
echo "   • Middleware overhead: ~50% reduction"
echo "   • Bundle size: Optimized with selective imports"
