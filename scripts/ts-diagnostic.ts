#!/usr/bin/env tsx

/**
 * This script is designed to help diagnose TypeScript errors during Vercel deployment
 * Run it with: npx tsx scripts/ts-diagnostic.ts
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔍 TypeScript Diagnostic Tool');
console.log('============================');

// Check TypeScript version
try {
  const tsVersion = execSync('npx tsc --version').toString().trim();
  console.log(`TypeScript version: ${tsVersion}`);
} catch (error) {
  console.error('Error getting TypeScript version:', error);
}

// Check tsconfig.json
try {
  const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
  if (fs.existsSync(tsconfigPath)) {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    console.log('\ntsconfig.json settings:');
    console.log('- strict:', tsconfig.compilerOptions?.strict);
    console.log('- noEmit:', tsconfig.compilerOptions?.noEmit);
    console.log('- isolatedModules:', tsconfig.compilerOptions?.isolatedModules);
    console.log('- moduleResolution:', tsconfig.compilerOptions?.moduleResolution);
  } else {
    console.log('tsconfig.json not found!');
  }
} catch (error) {
  console.error('Error reading tsconfig.json:', error);
}

// Show Next.js version
try {
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('\nNext.js version:', packageJson.dependencies?.next);
  console.log('Prisma version:', packageJson.dependencies?.['@prisma/client']);
} catch (error) {
  console.error('Error reading package.json:', error);
}

// Run type check and count errors
console.log('\nRunning type check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ No TypeScript errors found');
} catch (error: unknown) {
  if (error && typeof error === 'object' && 'stdout' in error) {
    const output = (error.stdout as Buffer)?.toString() || '';
    const errorCount = output.match(/Found (\d+) error/)?.[1] || 'unknown number of';
    console.log(`❌ ${errorCount} TypeScript errors found`);
    
    // Extract and categorize errors
    const missingPropErrors = output.match(/Property '([^']+)' is missing/g) || [];
    const notAssignableErrors = output.match(/Type '[^']+' is not assignable to type/g) || [];
    
    if (missingPropErrors.length > 0) {
      console.log('\nMost common missing properties:');
      const props = missingPropErrors.map((e: string) => e.match(/Property '([^']+)' is missing/)?.[1]);
      const propCounts = props.reduce((acc: Record<string, number>, prop: string | undefined) => {
        if (!prop) return acc;
        acc[prop] = (acc[prop] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(propCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([prop, count]) => {
          console.log(`- '${prop}' is missing in ${count} places`);
        });
    }
    
    if (notAssignableErrors.length > 0) {
      console.log('\nType assignment issues found:', notAssignableErrors.length);
    }
  } else {
    console.log('❌ Error running type check');
  }
}

// Provide recommendations
console.log('\n📋 Recommendations:');
console.log('1. Make sure all required properties are provided in objects');
console.log('2. Check for type mismatches between Prisma and your code');
console.log('3. Ensure environment variables are properly typed and available');
console.log('4. Add @ts-ignore comments temporarily for urgent deployments');
console.log('5. Consider using skipTypeCheck in next.config.js for production builds if needed');

console.log('\n✅ Diagnostic complete'); 