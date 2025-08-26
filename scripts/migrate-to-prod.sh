#!/bin/bash

# Production Migration Script
# This script helps migrate schema and data changes to production safely

set -e  # Exit on any error

echo "🚀 Production Migration Script"
echo "=============================="

# Load environment variables
if [ -f .env.production ]; then
    source .env.production
    echo "✅ Loaded production environment variables"
else
    echo "❌ .env.production file not found"
    echo "Please create .env.production with your production database credentials"
    exit 1
fi

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env.production"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p backups

# Backup production database
echo "📦 Backing up production database..."
BACKUP_FILE="backups/prod_$(date +%Y%m%d_%H%M%S).sql"

# Use pg_dump to create backup
if command -v pg_dump &> /dev/null; then
    pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "⚠️  pg_dump not found. Skipping backup creation."
    echo "Please ensure you have PostgreSQL client tools installed."
    read -p "Continue without backup? (y/N): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Aborted"
        exit 1
    fi
fi

# Apply migrations
echo "🚀 Applying migrations to production..."
pnpm prisma migrate deploy

if [ $? -eq 0 ]; then
    echo "✅ Migrations applied successfully"
else
    echo "❌ Migration failed"
    if [ -f "$BACKUP_FILE" ]; then
        echo "💡 You can restore from backup: $BACKUP_FILE"
        echo "   psql \$DATABASE_URL < $BACKUP_FILE"
    fi
    exit 1
fi

# Verify migration
echo "🔍 Verifying migration..."
pnpm prisma db pull
pnpm prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Migration verification complete"
else
    echo "⚠️  Migration verification had issues"
fi

echo ""
echo "✨ Migration complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test your application with the production database"
echo "2. Run any necessary data sync operations"
echo "3. Monitor application logs for any issues"
echo ""
echo "🔄 Backup location: $BACKUP_FILE"
