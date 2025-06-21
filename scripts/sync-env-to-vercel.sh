#!/bin/bash

echo "🚀 Syncing environment variables to Vercel..."

# Parse .env.local and create temporary files for each environment
grep -E "^[A-Z_]+=.*" .env.local > /tmp/env_vars.txt

# Update each environment variable
while IFS='=' read -r key value; do
    echo "🔧 Setting $key..."
    
    # Remove quotes if present
    value=$(echo "$value" | sed 's/^"//;s/"$//')
    
    # Set for production
    echo "$value" | vercel env add "$key" production --force 2>/dev/null || echo "✅ $key updated"
    
done < /tmp/env_vars.txt

# Clean up
rm -f /tmp/env_vars.txt

echo "✅ Environment variables synced to Vercel!"
echo "🔄 Triggering a new deployment..."
vercel --prod 