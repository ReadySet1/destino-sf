#!/bin/bash

# Update Vercel DATABASE_URL / DIRECT_URL from your local environment.
# Export these before running:
#   export DATABASE_URL_VAL='postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true'
#   export DIRECT_URL_VAL='postgresql://...supabase.co:5432/postgres'

set -euo pipefail

: "${DATABASE_URL_VAL:?Set DATABASE_URL_VAL before running}"
: "${DIRECT_URL_VAL:?Set DIRECT_URL_VAL before running}"

echo "🔧 Updating Vercel environment variables for database connection fix..."

vercel env add DATABASE_URL production <<EOF
$DATABASE_URL_VAL
EOF

vercel env add DIRECT_URL production <<EOF
$DIRECT_URL_VAL
EOF

echo "✅ Environment variables updated. Deploying..."
vercel deploy --prod

echo "🎉 Deployment complete!"
