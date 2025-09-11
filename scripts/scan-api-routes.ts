#!/usr/bin/env tsx

/**
 * Quick scan script to identify API routes that need database resilience fixes
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const projectRoot = process.cwd();

async function scanRoutes() {
  console.log('🔍 Scanning API routes for database connection issues...\n');
  
  // Find all API route files
  const routeFiles = await glob('src/app/api/**/route.{ts,js}', { 
    cwd: projectRoot,
    absolute: true 
  });
  
  const problematicRoutes: string[] = [];
  const routesWithPrisma: string[] = [];
  const routesWithResilience: string[] = [];
  
  for (const file of routeFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(projectRoot, file);
    
    // Check for Prisma usage
    const hasPrisma = /import.*prisma|prisma\./i.test(content);
    
    // Check for existing resilience patterns
    const hasResilience = 
      /isBuildTime|safeBuildTimeOperation|safeCateringApiOperation/.test(content) ||
      /Can't reach database server.*fallback|Connection terminated.*fallback/i.test(content) ||
      /Build-time detected.*fallback/i.test(content);
    
    if (hasPrisma) {
      routesWithPrisma.push(relativePath);
      
      if (hasResilience) {
        routesWithResilience.push(relativePath);
      } else {
        problematicRoutes.push(relativePath);
      }
    }
  }
  
  console.log(`📊 Scan Results:`);
  console.log(`   Total route files: ${routeFiles.length}`);
  console.log(`   Routes using Prisma: ${routesWithPrisma.length}`);
  console.log(`   Routes with resilience: ${routesWithResilience.length}`);
  console.log(`   Routes needing fixes: ${problematicRoutes.length}\n`);
  
  if (problematicRoutes.length > 0) {
    console.log('❌ Routes that need database resilience fixes:');
    problematicRoutes.forEach(route => {
      console.log(`   - ${route}`);
    });
    console.log('\n💡 Use the fix-api-routes-resilience.ts script to automatically fix these routes.');
  } else {
    console.log('✅ All API routes with Prisma already have resilience patterns!');
  }
  
  if (routesWithResilience.length > 0) {
    console.log('\n✅ Routes already protected:');
    routesWithResilience.forEach(route => {
      console.log(`   - ${route}`);
    });
  }
}

scanRoutes().catch(console.error);
