#!/usr/bin/env tsx

/**
 * Script to automatically fix API routes with database connection resilience
 *
 * This script:
 * 1. Scans all API routes for Prisma usage
 * 2. Identifies routes that don't have resilience patterns
 * 3. Automatically applies database connection resilience fixes
 * 4. Generates a report of changes made
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const apiDir = path.join(projectRoot, 'src', 'app', 'api');

interface RouteAnalysis {
  filePath: string;
  relativePath: string;
  hasPrisma: boolean;
  hasResiliencePattern: boolean;
  needsFix: boolean;
  content: string;
}

interface FixReport {
  totalRoutesScanned: number;
  routesWithPrisma: number;
  routesNeedingFix: number;
  routesFixed: number;
  routesSkipped: number;
  fixedRoutes: string[];
  skippedRoutes: string[];
  errors: string[];
}

/**
 * Recursively find all API route files
 */
function findApiRoutes(dir: string): string[] {
  const routes: string[] = [];

  function scanDirectory(currentDir: string) {
    const entries = fs.readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry === 'route.ts' || entry === 'route.js') {
        routes.push(fullPath);
      }
    }
  }

  scanDirectory(dir);
  return routes;
}

/**
 * Analyze a route file for Prisma usage and resilience patterns
 */
function analyzeRoute(filePath: string): RouteAnalysis {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(projectRoot, filePath);

  // Check for Prisma usage
  const hasPrisma = /import.*prisma|prisma\./i.test(content);

  // Check for existing resilience patterns
  const hasResiliencePattern =
    /isBuildTime|safeBuildTimeOperation|safeCateringApiOperation|isConnectionError/.test(content) ||
    /Can't reach database server.*fallback|Connection terminated.*fallback/i.test(content);

  const needsFix = hasPrisma && !hasResiliencePattern;

  return {
    filePath,
    relativePath,
    hasPrisma,
    hasResiliencePattern,
    needsFix,
    content,
  };
}

/**
 * Generate the resilience imports
 */
function generateResilienceImports(content: string): string {
  // Check if imports already exist
  if (content.includes('isBuildTime') || content.includes('safeBuildTimeOperation')) {
    return content;
  }

  // Find the last import statement
  const importRegex = /^import.*from.*['"'];?$/gm;
  const imports = content.match(importRegex) || [];

  if (imports.length === 0) {
    // No imports found, add at the top
    return `import { isBuildTime, safeBuildTimeOperation } from '@/lib/build-time-utils';\n${content}`;
  }

  // Add after the last import
  const lastImport = imports[imports.length - 1];
  const lastImportIndex = content.indexOf(lastImport) + lastImport.length;

  return (
    content.slice(0, lastImportIndex) +
    `\nimport { isBuildTime, safeBuildTimeOperation } from '@/lib/build-time-utils';` +
    content.slice(lastImportIndex)
  );
}

/**
 * Generate error handling wrapper for database operations
 */
function wrapDatabaseOperations(content: string): string {
  // Pattern for common database operation structures
  const patterns = [
    // Pattern 1: Direct prisma calls in try/catch
    {
      regex:
        /(try\s*{[\s\S]*?)(const\s+\w+\s*=\s*await\s+(?:withRetry\(.*?\)|prisma\.\w+\.[\s\S]*?))([\s\S]*?return\s+NextResponse\.json\([^}]+\)[\s\S]*?}\s*catch)/g,
      replacement: (
        match: string,
        tryPart: string,
        dbCall: string,
        returnPart: string,
        catchPart: string
      ) => {
        return `${tryPart}// Handle build time or database unavailability
    if (isBuildTime()) {
      console.log('🔧 Build-time detected: Using fallback data');
      return NextResponse.json({ success: true, data: [], note: 'Fallback data used due to build-time constraints' });
    }

    ${dbCall}${returnPart}${catchPart}`;
      },
    },

    // Pattern 2: API routes without existing try/catch
    {
      regex:
        /(export\s+async\s+function\s+GET\s*\([^)]*\)\s*{[\s\S]*?)(const\s+\w+\s*=\s*await\s+(?:withRetry\(.*?\)|prisma\.\w+\.[\s\S]*?))([\s\S]*?return\s+NextResponse\.json\([^}]+\))/g,
      replacement: (match: string, fnStart: string, dbCall: string, returnPart: string) => {
        return `${fnStart}try {
    // Handle build time or database unavailability
    if (isBuildTime()) {
      console.log('🔧 Build-time detected: Using fallback data');
      return NextResponse.json({ success: true, data: [], note: 'Fallback data used due to build-time constraints' });
    }

    ${dbCall}${returnPart}
  } catch (error) {
    console.error('❌ Database operation failed:', error);
    
    // Check if it's a connection error
    const isConnectionError = 
      error instanceof Error && (
        error.message.includes("Can't reach database server") ||
        error.message.includes('Connection terminated') ||
        error.message.includes('timeout') ||
        error.message.includes('ECONNRESET') ||
        error.message.includes('ECONNREFUSED')
      );

    if (isConnectionError) {
      console.log('🔄 Database connection failed, using fallback data');
      return NextResponse.json({ success: true, data: [], note: 'Fallback data used due to database connection issues' });
    }

    // For non-connection errors, return proper error response
    return NextResponse.json(
      { success: false, error: 'Database operation failed', details: error.message },
      { status: 500 }
    );
  }`;
      },
    },
  ];

  let updatedContent = content;

  for (const pattern of patterns) {
    updatedContent = updatedContent.replace(pattern.regex, pattern.replacement as any);
  }

  return updatedContent;
}

/**
 * Apply fixes to a route file
 */
function fixRoute(analysis: RouteAnalysis): boolean {
  try {
    let content = analysis.content;

    // Step 1: Add resilience imports
    content = generateResilienceImports(content);

    // Step 2: Wrap database operations with error handling
    content = wrapDatabaseOperations(content);

    // Only write if content actually changed
    if (content !== analysis.content) {
      fs.writeFileSync(analysis.filePath, content, 'utf8');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error fixing route ${analysis.relativePath}:`, error);
    return false;
  }
}

/**
 * Main function to scan and fix all API routes
 */
async function main() {
  console.log('🔍 Scanning API routes for database resilience issues...\n');

  const report: FixReport = {
    totalRoutesScanned: 0,
    routesWithPrisma: 0,
    routesNeedingFix: 0,
    routesFixed: 0,
    routesSkipped: 0,
    fixedRoutes: [],
    skippedRoutes: [],
    errors: [],
  };

  if (!fs.existsSync(apiDir)) {
    console.error(`❌ API directory not found: ${apiDir}`);
    process.exit(1);
  }

  // Find all API routes
  const routeFiles = findApiRoutes(apiDir);
  report.totalRoutesScanned = routeFiles.length;

  console.log(`Found ${routeFiles.length} API route files\n`);

  // Analyze each route
  const analyses: RouteAnalysis[] = [];

  for (const routeFile of routeFiles) {
    try {
      const analysis = analyzeRoute(routeFile);
      analyses.push(analysis);

      if (analysis.hasPrisma) {
        report.routesWithPrisma++;
      }

      if (analysis.needsFix) {
        report.routesNeedingFix++;
      }
    } catch (error) {
      report.errors.push(`Failed to analyze ${routeFile}: ${error}`);
    }
  }

  console.log(`📊 Analysis Results:`);
  console.log(`   Total routes: ${report.totalRoutesScanned}`);
  console.log(`   Routes with Prisma: ${report.routesWithPrisma}`);
  console.log(`   Routes needing fixes: ${report.routesNeedingFix}\n`);

  if (report.routesNeedingFix === 0) {
    console.log('✅ All routes already have resilience patterns!');
    return;
  }

  // Ask for confirmation before making changes
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const shouldProceed = await new Promise<boolean>(resolve => {
    rl.question(`\n🔧 Apply fixes to ${report.routesNeedingFix} routes? (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });

  if (!shouldProceed) {
    console.log('❌ Operation cancelled by user');
    return;
  }

  console.log('\n🔧 Applying fixes...\n');

  // Apply fixes
  for (const analysis of analyses) {
    if (!analysis.needsFix) continue;

    try {
      const wasFixed = fixRoute(analysis);

      if (wasFixed) {
        console.log(`✅ Fixed: ${analysis.relativePath}`);
        report.routesFixed++;
        report.fixedRoutes.push(analysis.relativePath);
      } else {
        console.log(`⚠️  Skipped: ${analysis.relativePath} (no changes needed)`);
        report.routesSkipped++;
        report.skippedRoutes.push(analysis.relativePath);
      }
    } catch (error) {
      console.log(`❌ Failed: ${analysis.relativePath}`);
      report.errors.push(`Failed to fix ${analysis.relativePath}: ${error}`);
    }
  }

  // Generate final report
  console.log('\n📋 Final Report:');
  console.log(`   Routes scanned: ${report.totalRoutesScanned}`);
  console.log(`   Routes with Prisma: ${report.routesWithPrisma}`);
  console.log(`   Routes needing fixes: ${report.routesNeedingFix}`);
  console.log(`   Routes fixed: ${report.routesFixed}`);
  console.log(`   Routes skipped: ${report.routesSkipped}`);
  console.log(`   Errors: ${report.errors.length}`);

  if (report.fixedRoutes.length > 0) {
    console.log('\n✅ Fixed routes:');
    report.fixedRoutes.forEach(route => console.log(`   - ${route}`));
  }

  if (report.errors.length > 0) {
    console.log('\n❌ Errors:');
    report.errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n🎉 Database resilience fixes completed!');
  console.log('\nNext steps:');
  console.log('   1. Review the changes made to ensure they look correct');
  console.log('   2. Test the fixed routes to ensure they work properly');
  console.log('   3. Run your linter to check for any syntax issues');
  console.log('   4. Commit the changes to your repository');
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main, analyzeRoute, fixRoute };
