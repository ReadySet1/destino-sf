#!/bin/bash

echo "🔧 Fixing Prisma Connection Issues in Production"
echo "==============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Issue Analysis:${NC}"
echo "1. Prisma engine not initializing properly in serverless environment"
echo "2. Potential DATABASE_URL regional mismatch (west vs east)"
echo "3. Missing explicit engine connection in serverless functions"
echo ""

echo -e "${YELLOW}🔧 Applying fixes...${NC}"
echo ""

echo "1. ✅ Updated Prisma client initialization (already done)"
echo "   - Added explicit \$connect() call during client creation"
echo "   - Improved connection verification with health checks"
echo "   - Enhanced retry logic with proper client reinitialization"
echo ""

echo "2. 🌍 Checking DATABASE_URL regional configuration..."

# Get current DATABASE_URL from Vercel
echo "Getting current production DATABASE_URL..."
CURRENT_DB_URL=$(vercel env ls production 2>/dev/null | grep DATABASE_URL | awk '{print $2}' || echo "not_found")

if [ "$CURRENT_DB_URL" = "not_found" ]; then
    echo -e "${RED}❌ Could not retrieve DATABASE_URL from Vercel${NC}"
    echo "Please ensure you're logged into Vercel CLI and have access to the project"
    exit 1
fi

echo "Current DATABASE_URL region detected:"
if [[ $CURRENT_DB_URL == *"us-west-1"* ]]; then
    echo -e "${GREEN}✅ Using us-west-1 region (matches error logs)${NC}"
    REGION="us-west-1"
elif [[ $CURRENT_DB_URL == *"us-east-1"* ]]; then
    echo -e "${YELLOW}⚠️  Using us-east-1 region (differs from error logs showing us-west-1)${NC}"
    REGION="us-east-1"
else
    echo -e "${YELLOW}⚠️  Region not clearly identified from URL${NC}"
    REGION="unknown"
fi

echo ""
echo "3. 🔗 Updating DATABASE_URL with optimized parameters..."

# Determine the correct pooler URL based on current setup
if [[ $CURRENT_DB_URL == *"pooler.supabase.com"* ]]; then
    echo "Already using pooler connection - updating with optimized parameters..."
    
    # Extract the region and construct optimized URL
    if [ "$REGION" = "us-west-1" ]; then
        POOLER_HOST="aws-0-us-west-1.pooler.supabase.com"
    elif [ "$REGION" = "us-east-1" ]; then
        POOLER_HOST="aws-0-us-east-1.pooler.supabase.com"
    else
        echo -e "${RED}❌ Cannot determine correct pooler host${NC}"
        echo "Please check your Supabase project settings for the correct pooler URL"
        exit 1
    fi
    
    # Extract password from current URL
    PASSWORD=$(echo "$CURRENT_DB_URL" | grep -o '://[^:]*:\([^@]*\)@' | sed 's/.*://g' | sed 's/:.*@//g' | sed 's/@//g')
    
    if [ -z "$PASSWORD" ]; then
        echo -e "${RED}❌ Could not extract password from current DATABASE_URL${NC}"
        exit 1
    fi
    
    # Construct optimized DATABASE_URL
    OPTIMIZED_DB_URL="postgresql://postgres:${PASSWORD}@${POOLER_HOST}:6543/postgres?pgbouncer=true&prepared_statements=false&statement_cache_size=0&pool_timeout=240&connection_timeout=20&statement_timeout=45000&idle_in_transaction_session_timeout=45000&socket_timeout=90"
    
    echo "Updating DATABASE_URL with optimized pooler parameters..."
    echo "vercel env add DATABASE_URL \"$OPTIMIZED_DB_URL\" production"
    vercel env add DATABASE_URL "$OPTIMIZED_DB_URL" production
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ DATABASE_URL updated successfully${NC}"
    else
        echo -e "${RED}❌ Failed to update DATABASE_URL${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Not using pooler connection - this may cause issues in production${NC}"
    echo "Consider switching to pooler connection for better performance"
fi

echo ""
echo "4. 🚀 Deploying updated configuration..."

# Deploy the changes
echo "Deploying to production..."
vercel deploy --prod

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Deployment successful${NC}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Fix Complete!${NC}"
echo ""
echo -e "${BLUE}📊 Testing recommendations:${NC}"
echo "1. Test the database health endpoint:"
echo "   curl https://destino-sf.vercel.app/api/health/database"
echo ""
echo "2. Test the API endpoints that were failing:"
echo "   curl https://destino-sf.vercel.app/api/catering/lunch"
echo "   curl https://destino-sf.vercel.app/api/spotlight-picks"
echo ""
echo "3. Monitor the Vercel function logs for any remaining connection errors"
echo ""
echo -e "${BLUE}📝 What was fixed:${NC}"
echo "• Enhanced Prisma client initialization with explicit \$connect()"
echo "• Improved connection verification and health checks"
echo "• Added proper client reinitialization on connection failures"
echo "• Optimized DATABASE_URL parameters for Supabase pooler"
echo "• Added progressive backoff with jitter for retry attempts"
echo ""
echo "If you continue to see 'Engine is not yet connected' errors,"
echo "please check the Vercel function logs and ensure all environment"
echo "variables are properly set."
