#!/bin/bash

# Square Sandbox Location ID Fix Script
# This script updates your environment files to use the correct sandbox location ID

echo "🔧 Square Sandbox Location ID Fix"
echo "================================="
echo ""

# Define the sandbox location ID (from the API response)
SANDBOX_LOCATION_ID="FN04F7551EZWX"
PRODUCTION_LOCATION_ID="LMV06M1ER6HCC"

echo "📋 Environment Configuration:"
echo "   Production Location ID: $PRODUCTION_LOCATION_ID"
echo "   Sandbox Location ID:    $SANDBOX_LOCATION_ID"
echo ""

# Function to update environment file
update_env_file() {
    local file=$1
    local backup_file="${file}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ -f "$file" ]; then
        echo "📝 Updating $file..."
        
        # Create backup
        cp "$file" "$backup_file"
        echo "   💾 Backup created: $backup_file"
        
        # Add sandbox location ID if not exists
        if ! grep -q "SQUARE_SANDBOX_LOCATION_ID" "$file"; then
            echo "" >> "$file"
            echo "# SQUARE SANDBOX LOCATION ID (for test payments)" >> "$file"
            echo "SQUARE_SANDBOX_LOCATION_ID=$SANDBOX_LOCATION_ID" >> "$file"
            echo "   ✅ Added SQUARE_SANDBOX_LOCATION_ID"
        else
            # Update existing sandbox location ID
            sed -i.tmp "s/^SQUARE_SANDBOX_LOCATION_ID=.*/SQUARE_SANDBOX_LOCATION_ID=$SANDBOX_LOCATION_ID/" "$file"
            rm -f "${file}.tmp"
            echo "   ✅ Updated SQUARE_SANDBOX_LOCATION_ID"
        fi
        
        echo ""
    else
        echo "   ⚠️  File not found: $file"
        echo ""
    fi
}

# Update all environment files
update_env_file ".env"
update_env_file ".env.development"
update_env_file ".env.local"

echo "🎯 Next Steps:"
echo "1. Restart your development server"
echo "2. Test the Square sandbox payment again"
echo "3. The code will automatically use the correct location ID based on environment"
echo ""

echo "✅ Square sandbox location ID configuration completed!"
