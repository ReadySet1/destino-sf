#!/bin/bash

# Setup Environment Files for Database Differentiation
# This script helps set up .env.development and .env.production files

set -e

echo "🔧 Environment Files Setup"
echo "=========================="
echo ""
echo "This script will help you set up environment files for database differentiation."
echo "The sync script needs .env.development and .env.production files."
echo ""

# Check current setup
if [ -f .env.development ] && [ -f .env.production ]; then
    echo "✅ Both .env.development and .env.production already exist!"
    echo ""
    echo "Current database URLs:"
    echo "Development: $(grep DATABASE_URL .env.development | cut -d'=' -f2 | cut -c1-50)..."
    echo "Production:  $(grep DATABASE_URL .env.production | cut -d'=' -f2 | cut -c1-50)..."
    echo ""
    read -p "Do you want to recreate these files? (y/N): " recreate
    if [ "$recreate" != "y" ]; then
        echo "Setup cancelled. Existing files preserved."
        exit 0
    fi
fi

echo "📋 Setting up environment files..."
echo ""

# Option 1: Use existing .env as development
if [ -f .env ]; then
    echo "Option 1: Use existing .env as development environment"
    echo "This will copy your current .env to .env.development"
    echo ""
    read -p "Use this option? (y/N): " use_existing
    
    if [ "$use_existing" = "y" ]; then
        cp .env .env.development
        echo "✅ Created .env.development from existing .env"
        
        # Extract current DATABASE_URL for reference
        if grep -q DATABASE_URL .env; then
            CURRENT_DB=$(grep DATABASE_URL .env | cut -d'=' -f2- | tr -d '"')
            echo "   Development DATABASE_URL: ${CURRENT_DB:0:50}..."
        fi
    fi
fi

# Setup production environment
echo ""
echo "🚀 Setting up production environment file..."
echo ""
echo "You have several options for the production database:"
echo "1. Manual entry (enter your production DATABASE_URL)"
echo "2. Use Supabase MCP to get connection string"
echo "3. Copy from existing environment"
echo ""

read -p "Choose option (1/2/3): " prod_option

case $prod_option in
    1)
        echo ""
        echo "📝 Manual DATABASE_URL entry"
        echo "Please enter your production DATABASE_URL:"
        echo "(Format: postgresql://user:password@host:port/database)"
        read -s -p "Production DATABASE_URL: " PROD_DB_URL
        echo ""
        
        if [ -z "$PROD_DB_URL" ]; then
            echo "❌ No DATABASE_URL provided"
            exit 1
        fi
        
        # Create .env.production
        if [ -f .env.development ]; then
            cp .env.development .env.production
            # Replace DATABASE_URL
            sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"$PROD_DB_URL\"|" .env.production
            rm .env.production.bak
        else
            echo "DATABASE_URL=\"$PROD_DB_URL\"" > .env.production
        fi
        
        echo "✅ Created .env.production with your DATABASE_URL"
        ;;
        
    2)
        echo ""
        echo "🔗 Using Supabase MCP to get connection string..."
        echo "Please run the following command to get your production database details:"
        echo ""
        echo "   Use Supabase MCP tools to:"
        echo "   1. List your projects: mcp_supabase-destino_list_projects"
        echo "   2. Get project details with the connection string"
        echo ""
        echo "After getting the connection string, run this script again with option 1."
        exit 0
        ;;
        
    3)
        echo ""
        echo "📋 Available environment files to copy from:"
        ls -la .env* 2>/dev/null | grep -v ".env.development\|.env.production" || echo "No other .env files found"
        echo ""
        read -p "Enter filename to copy from (e.g., .env.staging): " copy_from
        
        if [ ! -f "$copy_from" ]; then
            echo "❌ File $copy_from not found"
            exit 1
        fi
        
        cp "$copy_from" .env.production
        echo "✅ Created .env.production from $copy_from"
        echo "⚠️  Please verify the DATABASE_URL in .env.production points to production!"
        ;;
        
    *)
        echo "❌ Invalid option selected"
        exit 1
        ;;
esac

# Verify setup
echo ""
echo "🔍 Verifying setup..."

if [ -f .env.development ]; then
    echo "✅ .env.development exists"
    if grep -q DATABASE_URL .env.development; then
        DEV_DB=$(grep DATABASE_URL .env.development | cut -d'=' -f2- | tr -d '"')
        echo "   Development DB: ${DEV_DB:0:50}..."
    else
        echo "   ⚠️  No DATABASE_URL found in .env.development"
    fi
else
    echo "❌ .env.development missing"
fi

if [ -f .env.production ]; then
    echo "✅ .env.production exists"
    if grep -q DATABASE_URL .env.production; then
        PROD_DB=$(grep DATABASE_URL .env.production | cut -d'=' -f2- | tr -d '"')
        echo "   Production DB:  ${PROD_DB:0:50}..."
    else
        echo "   ⚠️  No DATABASE_URL found in .env.production"
    fi
else
    echo "❌ .env.production missing"
fi

echo ""
echo "🎯 Setup Summary"
echo "================"

if [ -f .env.development ] && [ -f .env.production ]; then
    echo "✅ Environment files are ready for database differentiation!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Verify DATABASE_URLs point to correct databases"
    echo "2. Run: ./scripts/cleanup-stuck-sync.sh (if needed)"
    echo "3. Run: ./scripts/sync-dev-to-prod.sh"
    echo "4. Run: ./scripts/validate-migration.sh"
    echo "5. Run Square sync from admin panel"
else
    echo "❌ Setup incomplete. Please run this script again."
    echo ""
    echo "Required files:"
    echo "- .env.development (with development DATABASE_URL)"
    echo "- .env.production (with production DATABASE_URL)"
fi

echo ""
echo "📚 For more information, see: docs/appendix/environment-variables.md"
