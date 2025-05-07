#!/bin/bash

echo "=== SCRIPT CLEANUP UTILITY ==="
echo "This script will back up unused scripts and clean up the scripts directory."

# Create backup directory if it doesn't exist
echo "Creating backup directory..."
mkdir -p src/scripts/backup

# Explanation of what will happen
echo ""
echo "The following scripts will be KEPT in src/scripts/:"
echo "- check-env.mjs"
echo "- auto-clean-categories.mjs"
echo "- sync-production.mjs"
echo "- identify-unused-scripts.mjs"
echo "- test-db-connection.mjs"
echo "- batch-update-slugs.ts"
echo "- check-square-env.mjs"
echo "- deactivate-obsolete-products.ts"
echo "- cleanup.sh (this script)"

echo ""
echo "All other script files will be moved to src/scripts/backup/"

# Prompt for confirmation
echo ""
read -p "Proceed with cleanup? (y/n): " confirm

if [[ $confirm != "y" && $confirm != "Y" ]]; then
  echo "Cleanup aborted."
  exit 0
fi

# Array of scripts to keep
declare -a keep_scripts=(
  "check-env.mjs"
  "auto-clean-categories.mjs"
  "sync-production.mjs"
  "identify-unused-scripts.mjs"
  "test-db-connection.mjs"
  "batch-update-slugs.ts"
  "check-square-env.mjs"
  "deactivate-obsolete-products.ts"
  "cleanup.sh"
)

# Move scripts to backup directory
echo ""
echo "Moving unused scripts to backup directory..."

for file in src/scripts/*.{js,mjs,ts,cjs}; do
  filename=$(basename "$file")
  
  # Skip if file doesn't exist (glob didn't match any files)
  if [[ ! -f "$file" ]]; then
    continue
  fi
  
  # Check if the file should be kept
  keep=false
  for keep_file in "${keep_scripts[@]}"; do
    if [[ "$filename" == "$keep_file" ]]; then
      keep=true
      break
    fi
  done
  
  if [[ $keep == false ]]; then
    echo "Moving $filename to backup/"
    mv "$file" "src/scripts/backup/"
  fi
done

echo ""
echo "Cleanup completed successfully!"
echo "All unused scripts have been backed up to src/scripts/backup/"
echo "You can delete this directory if you're sure you won't need them." 