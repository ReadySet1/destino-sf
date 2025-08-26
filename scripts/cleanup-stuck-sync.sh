#!/bin/bash

# Clean Up Stuck Sync Records
# This script cleans up stuck sync records in the database

set -e  # Exit on any error

echo "🧹 Cleanup Stuck Sync Records"
echo "=============================="
echo ""
echo "This script will clean up stuck sync records in the production database."
echo "Stuck records are those with status 'RUNNING' or 'PENDING' that started more than 1 hour ago."
echo ""

read -p "Are you sure you want to continue? (y/N): " confirm
if [ "$confirm" != "y" ]; then
    echo "Aborted"
    exit 1
fi

# Determine which database to use
if [ -f .env.production ]; then
    echo "📋 Using production environment..."
    source .env.production
    DB_TYPE="production"
elif [ -f .env.local ]; then
    echo "📋 Using local environment..."
    source .env.local
    DB_TYPE="local"
else
    echo "❌ No environment file found (.env.production or .env.local)"
    exit 1
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in environment file"
    exit 1
fi

echo "🔍 Checking for stuck sync records..."

# Check current stuck records
STUCK_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM user_sync_logs WHERE status IN ('RUNNING', 'PENDING') AND \"startTime\" < NOW() - INTERVAL '1 hour';")
echo "   Found $STUCK_COUNT stuck sync records"

if [ "$STUCK_COUNT" -eq 0 ]; then
    echo "✅ No stuck sync records found. Database is clean!"
    exit 0
fi

echo ""
echo "📋 Stuck sync records details:"
psql "$DATABASE_URL" -c "
SELECT 
    id,
    status,
    \"startTime\",
    message,
    \"userId\"
FROM user_sync_logs 
WHERE status IN ('RUNNING', 'PENDING') 
  AND \"startTime\" < NOW() - INTERVAL '1 hour'
ORDER BY \"startTime\" DESC;
"

echo ""
read -p "Clean up these $STUCK_COUNT stuck records? (y/N): " confirm_cleanup
if [ "$confirm_cleanup" != "y" ]; then
    echo "Cleanup cancelled"
    exit 0
fi

# Create backup of affected records
echo "📦 Creating backup of stuck records..."
BACKUP_FILE="backups/stuck_sync_cleanup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p backups

psql "$DATABASE_URL" -c "
COPY (
    SELECT * FROM user_sync_logs 
    WHERE status IN ('RUNNING', 'PENDING') 
      AND \"startTime\" < NOW() - INTERVAL '1 hour'
) TO STDOUT WITH CSV HEADER;
" > "$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_FILE"

# Clean up stuck records
echo "🧹 Cleaning up stuck sync records..."
UPDATED_COUNT=$(psql "$DATABASE_URL" -t -c "
UPDATE user_sync_logs 
SET 
    status = 'FAILED', 
    \"endTime\" = NOW(), 
    message = COALESCE(message || ' | ', '') || 'Sync terminated due to timeout (auto-cleanup)'
WHERE status IN ('RUNNING', 'PENDING') 
  AND \"startTime\" < NOW() - INTERVAL '1 hour'
RETURNING id;
" | wc -l)

echo "✅ Cleaned up $UPDATED_COUNT stuck sync records"

# Verify cleanup
echo ""
echo "🔍 Verifying cleanup..."
REMAINING_STUCK=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM user_sync_logs WHERE status IN ('RUNNING', 'PENDING') AND \"startTime\" < NOW() - INTERVAL '1 hour';")

if [ "$REMAINING_STUCK" -eq 0 ]; then
    echo "✅ All stuck records have been cleaned up!"
else
    echo "⚠️  $REMAINING_STUCK stuck records still remain"
fi

# Show recent sync status
echo ""
echo "📋 Recent sync activity:"
psql "$DATABASE_URL" -c "
SELECT 
    status,
    COUNT(*) as count,
    MAX(\"startTime\") as latest
FROM user_sync_logs 
WHERE \"startTime\" > NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY latest DESC;
"

echo ""
echo "🎯 Cleanup Summary"
echo "=================="
echo "Database: $DB_TYPE"
echo "Records cleaned: $UPDATED_COUNT"
echo "Backup location: $BACKUP_FILE"
echo ""
echo "✅ Database is now ready for new sync operations!"
