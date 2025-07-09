#!/bin/bash

echo "🔧 Updating Vercel environment variables for database connection fix..."

# Update DATABASE_URL for production (pooled connection)
vercel env add DATABASE_URL production << EOF
postgresql://postgres:83Ny4skXhAPxp3jL@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
EOF

# Update DIRECT_URL for production (direct connection for migrations)
vercel env add DIRECT_URL production << EOF
postgresql://postgres:83Ny4skXhAPxp3jL@db.avfiuivgvkgaovkqjnup.supabase.co:5432/postgres
EOF

echo "✅ Environment variables updated. Deploying..."

# Deploy the changes
vercel deploy --prod

echo "🎉 Deployment complete!"
echo ""
echo "📊 Test the health endpoint:"
echo "curl https://your-domain.vercel.app/api/health"
echo ""
echo "🔍 Monitor the webhook:"
echo "curl https://your-domain.vercel.app/api/webhooks/square"
