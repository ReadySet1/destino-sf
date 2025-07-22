#!/usr/bin/env tsx

/**
 * Safe Cleanup Workflow Script
 * 
 * This master script orchestrates a complete safety workflow for cleaning testing orders:
 * 1. Full database backup before any changes
 * 2. Order-specific backup for granular restore
 * 3. Testing order cleanup with all safety features
 * 4. Verification and rollback capabilities
 * 
 * This is the RECOMMENDED way to clean testing orders as it provides multiple
 * layers of safety and recovery options.
 * 
 * Usage:
 *   pnpm tsx src/scripts/safe-cleanup-workflow.ts --preview
 *   pnpm tsx src/scripts/safe-cleanup-workflow.ts --execute
 *   pnpm tsx src/scripts/safe-cleanup-workflow.ts --test-emails-only
 *   pnpm tsx src/scripts/safe-cleanup-workflow.ts --from="2024-01-01" --to="2024-01-31"
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const execAsync = promisify(exec);

interface WorkflowConfig {
  // Mode settings
  execute: boolean;
  testEmailsOnly: boolean;
  
  // Date range for cleanup
  fromDate?: string;
  toDate?: string;
  
  // Backup settings
  createFullBackup: boolean;
  createOrderBackup: boolean;
  backupFormat: 'custom' | 'sql' | 'directory';
  compressBackups: boolean;
  
  // Safety settings
  confirmSteps: boolean;
  verifyBackups: boolean;
  pauseBetweenSteps: boolean;
  
  // Cleanup settings
  includeOldOrders: boolean;
  excludeOrderIds: string[];
  
  // Advanced options
  retentionDays: number;
  parallelJobs: number;
}

interface WorkflowResult {
  success: boolean;
  steps: StepResult[];
  totalDuration: number;
  backups: {
    database?: string;
    orders?: string;
  };
  cleanup: {
    ordersDeleted: number;
    dataDeleted: number;
  };
  errors: string[];
}

interface StepResult {
  step: string;
  success: boolean;
  duration: number;
  message: string;
  artifacts?: string[];
}

/**
 * Default configuration with safety-first settings
 */
const DEFAULT_CONFIG: WorkflowConfig = {
  execute: false, // Default to preview mode
  testEmailsOnly: false,
  createFullBackup: true,
  createOrderBackup: true,
  backupFormat: 'custom',
  compressBackups: true,
  confirmSteps: true,
  verifyBackups: true,
  pauseBetweenSteps: false,
  includeOldOrders: false,
  excludeOrderIds: [],
  retentionDays: 30,
  parallelJobs: 4,
};

/**
 * Parse command line arguments
 */
function parseArgs(): WorkflowConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--preview':
        config.execute = false;
        break;
      case '--execute':
        config.execute = true;
        break;
      case '--test-emails-only':
        config.testEmailsOnly = true;
        break;
      case '--from':
        config.fromDate = args[++i];
        break;
      case '--to':
        config.toDate = args[++i];
        break;
      case '--no-full-backup':
        config.createFullBackup = false;
        break;
      case '--no-order-backup':
        config.createOrderBackup = false;
        break;
      case '--backup-format':
        const format = args[++i] as 'custom' | 'sql' | 'directory';
        if (['custom', 'sql', 'directory'].includes(format)) {
          config.backupFormat = format;
        }
        break;
      case '--no-compress':
        config.compressBackups = false;
        break;
      case '--no-confirm':
        config.confirmSteps = false;
        break;
      case '--no-verify':
        config.verifyBackups = false;
        break;
      case '--pause-steps':
        config.pauseBetweenSteps = true;
        break;
      case '--include-old':
        config.includeOldOrders = true;
        break;
      case '--exclude-id':
        config.excludeOrderIds.push(args[++i]);
        break;
      case '--retention-days':
        config.retentionDays = parseInt(args[++i]) || DEFAULT_CONFIG.retentionDays;
        break;
      case '--parallel-jobs':
        config.parallelJobs = parseInt(args[++i]) || DEFAULT_CONFIG.parallelJobs;
        break;
      case '--help':
        showHelp();
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.warn(`⚠️  Unknown argument: ${arg}`);
        }
    }
  }

  return config;
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
🛡️  Safe Cleanup Workflow

This script provides a complete safety workflow for cleaning testing orders:
1. Full database backup
2. Order-specific backup  
3. Testing order cleanup
4. Verification and rollback options

USAGE:
  pnpm tsx src/scripts/safe-cleanup-workflow.ts [OPTIONS]

MODES:
  --preview              Preview mode - show what would be done (default)
  --execute              Execute the full workflow
  --test-emails-only     Only clean orders with test email patterns

DATE RANGE:
  --from="YYYY-MM-DD"    Clean orders from this date
  --to="YYYY-MM-DD"      Clean orders up to this date

BACKUP OPTIONS:
  --no-full-backup       Skip full database backup
  --no-order-backup      Skip order-specific backup  
  --backup-format=TYPE   Database backup format: custom, sql, directory
  --no-compress          Disable backup compression

SAFETY OPTIONS:
  --no-confirm           Skip confirmation prompts
  --no-verify            Skip backup verification
  --pause-steps          Pause between workflow steps

CLEANUP OPTIONS:
  --include-old          Include old orders (>90 days) in cleanup
  --exclude-id=ID        Exclude specific order ID from cleanup
  --retention-days=N     Keep backups for N days (default: 30)

EXAMPLES:
  # Preview full workflow (recommended first step)
  pnpm tsx src/scripts/safe-cleanup-workflow.ts --preview

  # Execute safe cleanup of test emails only
  pnpm tsx src/scripts/safe-cleanup-workflow.ts --execute --test-emails-only

  # Clean orders from specific date range with SQL backups
  pnpm tsx src/scripts/safe-cleanup-workflow.ts --execute --from="2024-01-01" --to="2024-01-31" --backup-format=sql

  # Full cleanup with all safety features
  pnpm tsx src/scripts/safe-cleanup-workflow.ts --execute --include-old

  # Quick preview without database backup (faster)
  pnpm tsx src/scripts/safe-cleanup-workflow.ts --preview --no-full-backup

SAFETY FEATURES:
  - Multiple backup layers (database + order-specific)
  - Step-by-step confirmation
  - Automatic verification
  - Rollback capabilities
  - Comprehensive logging
  - Transaction safety

WORKFLOW STEPS:
  1. 💾 Create full database backup
  2. 🔍 Analyze orders to be cleaned
  3. 📦 Create order-specific backup
  4. 🧹 Execute order cleanup
  5. ✅ Verify results
  6. 📊 Generate comprehensive report

RECOVERY OPTIONS:
  If something goes wrong, you can:
  - Restore from full database backup
  - Restore specific orders from order backup
  - Both backups include metadata for easy identification
  `);
}

/**
 * Execute a shell command and capture output
 */
async function executeCommand(
  command: string, 
  description: string,
  options: { cwd?: string; env?: Record<string, string> } = {}
): Promise<StepResult> {
  const startTime = Date.now();
  console.log(`🔄 ${description}...`);
  
  try {
    const result = await execAsync(command, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env }
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ ${description} completed in ${(duration / 1000).toFixed(2)}s`);
    
    return {
      step: description,
      success: true,
      duration,
      message: 'Completed successfully',
      artifacts: []
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ ${description} failed: ${errorMessage}`);
    
    return {
      step: description,
      success: false,
      duration,
      message: errorMessage,
      artifacts: []
    };
  }
}

/**
 * Create full database backup
 */
async function createDatabaseBackup(config: WorkflowConfig): Promise<StepResult> {
  console.log('\n📦 STEP 1: Creating full database backup');
  console.log('========================================');
  
  if (!config.createFullBackup) {
    console.log('⏭️  Skipping database backup (--no-full-backup)');
    return {
      step: 'Database Backup',
      success: true,
      duration: 0,
      message: 'Skipped by configuration'
    };
  }

  const backupArgs = [
    `--format=${config.backupFormat}`,
    config.compressBackups ? '--compress' : '--no-compress',
    config.verifyBackups ? '--verify' : '--no-verify',
    `--retention-days=${config.retentionDays}`
  ];

  if (config.backupFormat === 'directory') {
    backupArgs.push(`--parallel-jobs=${config.parallelJobs}`);
  }

  const command = `pnpm tsx src/scripts/backup-database.ts ${backupArgs.join(' ')}`;
  
  return await executeCommand(
    command, 
    'Full database backup'
  );
}

/**
 * Analyze orders that would be cleaned
 */
async function analyzeOrders(config: WorkflowConfig): Promise<StepResult> {
  console.log('\n🔍 STEP 2: Analyzing orders to be cleaned');
  console.log('=========================================');

  const cleanupArgs = [
    '--dry-run', // Always dry run for analysis
  ];

  if (config.testEmailsOnly) {
    cleanupArgs.push('--test-emails-only');
  }
  
  if (config.fromDate) {
    cleanupArgs.push(`--from="${config.fromDate}"`);
  }
  
  if (config.toDate) {
    cleanupArgs.push(`--to="${config.toDate}"`);
  }
  
  if (config.includeOldOrders) {
    cleanupArgs.push('--include-old');
  }
  
  config.excludeOrderIds.forEach(id => {
    cleanupArgs.push(`--exclude-id="${id}"`);
  });

  const command = `pnpm tsx src/scripts/clean-testing-orders.ts ${cleanupArgs.join(' ')}`;
  
  return await executeCommand(
    command,
    'Order analysis (dry run)'
  );
}

/**
 * Create order-specific backup
 */
async function createOrderBackup(config: WorkflowConfig): Promise<StepResult> {
  console.log('\n💾 STEP 3: Creating order-specific backup');
  console.log('=========================================');
  
  if (!config.createOrderBackup) {
    console.log('⏭️  Skipping order backup (--no-order-backup)');
    return {
      step: 'Order Backup',
      success: true,
      duration: 0,
      message: 'Skipped by configuration'
    };
  }

  // The cleanup script will create an order backup automatically when not in dry-run mode
  console.log('ℹ️  Order backup will be created automatically during cleanup step');
  
  return {
    step: 'Order Backup',
    success: true,
    duration: 0,
    message: 'Will be created during cleanup'
  };
}

/**
 * Execute order cleanup
 */
async function executeCleanup(config: WorkflowConfig): Promise<StepResult> {
  console.log('\n🧹 STEP 4: Executing order cleanup');
  console.log('==================================');

  if (!config.execute) {
    console.log('🔍 PREVIEW MODE - No actual cleanup will be performed');
    return {
      step: 'Order Cleanup',
      success: true,
      duration: 0,
      message: 'Preview mode - no changes made'
    };
  }

  const cleanupArgs = [
    '--execute',
    config.confirmSteps ? '--confirm' : '--no-confirm',
    '--backup', // Always create backup
  ];

  if (config.testEmailsOnly) {
    cleanupArgs.push('--test-emails-only');
  }
  
  if (config.fromDate) {
    cleanupArgs.push(`--from="${config.fromDate}"`);
  }
  
  if (config.toDate) {
    cleanupArgs.push(`--to="${config.toDate}"`);
  }
  
  if (config.includeOldOrders) {
    cleanupArgs.push('--include-old');
  }
  
  config.excludeOrderIds.forEach(id => {
    cleanupArgs.push(`--exclude-id="${id}"`);
  });

  const command = `pnpm tsx src/scripts/clean-testing-orders.ts ${cleanupArgs.join(' ')}`;
  
  return await executeCommand(
    command,
    'Order cleanup execution'
  );
}

/**
 * Verify cleanup results
 */
async function verifyResults(config: WorkflowConfig): Promise<StepResult> {
  console.log('\n✅ STEP 5: Verifying cleanup results');
  console.log('====================================');

  if (!config.execute) {
    console.log('ℹ️  No verification needed in preview mode');
    return {
      step: 'Result Verification',
      success: true,
      duration: 0,
      message: 'Preview mode - no verification needed'
    };
  }

  try {
    // Check if backups exist
    const backupDir = path.join(process.cwd(), 'backups');
    const dbBackupDir = path.join(backupDir, 'database');
    const orderBackupDir = path.join(backupDir, 'order-cleanup');

    const verifications = [];

    if (config.createFullBackup && fs.existsSync(dbBackupDir)) {
      const dbBackups = fs.readdirSync(dbBackupDir).filter(f => f.includes(new Date().toISOString().split('T')[0]));
      if (dbBackups.length > 0) {
        verifications.push(`✅ Database backup created: ${dbBackups[0]}`);
      } else {
        verifications.push('⚠️  No recent database backup found');
      }
    }

    if (config.createOrderBackup && fs.existsSync(orderBackupDir)) {
      const orderBackups = fs.readdirSync(orderBackupDir).filter(f => f.includes(new Date().toISOString().split('T')[0]));
      if (orderBackups.length > 0) {
        verifications.push(`✅ Order backup created: ${orderBackups[0]}`);
      } else {
        verifications.push('⚠️  No recent order backup found');
      }
    }

    console.log('📊 Verification results:');
    verifications.forEach(v => console.log(`   ${v}`));

    return {
      step: 'Result Verification',
      success: true,
      duration: 100,
      message: 'Verification completed',
      artifacts: verifications
    };

  } catch (error) {
    return {
      step: 'Result Verification',
      success: false,
      duration: 100,
      message: error instanceof Error ? error.message : 'Verification failed'
    };
  }
}

/**
 * Generate comprehensive workflow report
 */
function generateWorkflowReport(result: WorkflowResult, config: WorkflowConfig): void {
  console.log('\n📊 SAFE CLEANUP WORKFLOW REPORT');
  console.log('================================');
  
  console.log('\n🔧 Configuration:');
  console.log(`   Mode: ${config.execute ? '⚡ EXECUTE' : '🔍 PREVIEW'}`);
  console.log(`   Scope: ${config.testEmailsOnly ? 'Test emails only' : 'All matching criteria'}`);
  console.log(`   Date range: ${config.fromDate || 'Any'} to ${config.toDate || 'Any'}`);
  console.log(`   Database backup: ${config.createFullBackup ? 'Yes' : 'No'}`);
  console.log(`   Order backup: ${config.createOrderBackup ? 'Yes' : 'No'}`);
  console.log(`   Backup format: ${config.backupFormat}`);
  console.log(`   Compression: ${config.compressBackups ? 'Enabled' : 'Disabled'}`);
  console.log(`   Verification: ${config.verifyBackups ? 'Enabled' : 'Disabled'}`);

  console.log('\n⏱️  Workflow Steps:');
  result.steps.forEach((step, index) => {
    const status = step.success ? '✅' : '❌';
    const duration = (step.duration / 1000).toFixed(2);
    console.log(`   ${index + 1}. ${status} ${step.step} (${duration}s) - ${step.message}`);
    
    if (step.artifacts && step.artifacts.length > 0) {
      step.artifacts.forEach(artifact => {
        console.log(`      ${artifact}`);
      });
    }
  });

  console.log('\n📈 Summary:');
  console.log(`   Overall status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`   Total duration: ${(result.totalDuration / 1000).toFixed(2)} seconds`);
  console.log(`   Steps completed: ${result.steps.filter(s => s.success).length}/${result.steps.length}`);

  if (Object.keys(result.backups).length > 0) {
    console.log('\n💾 Backups Created:');
    if (result.backups.database) {
      console.log(`   Database: ${result.backups.database}`);
    }
    if (result.backups.orders) {
      console.log(`   Orders: ${result.backups.orders}`);
    }
  }

  if (config.execute && result.cleanup.ordersDeleted > 0) {
    console.log('\n🧹 Cleanup Results:');
    console.log(`   Orders deleted: ${result.cleanup.ordersDeleted}`);
    console.log(`   Total data deleted: ${result.cleanup.dataDeleted} records`);
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`   - ${error}`));
  }

  console.log('\n📝 Next Steps:');
  if (config.execute && result.success) {
    console.log('1. ✅ Workflow completed successfully');
    console.log('2. 🔍 Verify your application still works correctly');
    console.log('3. 💾 Store backup files securely');
    console.log('4. 📅 Schedule regular cleanup if needed');
    console.log('5. 📋 Document what was cleaned for audit purposes');
  } else if (!config.execute) {
    console.log('1. 👀 Review the preview results above');
    console.log('2. ⚡ Run with --execute to perform actual cleanup');
    console.log('3. 🔒 Consider additional safety measures if needed');
    console.log('4. 📋 Document your cleanup plan');
  } else {
    console.log('1. ❌ Review error messages above');
    console.log('2. 🔧 Fix any issues identified');
    console.log('3. 🔄 Re-run the workflow');
    console.log('4. 💾 Check if backups were created despite errors');
  }

  console.log('\n🆘 Recovery Information:');
  console.log('If you need to restore data:');
  console.log('- Full database restore: pnpm restore-db --backup-file="path/to/db/backup"');
  console.log('- Order-specific restore: pnpm restore-orders --backup-file="path/to/order/backup"');
  console.log('- See docs/operations/order-cleanup.md for detailed instructions');
}

/**
 * Ask for user confirmation with detailed context
 */
async function askForConfirmation(message: string, context?: string[]): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    if (context && context.length > 0) {
      console.log('\nℹ️  Context:');
      context.forEach(line => console.log(`   ${line}`));
      console.log('');
    }
    
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
    });
  });
}

/**
 * Pause for user to review step results
 */
async function pauseForReview(stepName: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`\n⏸️  ${stepName} completed. Press Enter to continue...`, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log('🛡️  Starting Safe Cleanup Workflow');
    console.log('===================================\n');

    // Parse configuration
    const config = parseArgs();

    // Initialize result tracking
    const result: WorkflowResult = {
      success: false,
      steps: [],
      totalDuration: 0,
      backups: {},
      cleanup: {
        ordersDeleted: 0,
        dataDeleted: 0
      },
      errors: []
    };

    const workflowStartTime = Date.now();

    // Show configuration summary
    console.log('⚙️  Workflow Configuration:');
    console.log(`   Mode: ${config.execute ? '⚡ EXECUTE' : '🔍 PREVIEW'}`);
    console.log(`   Database backup: ${config.createFullBackup ? 'Yes' : 'No'}`);
    console.log(`   Order backup: ${config.createOrderBackup ? 'Yes' : 'No'}`);
    console.log(`   Test emails only: ${config.testEmailsOnly ? 'Yes' : 'No'}`);
    console.log(`   Date range: ${config.fromDate || 'Any'} to ${config.toDate || 'Any'}`);
    console.log(`   Confirmation required: ${config.confirmSteps ? 'Yes' : 'No'}`);

    // Final confirmation before starting
    if (config.execute && config.confirmSteps) {
      const context = [
        'This workflow will:',
        config.createFullBackup ? '• Create a full database backup' : '• Skip database backup',
        '• Analyze orders matching your criteria',
        config.createOrderBackup ? '• Create order-specific backup' : '• Skip order backup',
        '• Delete matching testing orders',
        '• Verify results and generate report'
      ];

      const confirmed = await askForConfirmation(
        'Continue with safe cleanup workflow?',
        context
      );
      
      if (!confirmed) {
        console.log('❌ Workflow cancelled by user');
        return;
      }
    }

    try {
      // Step 1: Database backup
      const dbBackupResult = await createDatabaseBackup(config);
      result.steps.push(dbBackupResult);
      
      if (!dbBackupResult.success && config.createFullBackup) {
        result.errors.push('Database backup failed');
        throw new Error('Critical step failed: Database backup');
      }

      if (config.pauseBetweenSteps) {
        await pauseForReview('Database backup');
      }

      // Step 2: Order analysis
      const analysisResult = await analyzeOrders(config);
      result.steps.push(analysisResult);
      
      if (!analysisResult.success) {
        result.errors.push('Order analysis failed');
        throw new Error('Critical step failed: Order analysis');
      }

      if (config.pauseBetweenSteps) {
        await pauseForReview('Order analysis');
      }

      // Step 3: Order backup (placeholder - actual backup happens in cleanup)
      const orderBackupResult = await createOrderBackup(config);
      result.steps.push(orderBackupResult);

      if (config.pauseBetweenSteps) {
        await pauseForReview('Order backup preparation');
      }

      // Step 4: Order cleanup
      const cleanupResult = await executeCleanup(config);
      result.steps.push(cleanupResult);
      
      if (!cleanupResult.success && config.execute) {
        result.errors.push('Order cleanup failed');
        // Don't throw here - we want to continue to verification
      }

      if (config.pauseBetweenSteps) {
        await pauseForReview('Order cleanup');
      }

      // Step 5: Verification
      const verificationResult = await verifyResults(config);
      result.steps.push(verificationResult);

      if (!verificationResult.success) {
        result.errors.push('Result verification failed');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      console.error(`\n💥 Workflow failed: ${errorMessage}`);
    }

    // Calculate final results
    result.totalDuration = Date.now() - workflowStartTime;
    result.success = result.errors.length === 0 && result.steps.every(s => s.success);

    // Generate comprehensive report
    generateWorkflowReport(result, config);

    if (!result.success) {
      console.log('\n💥 Workflow completed with errors');
      process.exit(1);
    } else {
      console.log('\n🎉 Workflow completed successfully!');
    }

  } catch (error) {
    console.error('\n💥 Workflow failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    
    process.exit(1);
  }
}

// Execute the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 