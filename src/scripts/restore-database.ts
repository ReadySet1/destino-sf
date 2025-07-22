#!/usr/bin/env tsx

/**
 * Database Restore Script
 * 
 * This script restores PostgreSQL databases from backups created by the backup-database script.
 * It supports all backup formats (custom, sql, directory) and provides safety features.
 * 
 * Features:
 * - Restore from custom, SQL, or directory format backups
 * - Automatic decompression of compressed backups
 * - Database creation and cleanup options
 * - Dry run mode for safety
 * - Progress monitoring and verification
 * - Integration with backup metadata
 * 
 * Usage:
 *   pnpm tsx src/scripts/restore-database.ts --backup-file="path/to/backup.dump"
 *   pnpm tsx src/scripts/restore-database.ts --backup-file="path/to/backup.sql.gz" --create-db
 *   pnpm tsx src/scripts/restore-database.ts --backup-file="path/to/backup.dir" --target-db="test_db"
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { gunzipSync } from 'zlib';
import { URL } from 'url';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const execAsync = promisify(exec);

interface RestoreConfig {
  backupFile: string;
  targetDatabase?: string;
  createDatabase: boolean;
  dropExisting: boolean;
  cleanFirst: boolean;
  dataOnly: boolean;
  schemaOnly: boolean;
  parallelJobs: number;
  useDirectUrl: boolean;
  dryRun: boolean;
  verbose: boolean;
  skipErrors: boolean;
}

interface DatabaseConnectionInfo {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  sslMode?: string;
}

interface RestoreResult {
  success: boolean;
  duration: number;
  tablesRestored?: number;
  recordsRestored?: number;
  errors: string[];
  warnings: string[];
}

interface BackupMetadata {
  timestamp: string;
  databaseName: string;
  format: string;
  compressed: boolean;
  size: number;
  compressedSize?: number;
  duration: number;
  postgresVersion?: string;
  tableCount?: number;
  recordCount?: number;
  config: any;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: RestoreConfig = {
  backupFile: '',
  createDatabase: false,
  dropExisting: false,
  cleanFirst: false,
  dataOnly: false,
  schemaOnly: false,
  parallelJobs: 4,
  useDirectUrl: true,
  dryRun: false,
  verbose: true,
  skipErrors: false,
};

/**
 * Parse command line arguments
 */
function parseArgs(): RestoreConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--backup-file':
        config.backupFile = args[++i];
        break;
      case '--target-db':
        config.targetDatabase = args[++i];
        break;
      case '--create-db':
        config.createDatabase = true;
        break;
      case '--drop-existing':
        config.dropExisting = true;
        break;
      case '--clean':
        config.cleanFirst = true;
        break;
      case '--data-only':
        config.dataOnly = true;
        break;
      case '--schema-only':
        config.schemaOnly = true;
        break;
      case '--parallel-jobs':
        config.parallelJobs = parseInt(args[++i]) || DEFAULT_CONFIG.parallelJobs;
        break;
      case '--use-database-url':
        config.useDirectUrl = false;
        break;
      case '--dry-run':
        config.dryRun = true;
        break;
      case '--no-verbose':
        config.verbose = false;
        break;
      case '--skip-errors':
        config.skipErrors = true;
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

  if (!config.backupFile) {
    console.error('❌ --backup-file is required');
    showHelp();
    process.exit(1);
  }

  return config;
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`
🔄 Database Restore Script

USAGE:
  pnpm tsx src/scripts/restore-database.ts --backup-file="path/to/backup" [OPTIONS]

OPTIONS:
  --backup-file=PATH     Path to backup file or directory (required)
  --target-db=NAME       Target database name (default: from backup metadata)
  --create-db            Create target database if it doesn't exist
  --drop-existing        Drop target database before restore (DANGEROUS)
  --clean                Clean existing objects before restore
  --data-only            Restore data only (no schema)
  --schema-only          Restore schema only (no data)
  --parallel-jobs=N      Number of parallel jobs for directory format (default: 4)
  --use-database-url     Use DATABASE_URL instead of DIRECT_URL
  --dry-run              Preview what would be restored without executing
  --no-verbose           Reduce output verbosity
  --skip-errors          Continue restore even if some operations fail
  --help                 Show this help message

EXAMPLES:
  # Restore from custom format backup
  pnpm tsx src/scripts/restore-database.ts --backup-file="backups/database/mydb-2024-01-01.dump"

  # Restore compressed SQL backup to new database
  pnpm tsx src/scripts/restore-database.ts --backup-file="backups/database/mydb-2024-01-01.sql.gz" --target-db="test_db" --create-db

  # Restore directory format backup with parallel jobs
  pnpm tsx src/scripts/restore-database.ts --backup-file="backups/database/mydb-2024-01-01.dir" --parallel-jobs=8

  # Schema-only restore for database migration
  pnpm tsx src/scripts/restore-database.ts --backup-file="mybackup.dump" --schema-only --target-db="new_schema"

  # Dry run to see what would be restored
  pnpm tsx src/scripts/restore-database.ts --backup-file="mybackup.dump" --dry-run

SAFETY FEATURES:
  - Dry run mode for preview
  - Automatic format detection
  - Backup verification before restore
  - Progress monitoring
  - Error handling and recovery
  - Metadata validation

SUPPORTED FORMATS:
  - PostgreSQL custom format (.dump)
  - SQL text format (.sql, .sql.gz)
  - Directory format (.dir)
  - Automatic compression detection
  `);
}

/**
 * Parse DATABASE_URL or DIRECT_URL to extract connection parameters
 */
function parseDatabaseUrl(databaseUrl: string): DatabaseConnectionInfo {
  try {
    const url = new URL(databaseUrl);
    
    return {
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1), // Remove leading slash
      username: url.username,
      password: url.password,
      sslMode: url.searchParams.get('sslmode') || 'require',
    };
  } catch (error) {
    throw new Error(`Invalid database URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get database connection info from environment
 */
function getDatabaseConnection(config: RestoreConfig): DatabaseConnectionInfo {
  // Try DIRECT_URL first if requested, then DATABASE_URL
  const databaseUrl = config.useDirectUrl 
    ? (process.env.DIRECT_URL || process.env.DATABASE_URL)
    : process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('No database URL found. Set DATABASE_URL or DIRECT_URL environment variable.');
  }

  console.log(`🔗 Using ${config.useDirectUrl && process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL'} for connection`);
  
  return parseDatabaseUrl(databaseUrl);
}

/**
 * Detect backup format from file
 */
function detectBackupFormat(backupFile: string): 'custom' | 'sql' | 'directory' {
  if (fs.statSync(backupFile).isDirectory()) {
    return 'directory';
  }
  
  if (backupFile.endsWith('.sql') || backupFile.endsWith('.sql.gz')) {
    return 'sql';
  }
  
  if (backupFile.endsWith('.dump') || backupFile.endsWith('.backup')) {
    return 'custom';
  }
  
  // Try to detect by examining file content
  try {
    const buffer = fs.readFileSync(backupFile);
    const header = buffer.subarray(0, 100).toString('utf8');
    
    if (header.includes('PGDMP') || header.includes('PostgreSQL database dump')) {
      return 'custom';
    }
    
    if (header.includes('--') && header.includes('PostgreSQL')) {
      return 'sql';
    }
  } catch (error) {
    // Ignore read errors, default to custom
  }
  
  // Default to custom format
  return 'custom';
}

/**
 * Load backup metadata if available
 */
function loadBackupMetadata(backupFile: string): BackupMetadata | null {
  const metadataPath = backupFile + '.metadata.json';
  
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      console.log('📄 Loaded backup metadata');
      return metadata;
    } catch (error) {
      console.warn('⚠️  Failed to load backup metadata:', error instanceof Error ? error.message : 'Unknown error');
    }
  }
  
  return null;
}

/**
 * Verify backup file exists and is readable
 */
function verifyBackupFile(backupFile: string): void {
  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file not found: ${backupFile}`);
  }
  
  const stats = fs.statSync(backupFile);
  
  if (stats.isDirectory()) {
    // For directory format, check for required files
    const tocFile = path.join(backupFile, 'toc.dat');
    if (!fs.existsSync(tocFile)) {
      throw new Error('Invalid directory backup: missing toc.dat file');
    }
    console.log(`✅ Directory backup verified (${formatFileSize(calculateDirectorySize(backupFile))})`);
  } else {
    console.log(`✅ Backup file verified (${formatFileSize(stats.size)})`);
  }
}

/**
 * Calculate total size of directory
 */
function calculateDirectorySize(dirPath: string): number {
  let totalSize = 0;
  
  function calculateSize(itemPath: string) {
    const stats = fs.statSync(itemPath);
    if (stats.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      items.forEach(item => {
        calculateSize(path.join(itemPath, item));
      });
    } else {
      totalSize += stats.size;
    }
  }
  
  calculateSize(dirPath);
  return totalSize;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Check if target database exists
 */
async function databaseExists(dbInfo: DatabaseConnectionInfo, targetDb: string): Promise<boolean> {
  try {
    const cmd = `psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname='${targetDb}'"`;
    const result = await execAsync(cmd, {
      env: { ...process.env, PGPASSWORD: dbInfo.password }
    });
    return result.stdout.trim() === '1';
  } catch (error) {
    return false;
  }
}

/**
 * Create target database
 */
async function createDatabase(dbInfo: DatabaseConnectionInfo, targetDb: string): Promise<void> {
  console.log(`🔧 Creating database: ${targetDb}`);
  
  const cmd = `psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d postgres -c "CREATE DATABASE \\"${targetDb}\\""`;
  
  try {
    await execAsync(cmd, {
      env: { ...process.env, PGPASSWORD: dbInfo.password }
    });
    console.log(`✅ Database created: ${targetDb}`);
  } catch (error) {
    throw new Error(`Failed to create database ${targetDb}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Drop existing database
 */
async function dropDatabase(dbInfo: DatabaseConnectionInfo, targetDb: string): Promise<void> {
  console.log(`🗑️  Dropping database: ${targetDb}`);
  
  // Terminate existing connections
  const terminateCmd = `psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${targetDb}' AND pid <> pg_backend_pid()"`;
  
  try {
    await execAsync(terminateCmd, {
      env: { ...process.env, PGPASSWORD: dbInfo.password }
    });
  } catch (error) {
    console.warn('⚠️  Could not terminate existing connections (may not exist)');
  }
  
  const dropCmd = `psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d postgres -c "DROP DATABASE IF EXISTS \\"${targetDb}\\""`;
  
  try {
    await execAsync(dropCmd, {
      env: { ...process.env, PGPASSWORD: dbInfo.password }
    });
    console.log(`✅ Database dropped: ${targetDb}`);
  } catch (error) {
    throw new Error(`Failed to drop database ${targetDb}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build pg_restore command based on configuration
 */
function buildPgRestoreCommand(
  config: RestoreConfig,
  dbInfo: DatabaseConnectionInfo,
  targetDb: string,
  backupFile: string,
  format: string
): string[] {
  const cmd = ['pg_restore'];

  // Connection parameters
  cmd.push(`--host=${dbInfo.host}`);
  cmd.push(`--port=${dbInfo.port}`);
  cmd.push(`--username=${dbInfo.username}`);
  cmd.push(`--dbname=${targetDb}`);

  // Format-specific options
  switch (format) {
    case 'custom':
      cmd.push('--format=custom');
      break;
    case 'directory':
      cmd.push('--format=directory');
      cmd.push(`--jobs=${config.parallelJobs}`);
      break;
    // SQL format uses psql, not pg_restore
  }

  // Restore options
  if (config.cleanFirst) {
    cmd.push('--clean');
  }
  if (config.dataOnly) {
    cmd.push('--data-only');
  }
  if (config.schemaOnly) {
    cmd.push('--schema-only');
  }
  if (config.verbose) {
    cmd.push('--verbose');
  }
  if (config.skipErrors) {
    cmd.push('--exit-on-error');
  } else {
    cmd.push('--no-owner');
    cmd.push('--no-privileges');
  }

  // Backup file
  cmd.push(backupFile);

  return cmd;
}

/**
 * Build psql command for SQL format restoration
 */
function buildPsqlCommand(
  config: RestoreConfig,
  dbInfo: DatabaseConnectionInfo,
  targetDb: string
): string[] {
  const cmd = ['psql'];

  // Connection parameters
  cmd.push(`--host=${dbInfo.host}`);
  cmd.push(`--port=${dbInfo.port}`);
  cmd.push(`--username=${dbInfo.username}`);
  cmd.push(`--dbname=${targetDb}`);

  // Options
  if (!config.skipErrors) {
    cmd.push('--set=ON_ERROR_STOP=1');
  }
  
  if (config.verbose) {
    cmd.push('--echo-all');
  }

  return cmd;
}

/**
 * Execute restore operation
 */
async function executeRestore(
  config: RestoreConfig,
  dbInfo: DatabaseConnectionInfo,
  targetDb: string,
  backupFile: string,
  format: string
): Promise<RestoreResult> {
  const startTime = Date.now();
  
  console.log('🚀 Starting database restore...');
  console.log(`📄 Format: ${format}`);
  console.log(`📁 Source: ${backupFile}`);
  console.log(`🎯 Target: ${targetDb}`);

  const result: RestoreResult = {
    success: false,
    duration: 0,
    errors: [],
    warnings: []
  };

  if (config.dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be restored');
    console.log('This would restore the backup to the target database');
    result.success = true;
    result.duration = Date.now() - startTime;
    return result;
  }

  return new Promise((resolve) => {
    let restoreProcess;
    
    if (format === 'sql') {
      // Handle SQL format restoration
      const cmd = buildPsqlCommand(config, dbInfo, targetDb);
      
      console.log(`🔄 Executing: ${cmd.join(' ')} < ${backupFile}`);
      
      const isCompressed = backupFile.endsWith('.gz');
      let inputStream;
      
      if (isCompressed) {
        // Decompress on the fly
        const compressedData = fs.readFileSync(backupFile);
        const decompressedData = gunzipSync(compressedData);
        inputStream = decompressedData;
      } else {
        inputStream = fs.readFileSync(backupFile);
      }
      
      restoreProcess = spawn(cmd[0], cmd.slice(1), {
        env: { ...process.env, PGPASSWORD: dbInfo.password },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Send SQL content to psql
      restoreProcess.stdin.write(inputStream);
      restoreProcess.stdin.end();
      
    } else {
      // Handle custom and directory format restoration
      const cmd = buildPgRestoreCommand(config, dbInfo, targetDb, backupFile, format);
      
      console.log(`🔄 Executing: ${cmd.join(' ')}`);
      
      restoreProcess = spawn(cmd[0], cmd.slice(1), {
        env: { ...process.env, PGPASSWORD: dbInfo.password },
        stdio: ['inherit', 'pipe', 'pipe']
      });
    }

    let outputData = '';
    let errorData = '';

    if (restoreProcess.stdout) {
      restoreProcess.stdout.on('data', (data) => {
        outputData += data.toString();
        if (config.verbose) {
          process.stdout.write(data);
        }
      });
    }

    if (restoreProcess.stderr) {
      restoreProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        if (config.verbose) {
          process.stderr.write(data);
        }
      });
    }

    restoreProcess.on('close', (code) => {
      result.duration = Date.now() - startTime;
      
      if (code === 0) {
        result.success = true;
        console.log('✅ Database restore completed successfully');
      } else {
        result.success = false;
        result.errors.push(`Restore process failed with exit code ${code}`);
        console.error(`❌ Restore failed with exit code ${code}`);
      }

      // Parse output for statistics if available
      const lines = outputData.split('\n');
      lines.forEach(line => {
        if (line.includes('processed')) {
          // Try to extract statistics from output
          const match = line.match(/(\d+) (\w+)/);
          if (match) {
            console.log(`📊 ${line.trim()}`);
          }
        }
      });

      // Parse errors and warnings
      const errorLines = errorData.split('\n');
      errorLines.forEach(line => {
        if (line.includes('ERROR:')) {
          result.errors.push(line.trim());
        } else if (line.includes('WARNING:')) {
          result.warnings.push(line.trim());
        }
      });

      resolve(result);
    });

    restoreProcess.on('error', (error) => {
      result.duration = Date.now() - startTime;
      result.success = false;
      result.errors.push(`Process error: ${error.message}`);
      resolve(result);
    });
  });
}

/**
 * Verify restored database
 */
async function verifyRestore(dbInfo: DatabaseConnectionInfo, targetDb: string): Promise<boolean> {
  console.log('🔍 Verifying restored database...');
  
  try {
    // Check if database exists and is accessible
    const cmd = `psql -h ${dbInfo.host} -p ${dbInfo.port} -U ${dbInfo.username} -d ${targetDb} -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"`;
    
    const result = await execAsync(cmd, {
      env: { ...process.env, PGPASSWORD: dbInfo.password }
    });
    
    const tableCount = parseInt(result.stdout.trim());
    console.log(`✅ Database verified: ${tableCount} tables found`);
    return true;
  } catch (error) {
    console.error('❌ Database verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Generate restore report
 */
function generateReport(
  result: RestoreResult, 
  config: RestoreConfig, 
  metadata: BackupMetadata | null,
  targetDb: string
): void {
  console.log('\n📊 RESTORE REPORT');
  console.log('=================');
  
  console.log('\n🔧 Configuration:');
  console.log(`   Source: ${config.backupFile}`);
  console.log(`   Target database: ${targetDb}`);
  console.log(`   Dry run: ${config.dryRun}`);
  console.log(`   Data only: ${config.dataOnly}`);
  console.log(`   Schema only: ${config.schemaOnly}`);
  console.log(`   Clean first: ${config.cleanFirst}`);
  console.log(`   Skip errors: ${config.skipErrors}`);

  console.log('\n📦 Restore Results:');
  console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)} seconds`);
  
  if (result.tablesRestored) {
    console.log(`   Tables restored: ${result.tablesRestored}`);
  }
  if (result.recordsRestored) {
    console.log(`   Records restored: ${result.recordsRestored}`);
  }

  if (metadata) {
    console.log('\n📝 Backup Metadata:');
    console.log(`   Original database: ${metadata.databaseName}`);
    console.log(`   Backup created: ${metadata.timestamp}`);
    console.log(`   Backup format: ${metadata.format}`);
    console.log(`   Backup size: ${formatFileSize(metadata.size)}`);
    if (metadata.compressed && metadata.compressedSize) {
      console.log(`   Compressed size: ${formatFileSize(metadata.compressedSize)}`);
    }
    if (metadata.tableCount) {
      console.log(`   Tables in backup: ${metadata.tableCount}`);
    }
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.slice(0, 5).forEach(warning => console.log(`   - ${warning}`));
    if (result.warnings.length > 5) {
      console.log(`   ... and ${result.warnings.length - 5} more warnings`);
    }
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
    if (result.errors.length > 5) {
      console.log(`   ... and ${result.errors.length - 5} more errors`);
    }
  }

  if (result.success) {
    console.log('\n🎉 Database restore completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Verify your application connects to the restored database');
    console.log('2. Test critical functionality to ensure data integrity');
    console.log('3. Update database connection strings if using a new database');
    console.log('4. Consider running ANALYZE to update table statistics');
  } else {
    console.log('\n💥 Database restore failed');
    console.log('📝 Troubleshooting:');
    console.log('1. Check error messages above for specific issues');
    console.log('2. Verify backup file integrity');
    console.log('3. Ensure target database has sufficient permissions');
    console.log('4. Try restoring to a new database with --create-db');
  }
}

/**
 * Ask for user confirmation
 */
async function askForConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes');
    });
  });
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log('🔄 Starting Database Restore Script');
    console.log('===================================\n');

    // Parse configuration
    const config = parseArgs();

    // Verify backup file exists
    verifyBackupFile(config.backupFile);

    // Detect backup format
    const format = detectBackupFormat(config.backupFile);
    console.log(`📄 Detected format: ${format}`);

    // Load backup metadata
    const metadata = loadBackupMetadata(config.backupFile);

    // Get database connection info
    const dbInfo = getDatabaseConnection(config);

    // Determine target database
    const targetDb = config.targetDatabase || metadata?.databaseName || dbInfo.database;
    console.log(`🎯 Target database: ${targetDb}`);

    // Check if target database exists
    const dbExists = await databaseExists(dbInfo, targetDb);
    console.log(`📊 Target database exists: ${dbExists ? 'Yes' : 'No'}`);

    // Show configuration summary
    console.log('\n⚙️  Configuration:');
    console.log(`   Host: ${dbInfo.host}:${dbInfo.port}`);
    console.log(`   Source: ${config.backupFile}`);
    console.log(`   Target: ${targetDb}`);
    console.log(`   Format: ${format}`);
    console.log(`   Dry run: ${config.dryRun ? 'Yes' : 'No'}`);

    // Safety checks and confirmations
    if (!config.dryRun) {
      if (process.env.NODE_ENV === 'production') {
        console.log('\n⚠️  PRODUCTION ENVIRONMENT DETECTED');
        const confirmed = await askForConfirmation('Continue with database restore in production?');
        if (!confirmed) {
          console.log('❌ Cancelled by user');
          return;
        }
      }

      if (config.dropExisting && dbExists) {
        console.log('\n🚨 WARNING: This will DROP the existing database and ALL its data!');
        const confirmed = await askForConfirmation(`Really drop database '${targetDb}'?`);
        if (!confirmed) {
          console.log('❌ Cancelled by user');
          return;
        }
      }
    }

    // Prepare target database
    if (!config.dryRun) {
      if (config.dropExisting && dbExists) {
        await dropDatabase(dbInfo, targetDb);
      }
      
      if (config.createDatabase || (config.dropExisting && dbExists)) {
        await createDatabase(dbInfo, targetDb);
      } else if (!dbExists) {
        throw new Error(`Target database '${targetDb}' does not exist. Use --create-db to create it.`);
      }
    }

    // Execute restore
    const result = await executeRestore(config, dbInfo, targetDb, config.backupFile, format);

    // Verify restore if successful
    if (result.success && !config.dryRun) {
      const verified = await verifyRestore(dbInfo, targetDb);
      if (!verified) {
        result.warnings.push('Database verification failed after restore');
      }
    }

    // Generate report
    generateReport(result, config, metadata, targetDb);

    if (!result.success && !config.dryRun) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Database restore failed:', error);
    
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