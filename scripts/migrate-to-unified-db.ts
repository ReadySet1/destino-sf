#!/usr/bin/env tsx

/**
 * Migration Script: Update all API routes to use unified database client
 *
 * This script automatically updates all API routes that are still using the old
 * database client imports to use the new unified client with proper retry logic.
 */

import { readFile, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

interface FileUpdate {
  file: string;
  before: string;
  after: string;
  type: 'import' | 'usage';
}

async function getAllTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];

  async function scan(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath);
      }
    }
  }

  await scan(dir);
  return files;
}

async function main() {
  console.log('🔄 Database Client Migration Script');
  console.log('=====================================\n');

  // Find all API routes that still use old imports
  const apiFiles = await getAllTsFiles('src/app/api');
  const updates: FileUpdate[] = [];

  console.log(`📁 Found ${apiFiles.length} API files to check\n`);

  for (const file of apiFiles) {
    try {
      const content = await readFile(file, 'utf-8');

      // Check for old database imports
      const oldImports = [
        /import\s*{\s*([^}]*prisma[^}]*)\s*}\s*from\s*['"]@\/lib\/db['"]/g,
        /import\s*{\s*([^}]*db[^}]*)\s*}\s*from\s*['"]@\/lib\/db['"]/g,
        /import\s*{\s*([^}]*safeQuery[^}]*)\s*}\s*from\s*['"]@\/lib\/db-utils['"]/g,
        /import\s*{\s*([^}]*withConnectionManagement[^}]*)\s*}\s*from\s*['"]@\/lib\/db['"]/g,
      ];

      let needsUpdate = false;
      let updatedContent = content;

      // Check for old imports
      for (const importPattern of oldImports) {
        if (importPattern.test(content)) {
          needsUpdate = true;
          break;
        }
      }

      if (needsUpdate) {
        console.log(`🔧 Updating: ${file}`);

        // Replace old imports with unified client
        updatedContent = updatedContent.replace(
          /import\s*{\s*([^}]*)\s*}\s*from\s*['"]@\/lib\/db['"]/g,
          (match, imports) => {
            // Extract imported items and map them to unified client
            const importItems = imports.split(',').map((item: string) => item.trim());
            const unifiedImports = [];

            for (const item of importItems) {
              if (item.includes('prisma')) {
                unifiedImports.push('prisma');
              }
              if (item.includes('withRetry') || item.includes('withConnectionManagement')) {
                unifiedImports.push('withRetry');
              }
              if (item.includes('withTransaction')) {
                unifiedImports.push('withTransaction');
              }
              if (item.includes('ensureConnection')) {
                unifiedImports.push('ensureConnection');
              }
              if (item.includes('checkDatabaseHealth') || item.includes('checkConnection')) {
                unifiedImports.push('getHealthStatus');
              }
            }

            // Add common imports for API routes
            if (!unifiedImports.includes('withRetry')) {
              unifiedImports.push('withRetry');
            }

            const uniqueImports = [...new Set(unifiedImports)];
            return `import { ${uniqueImports.join(', ')} } from '@/lib/db-unified'`;
          }
        );

        // Replace old db-utils imports
        updatedContent = updatedContent.replace(
          /import\s*{\s*([^}]*)\s*}\s*from\s*['"]@\/lib\/db-utils['"]/g,
          ''
        );

        // Replace safeQuery usage with withRetry
        updatedContent = updatedContent.replace(
          /await\s+safeQuery\(\s*\(\)\s*=>\s*/g,
          'await withRetry(() => '
        );

        // Add operation names to withRetry calls that don't have them
        updatedContent = updatedContent.replace(
          /withRetry\(\s*\(\)\s*=>\s*([^)]+)\)\s*\)/g,
          (match, operation) => {
            // Extract operation type for naming
            let operationName = 'database-operation';
            if (operation.includes('findUnique')) operationName = 'find-unique';
            else if (operation.includes('findMany')) operationName = 'find-many';
            else if (operation.includes('count')) operationName = 'count';
            else if (operation.includes('create')) operationName = 'create';
            else if (operation.includes('update')) operationName = 'update';
            else if (operation.includes('delete')) operationName = 'delete';

            return `withRetry(() => ${operation}), 3, '${operationName}')`;
          }
        );

        // Replace withConnectionManagement with withRetry
        updatedContent = updatedContent.replace(/withConnectionManagement\(/g, 'withRetry(');

        // Clean up extra empty import lines
        updatedContent = updatedContent.replace(
          /^\s*import\s*{\s*}\s*from\s*['"][^'"]*['"];\s*$/gm,
          ''
        );

        await writeFile(file, updatedContent);

        updates.push({
          file,
          before: 'Old database imports',
          after: 'Unified database client',
          type: 'import',
        });
      }
    } catch (error) {
      console.warn(`⚠️ Failed to process ${file}:`, (error as Error).message);
    }
  }

  console.log(`\n✅ Migration Summary:`);
  console.log(`   Files updated: ${updates.length}`);
  console.log(`   Total API files: ${apiFiles.length}`);

  if (updates.length > 0) {
    console.log('\n📋 Updated files:');
    updates.forEach(update => {
      console.log(`   ✓ ${update.file}`);
    });

    console.log('\n🔍 Verification Steps:');
    console.log('   1. Run TypeScript check: npx tsc --noEmit');
    console.log('   2. Run linter: npx eslint src/app/api --fix');
    console.log('   3. Test database operations: npx tsx scripts/verify-database-fix.ts');
    console.log('   4. Deploy and monitor logs');

    // Run TypeScript check
    console.log('\n🧪 Running TypeScript check...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('   ✅ TypeScript check passed');
    } catch (error) {
      console.log('   ⚠️ TypeScript errors found - please review manually');
    }
  } else {
    console.log('\n✅ All files are already using the unified database client!');
  }

  console.log('\n🚀 Migration complete! Deploy when ready.');
}

// Run the migration
main().catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
