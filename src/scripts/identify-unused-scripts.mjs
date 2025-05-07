// src/scripts/identify-unused-scripts.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const scriptsDir = __dirname;

// Define the core scripts that are currently in use
const coreScripts = [
  'check-env.mjs',
  'auto-clean-categories.mjs',
  'sync-production.mjs',
  'identify-unused-scripts.mjs' // Include this script itself
];

// Scripts that should not be deleted (might be useful for reference or future use)
const keepForReference = [
  'test-db-connection.mjs', // Useful for debugging database connection
  'batch-update-slugs.ts',  // Might be useful for maintenance
  'check-square-env.mjs',   // Useful for debugging Square connection
  'deactivate-obsolete-products.ts', // Useful for maintenance
];

// Get all script files in the directory
const allScripts = fs.readdirSync(scriptsDir)
  .filter(file => 
    file.endsWith('.js') || 
    file.endsWith('.mjs') || 
    file.endsWith('.ts') ||
    file.endsWith('.cjs')
  );

// Identify potentially unused scripts
const potentiallyUnused = allScripts.filter(script => 
  !coreScripts.includes(script) && 
  !keepForReference.includes(script)
);

// Output results
console.log('=== SCRIPT USAGE ANALYSIS ===');
console.log('\nCORE SCRIPTS (CURRENTLY IN USE):');
coreScripts.forEach(script => console.log(`- ${script}`));

console.log('\nKEPT FOR REFERENCE:');
keepForReference.forEach(script => console.log(`- ${script}`));

console.log('\nPOTENTIALLY UNUSED SCRIPTS:');
potentiallyUnused.forEach(script => {
  // Get file size for information
  const stats = fs.statSync(path.join(scriptsDir, script));
  const size = (stats.size / 1024).toFixed(2); // Size in KB
  console.log(`- ${script} (${size} KB)`);
});

console.log('\nRECOMMENDATION:');
console.log('Run the following commands to back up unused scripts and then remove them:');
console.log('\n# 1. Create backup directory');
console.log('mkdir -p src/scripts/backup');
console.log('\n# 2. Move unused scripts to backup');
potentiallyUnused.forEach(script => {
  console.log(`mv src/scripts/${script} src/scripts/backup/`);
}); 