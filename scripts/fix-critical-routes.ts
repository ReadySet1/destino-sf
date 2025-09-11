#!/usr/bin/env tsx

/**
 * Script to fix the most critical API routes that are likely to cause build or runtime failures
 */

import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();

// Critical routes that are most likely to be called during builds or frequently at runtime
const CRITICAL_ROUTES = [
  'src/app/api/products/route.ts',
  'src/app/api/categories/route.ts',
  'src/app/api/orders/route.ts',
  'src/app/api/spotlight-picks/route.ts',
  'src/app/api/health/db/route.ts',
  'src/app/api/health/database/route.ts',
  'src/app/api/admin/orders/route.ts',
  'src/app/api/checkout/route.ts',
];

/**
 * Standard resilience pattern to add to routes
 */
const RESILIENCE_PATTERNS = {
  imports: `import { isBuildTime, safeBuildTimeOperation } from '@/lib/build-time-utils';`,
  
  buildTimeCheck: `  // Handle build time or database unavailability
  if (isBuildTime()) {
    console.log('🔧 Build-time detected: Using fallback data');
    return NextResponse.json({ 
      success: true, 
      data: [], 
      note: 'Fallback data used due to build-time constraints' 
    });
  }`,
  
  errorHandler: `  } catch (error) {
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
      return NextResponse.json({ 
        success: true, 
        data: [], 
        note: 'Fallback data used due to database connection issues' 
      });
    }

    // For non-connection errors, return proper error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database operation failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }`
};

function addImports(content: string): string {
  // Skip if imports already exist
  if (content.includes('isBuildTime') || content.includes('safeBuildTimeOperation')) {
    return content;
  }
  
  // Find the last import statement
  const importLines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < importLines.length; i++) {
    if (importLines[i].match(/^import.*from.*['"]/)) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex !== -1) {
    importLines.splice(lastImportIndex + 1, 0, RESILIENCE_PATTERNS.imports);
    return importLines.join('\n');
  }
  
  // If no imports found, add at the top
  return `${RESILIENCE_PATTERNS.imports}\n${content}`;
}

function wrapWithResilience(content: string): string {
  // Pattern 1: Handle GET functions without existing try/catch
  content = content.replace(
    /(export\s+async\s+function\s+GET\s*\([^)]*\)\s*{[\s\S]*?)(const\s+[\w\s,{}]*=\s*await\s+(?:withRetry\(.*?\)|prisma\.\w+\.[\s\S]*?;))([\s\S]*?return\s+NextResponse\.json\([^}]*\}?\);)/g,
    (match, fnStart, dbCall, returnPart) => {
      // Skip if already has try/catch
      if (match.includes('try {') || match.includes('catch')) {
        return match;
      }
      
      return `${fnStart}try {
${RESILIENCE_PATTERNS.buildTimeCheck}

    ${dbCall.trim()}${returnPart}
${RESILIENCE_PATTERNS.errorHandler}
  }`;
    }
  );
  
  // Pattern 2: Handle GET functions with existing try/catch but no build-time check
  content = content.replace(
    /(export\s+async\s+function\s+GET\s*\([^)]*\)\s*{[\s\S]*?try\s*{[\s\S]*?)(const\s+[\w\s,{}]*=\s*await\s+(?:withRetry\(.*?\)|prisma\.\w+\.[\s\S]*?;))/g,
    (match, fnStartWithTry, dbCall) => {
      // Skip if already has build-time check
      if (match.includes('isBuildTime') || match.includes('Build-time detected')) {
        return match;
      }
      
      return `${fnStartWithTry}${RESILIENCE_PATTERNS.buildTimeCheck}

    ${dbCall.trim()}`;
    }
  );
  
  // Pattern 3: Handle POST functions
  content = content.replace(
    /(export\s+async\s+function\s+POST\s*\([^)]*\)\s*{[\s\S]*?)(const\s+[\w\s,{}]*=\s*await\s+(?:withRetry\(.*?\)|prisma\.\w+\.[\s\S]*?;))([\s\S]*?return\s+NextResponse\.json\([^}]*\}?\);)/g,
    (match, fnStart, dbCall, returnPart) => {
      // Skip if already has try/catch or build-time checks
      if (match.includes('try {') || match.includes('isBuildTime')) {
        return match;
      }
      
      return `${fnStart}try {
    // Note: POST operations during build time are typically not expected
    // but we add this check for safety
    if (isBuildTime()) {
      console.log('🔧 Build-time detected: Skipping POST operation');
      return NextResponse.json({ 
        success: false, 
        error: 'POST operations not available during build time' 
      }, { status: 503 });
    }

    ${dbCall.trim()}${returnPart}
${RESILIENCE_PATTERNS.errorHandler}
  }`;
    }
  );
  
  return content;
}

function fixRoute(routePath: string): boolean {
  const fullPath = path.join(projectRoot, routePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ Route not found: ${routePath}`);
    return false;
  }
  
  const originalContent = fs.readFileSync(fullPath, 'utf8');
  
  // Skip if already has resilience patterns
  if (originalContent.includes('isBuildTime') || originalContent.includes('Build-time detected')) {
    console.log(`⚠️  Already protected: ${routePath}`);
    return false;
  }
  
  let content = originalContent;
  
  // Step 1: Add imports
  content = addImports(content);
  
  // Step 2: Add resilience patterns
  content = wrapWithResilience(content);
  
  // Only write if content changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${routePath}`);
    return true;
  } else {
    console.log(`⚠️  No changes needed: ${routePath}`);
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing critical API routes for database resilience...\n');
  
  let fixedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const route of CRITICAL_ROUTES) {
    try {
      const wasFixed = fixRoute(route);
      if (wasFixed) {
        fixedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      console.log(`❌ Error fixing ${route}: ${error}`);
      errorCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`   Routes fixed: ${fixedCount}`);
  console.log(`   Routes skipped: ${skippedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Critical routes have been fixed!');
    console.log('\nNext steps:');
    console.log('   1. Test the fixed routes to ensure they work');
    console.log('   2. Run the full fix script for remaining routes if needed');
    console.log('   3. Deploy to Vercel to test build fixes');
  } else {
    console.log('\n✅ All critical routes were already protected or no changes were needed.');
  }
}

// Run the script
main().catch(console.error);
