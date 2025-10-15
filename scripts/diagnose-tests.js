#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Running Test Diagnostics...\n');

// Function to run a command and capture output
function runCommand(command) {
  try {
    const output = execSync(command, {
      encoding: 'utf8',
      env: { ...process.env, CI: 'true' },
    });
    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.stderr || error.message,
    };
  }
}

// 1. Check Node and package versions
console.log('📦 Environment Info:');
console.log('Node version:', process.version);
console.log('NPM version:', runCommand('npm --version').output.trim());
console.log('PNPM version:', runCommand('pnpm --version').output.trim());

// 2. Check if test files exist
console.log('\n📁 Test Files Check:');
const testDirs = [
  'src/__tests__/utils',
  'src/__tests__/lib',
  'src/__tests__/app/api',
  'src/__tests__/components',
];

testDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    const files = fs
      .readdirSync(fullPath)
      .filter(f => f.endsWith('.test.ts') || f.endsWith('.test.tsx'));
    console.log(`✅ ${dir}: ${files.length} test files`);
  } else {
    console.log(`❌ ${dir}: Directory not found`);
  }
});

// 3. Run a simple test to check basic configuration
console.log('\n🧪 Running Basic Test:');
const basicTest = runCommand('pnpm test:basic 2>&1');
if (basicTest.success) {
  console.log('✅ Basic test passed');
} else {
  console.log('❌ Basic test failed:');
  console.log(basicTest.error?.substring(0, 500) || basicTest.output.substring(0, 500));
}

// 4. Check for common issues
console.log('\n🔧 Common Issues Check:');

// Check for TypeScript errors
console.log('Checking TypeScript configuration...');
const tsCheck = runCommand('pnpm type-check-tests 2>&1');
if (tsCheck.success) {
  console.log('✅ TypeScript configuration OK');
} else {
  console.log('⚠️ TypeScript issues found (this might be OK):');
  const errors = tsCheck.error?.split('\n').slice(0, 5).join('\n');
  console.log(errors);
}

// 5. Check Jest configuration
console.log('\n⚙️ Jest Configuration:');
const jestConfig = runCommand('npx jest --showConfig 2>&1 | head -20');
console.log(jestConfig.output.substring(0, 500));

// 6. Run tests with verbose output to see specific failures
console.log('\n📊 Running Tests with Failure Details:');
console.log('Running first 5 tests to identify common issues...\n');

const verboseTest = runCommand('pnpm jest --bail=5 --verbose 2>&1');
if (!verboseTest.success) {
  // Parse and display specific errors
  const output = verboseTest.error || verboseTest.output;
  const lines = output.split('\n');

  // Find FAIL lines
  const failedTests = lines.filter(line => line.includes('FAIL'));
  console.log('Failed test files:');
  failedTests.forEach(test => console.log(`  ❌ ${test}`));

  // Find error messages
  console.log('\nCommon error patterns:');
  const errorPatterns = [
    /Cannot find module/gi,
    /TypeError:/gi,
    /ReferenceError:/gi,
    /SyntaxError:/gi,
    /Mock.*not.*function/gi,
  ];

  errorPatterns.forEach(pattern => {
    const matches = output.match(pattern);
    if (matches) {
      console.log(`  ⚠️ Found ${matches.length} instances of: ${pattern.source}`);
    }
  });

  // Show first actual error
  const errorIndex = output.indexOf('● ');
  if (errorIndex !== -1) {
    console.log('\nFirst test error detail:');
    console.log(output.substring(errorIndex, errorIndex + 1000));
  }
}

console.log('\n📝 Diagnosis Complete!');
console.log('\nRecommendations:');
console.log('1. If seeing "Cannot find module" errors, check moduleNameMapper in jest.config.ts');
console.log('2. If seeing mock errors, ensure jest.setup.js is properly configured');
console.log('3. If seeing TypeScript errors, check tsconfig.test.json');
console.log('4. Run "pnpm test:basic" first to ensure basic setup works');
