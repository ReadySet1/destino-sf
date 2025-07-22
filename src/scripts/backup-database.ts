#!/usr/bin/env tsx

/**
 * Database Backup Script
 * 
 * This script creates full PostgreSQL database backups using pg_dump with compression
 * and verification. It's designed to be run before major operations like order cleanup.
 * 
 * Features:
 * - Full PostgreSQL database dumps using pg_dump
 * - Automatic compression with gzip
 * - Backup verification and validation
 * - Multiple backup formats (custom, sql, directory)
 * - Metadata tracking and reporting
 * - Integration with existing backup directory structure
 * 
 * Usage:
 *   pnpm tsx src/scripts/backup-database.ts --format=custom
 *   pnpm tsx src/scripts/backup-database.ts --format=sql --compress
 *   pnpm tsx src/scripts/backup-database.ts --verify-only --backup-file="path/to/backup"
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { gzipSync, gunzipSync } from 'zlib';
import { URL } from 'url';
import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), '.env.local') });

const execAsync = promisify(exec);

interface BackupConfig {
  format: 'custom' | 'sql' | 'directory';
  compress: boolean;
  verifyBackup: boolean;
  outputDir: string;
  includeSchema: boolean;
  includeData: boolean;
  excludeTables: string[];
  includeTables: string[];
  useDirectUrl: boolean;
  retentionDays: number;
  parallelJobs: number;
}

interface DatabaseConnectionInfo {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  sslMode?: string;
}

interface BackupResult {
  success: boolean;
  backupPath?: string;
  compressedPath?: string;
  size: number;
  compressedSize?: number;
  compressionRatio?: number;
  duration: number;
  metadata: BackupMetadata;
  errors: string[];
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
  config: BackupConfig;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: BackupConfig = {
  format: 'custom',
  compress: true,
  verifyBackup: true,
  outputDir: path.join(process.cwd(), 'backups', 'database'),
  includeSchema: true,
  includeData: true,
  excludeTables: [],
  includeTables: [],
  useDirectUrl: true, // Use DIRECT_URL if available for better performance
  retentionDays: 30,
  parallelJobs: 4,
};

/**
 * Parse command line arguments
 */
function parseArgs(): BackupConfig {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Handle --key=value format
    if (arg.includes('=')) {
      const [key, value] = arg.split('=', 2);
      switch (key) {
        case '--format':
          const format = value as 'custom' | 'sql' | 'directory';
          if (['custom', 'sql', 'directory'].includes(format)) {
            config.format = format;
          } else {
            console.error(`❌ Invalid format: ${format}. Use: custom, sql, or directory`);
            process.exit(1);
          }
          break;
        case '--output-dir':
          config.outputDir = value;
          break;
        case '--exclude-table':
          config.excludeTables.push(value);
          break;
        case '--include-table':
          config.includeTables.push(value);
          break;
        case '--retention-days':
          config.retentionDays = parseInt(value) || DEFAULT_CONFIG.retentionDays;
          break;
        case '--parallel-jobs':
          config.parallelJobs = parseInt(value) || DEFAULT_CONFIG.parallelJobs;
          break;
        default:
          console.warn(`⚠️  Unknown argument: ${arg}`);
      }
      continue;
    }
    
    // Handle --key value format  
    switch (arg) {
      case '--format':
        const format = args[++i] as 'custom' | 'sql' | 'directory';
        if (['custom', 'sql', 'directory'].includes(format)) {
          config.format = format;
        } else {
          console.error(`❌ Invalid format: ${format}. Use: custom, sql, or directory`);
          process.exit(1);
        }
        break;
      case '--compress':
        config.compress = true;
        break;
      case '--no-compress':
        config.compress = false;
        break;
      case '--verify':
        config.verifyBackup = true;
        break;
      case '--no-verify':
        config.verifyBackup = false;
        break;
      case '--output-dir':
        config.outputDir = args[++i];
        break;
      case '--schema-only':
        config.includeData = false;
        break;
      case '--data-only':
        config.includeSchema = false;
        break;
      case '--exclude-table':
        config.excludeTables.push(args[++i]);
        break;
      case '--include-table':
        config.includeTables.push(args[++i]);
        break;
      case '--use-database-url':
        config.useDirectUrl = false;
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
💾 Database Backup Script

USAGE:
  pnpm tsx src/scripts/backup-database.ts [OPTIONS]

OPTIONS:
  --format=FORMAT        Backup format: custom, sql, or directory (default: custom)
  --compress             Enable compression (default for sql format)
  --no-compress          Disable compression
  --verify               Verify backup after creation (default: true)
  --no-verify            Skip backup verification
  --output-dir=PATH      Output directory for backups (default: backups/database)
  --schema-only          Backup schema only (no data)
  --data-only            Backup data only (no schema)
  --exclude-table=TABLE  Exclude specific table from backup
  --include-table=TABLE  Include only specific tables in backup
  --use-database-url     Use DATABASE_URL instead of DIRECT_URL
  --retention-days=N     Keep backups for N days (default: 30)
  --parallel-jobs=N      Number of parallel jobs for directory format (default: 4)
  --help                 Show this help message

FORMATS:
  custom     PostgreSQL custom format (recommended) - compressed and restorable
  sql        Plain SQL text format - human readable
  directory  Directory format - parallel dump and restore

EXAMPLES:
  # Create compressed custom format backup (recommended)
  pnpm backup-db

  # Create SQL backup with compression
  pnpm tsx src/scripts/backup-database.ts --format=sql --compress

  # Schema-only backup for structure analysis
  pnpm tsx src/scripts/backup-database.ts --schema-only --format=sql

  # High-performance directory backup
  pnpm tsx src/scripts/backup-database.ts --format=directory --parallel-jobs=8

  # Backup specific tables only
  pnpm tsx src/scripts/backup-database.ts --include-table=orders --include-table=products

SAFETY FEATURES:
  - Automatic backup verification
  - Compression to save space
  - Metadata tracking
  - Retention management
  - Error recovery and reporting
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
function getDatabaseConnection(config: BackupConfig): DatabaseConnectionInfo {
  // Try DIRECT_URL first if requested (better for pg_dump), then DATABASE_URL
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
 * Check if required tools are available
 */
async function checkRequiredTools(): Promise<void> {
  console.log('🔧 Checking required tools...');
  
  try {
    // Check pg_dump
    await execAsync('pg_dump --version');
    console.log('✅ pg_dump found');
  } catch (error) {
    throw new Error('pg_dump not found. Please install PostgreSQL client tools.');
  }

  try {
    // Check pg_restore (for verification)
    await execAsync('pg_restore --version');
    console.log('✅ pg_restore found');
  } catch (error) {
    console.warn('⚠️  pg_restore not found. Backup verification will be limited.');
  }

  try {
    // Check gzip (for compression)
    await execAsync('gzip --version');
    console.log('✅ gzip found');
  } catch (error) {
    console.warn('⚠️  gzip not found. Compression will use Node.js built-in.');
  }
}

/**
 * Create backup directory and ensure it exists
 */
function ensureBackupDirectory(outputDir: string): void {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created backup directory: ${outputDir}`);
  }
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(config: BackupConfig, dbInfo: DatabaseConnectionInfo): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const formatExt = {
    custom: 'dump',
    sql: 'sql',
    directory: 'dir'
  };
  
  const baseName = `${dbInfo.database}-${timestamp}.${formatExt[config.format]}`;
  return path.join(config.outputDir, baseName);
}

/**
 * Build pg_dump command based on configuration
 */
function buildPgDumpCommand(
  config: BackupConfig, 
  dbInfo: DatabaseConnectionInfo, 
  outputPath: string
): string[] {
  const cmd = ['pg_dump'];

  // Connection parameters
  cmd.push(`--host=${dbInfo.host}`);
  cmd.push(`--port=${dbInfo.port}`);
  cmd.push(`--username=${dbInfo.username}`);
  cmd.push(`--dbname=${dbInfo.database}`);

  // Format-specific options
  switch (config.format) {
    case 'custom':
      cmd.push('--format=custom');
      cmd.push('--compress=9'); // Maximum compression for custom format
      cmd.push(`--file=${outputPath}`);
      break;
    case 'sql':
      cmd.push('--format=plain');
      if (!config.compress) {
        cmd.push(`--file=${outputPath}`);
      }
      // For compressed SQL, we'll pipe to gzip
      break;
    case 'directory':
      cmd.push('--format=directory');
      cmd.push(`--file=${outputPath}`);
      cmd.push(`--jobs=${config.parallelJobs}`);
      break;
  }

  // Schema and data options
  if (!config.includeSchema) {
    cmd.push('--data-only');
  }
  if (!config.includeData) {
    cmd.push('--schema-only');
  }

  // Table inclusion/exclusion
  config.excludeTables.forEach(table => {
    cmd.push(`--exclude-table=${table}`);
  });
  
  if (config.includeTables.length > 0) {
    config.includeTables.forEach(table => {
      cmd.push(`--table=${table}`);
    });
  }

  // Additional options
  cmd.push('--verbose');
  cmd.push('--no-password'); // Use PGPASSWORD environment variable

  return cmd;
}

/**
 * Execute backup with progress monitoring
 */
async function executeBackup(
  config: BackupConfig,
  dbInfo: DatabaseConnectionInfo,
  outputPath: string
): Promise<{ duration: number; size: number }> {
  const startTime = Date.now();
  
  console.log('🚀 Starting database backup...');
  console.log(`📄 Format: ${config.format}`);
  console.log(`📁 Output: ${outputPath}`);

  const cmd = buildPgDumpCommand(config, dbInfo, outputPath);
  
  return new Promise((resolve, reject) => {
    // Set password environment variable
    const env = {
      ...process.env,
      PGPASSWORD: dbInfo.password,
    };

    console.log(`🔄 Executing: ${cmd.join(' ')}`);

    let pgDumpProcess;
    let gzipProcess;

    if (config.format === 'sql' && config.compress) {
      // For compressed SQL, pipe pg_dump output to gzip
      pgDumpProcess = spawn(cmd[0], cmd.slice(1), { env });
      gzipProcess = spawn('gzip', ['-9'], { stdio: ['pipe', 'pipe', 'inherit'] });
      
      // Pipe pg_dump output to gzip
      pgDumpProcess.stdout.pipe(gzipProcess.stdin);
      
      // Write gzip output to file
      const outputStream = fs.createWriteStream(outputPath + '.gz');
      gzipProcess.stdout.pipe(outputStream);

      gzipProcess.on('close', (code) => {
        if (code === 0) {
          const duration = Date.now() - startTime;
          const stats = fs.statSync(outputPath + '.gz');
          resolve({ duration, size: stats.size });
        } else {
          reject(new Error(`Compression failed with exit code ${code}`));
        }
      });

      pgDumpProcess.on('error', (error) => {
        reject(new Error(`pg_dump failed: ${error.message}`));
      });

      gzipProcess.on('error', (error) => {
        reject(new Error(`gzip failed: ${error.message}`));
      });

    } else {
      // For custom and directory formats, or uncompressed SQL
      pgDumpProcess = spawn(cmd[0], cmd.slice(1), { 
        env,
        stdio: config.format === 'sql' ? ['inherit', 'pipe', 'inherit'] : 'inherit'
      });

      if (config.format === 'sql' && !config.compress) {
        // For uncompressed SQL, write to file
        const outputStream = fs.createWriteStream(outputPath);
        if (pgDumpProcess.stdout) {
          pgDumpProcess.stdout.pipe(outputStream);
        }
      }

      pgDumpProcess.on('close', (code) => {
        if (code === 0) {
          const duration = Date.now() - startTime;
          let stats;
          
          if (config.format === 'directory') {
            // For directory format, calculate total size
            stats = { size: calculateDirectorySize(outputPath) };
          } else {
            stats = fs.statSync(outputPath);
          }
          
          resolve({ duration, size: stats.size });
        } else {
          reject(new Error(`pg_dump failed with exit code ${code}`));
        }
      });

      pgDumpProcess.on('error', (error) => {
        reject(new Error(`pg_dump failed: ${error.message}`));
      });
    }
  });
}

/**
 * Calculate total size of directory (for directory format backups)
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
 * Compress backup file if requested (for SQL format)
 */
async function compressBackup(backupPath: string): Promise<string> {
  const compressedPath = backupPath + '.gz';
  console.log('🗜️  Compressing backup...');
  
  try {
    await execAsync(`gzip -9 "${backupPath}"`);
    console.log(`✅ Backup compressed: ${compressedPath}`);
    return compressedPath;
  } catch (error) {
    // Fallback to Node.js compression
    console.log('⚠️  gzip command failed, using Node.js compression...');
    
    const data = fs.readFileSync(backupPath);
    const compressed = gzipSync(data, { level: 9 });
    fs.writeFileSync(compressedPath, compressed);
    fs.unlinkSync(backupPath); // Remove uncompressed file
    
    console.log(`✅ Backup compressed with Node.js: ${compressedPath}`);
    return compressedPath;
  }
}

/**
 * Verify backup integrity
 */
async function verifyBackup(backupPath: string, config: BackupConfig): Promise<boolean> {
  console.log('🔍 Verifying backup integrity...');
  
  try {
    switch (config.format) {
      case 'custom':
        // Use pg_restore --list to verify custom format
        await execAsync(`pg_restore --list "${backupPath}"`);
        console.log('✅ Custom format backup verified');
        return true;
        
      case 'sql':
        // Check if SQL file is valid by parsing first few lines
        const isCompressed = backupPath.endsWith('.gz');
        let content: string;
        
        if (isCompressed) {
          const compressed = fs.readFileSync(backupPath);
          const decompressed = gunzipSync(compressed);
          content = decompressed.toString('utf8', 0, 1000); // First 1KB
        } else {
          content = fs.readFileSync(backupPath, 'utf8').substring(0, 1000);
        }
        
        if (content.includes('PostgreSQL database dump') || 
            content.includes('-- Dumped from database version')) {
          console.log('✅ SQL backup verified');
          return true;
        } else {
          console.log('❌ SQL backup verification failed - invalid content');
          return false;
        }
        
      case 'directory':
        // Check if directory contains expected files
        const files = fs.readdirSync(backupPath);
        if (files.includes('toc.dat') && files.length > 1) {
          console.log('✅ Directory format backup verified');
          return true;
        } else {
          console.log('❌ Directory backup verification failed - missing files');
          return false;
        }
        
      default:
        console.log('⚠️  Unknown format, skipping verification');
        return true;
    }
  } catch (error) {
    console.error('❌ Backup verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

/**
 * Get database statistics for metadata
 */
async function getDatabaseStats(dbInfo: DatabaseConnectionInfo): Promise<{
  postgresVersion?: string;
  tableCount?: number;
  recordCount?: number;
}> {
  try {
    // This would require a database connection, but since we're using pg_dump
    // we'll skip detailed stats to avoid additional dependencies
    console.log('📊 Gathering database statistics...');
    return {
      postgresVersion: 'Unknown',
      tableCount: 0,
      recordCount: 0
    };
  } catch (error) {
    console.log('⚠️  Could not gather database statistics');
    return {};
  }
}

/**
 * Create backup metadata file
 */
function createMetadataFile(
  backupPath: string, 
  result: BackupResult, 
  config: BackupConfig,
  dbInfo: DatabaseConnectionInfo
): void {
  const metadataPath = backupPath + '.metadata.json';
  const metadata = {
    ...result.metadata,
    backupPath: backupPath,
    compressedPath: result.compressedPath,
    database: {
      host: dbInfo.host,
      port: dbInfo.port,
      database: dbInfo.database,
      username: dbInfo.username,
      // Don't store password in metadata
    },
    created: new Date().toISOString(),
    command: 'backup-database.ts',
    version: '1.0.0'
  };

  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`📝 Metadata saved: ${metadataPath}`);
}

/**
 * Clean up old backups based on retention policy
 */
async function cleanupOldBackups(config: BackupConfig): Promise<void> {
  console.log(`🧹 Cleaning up backups older than ${config.retentionDays} days...`);
  
  try {
    const files = fs.readdirSync(config.outputDir);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

    let deletedCount = 0;
    let deletedSize = 0;

    for (const file of files) {
      const filePath = path.join(config.outputDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        deletedSize += stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
        console.log(`   🗑️  Deleted: ${file}`);
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Cleaned up ${deletedCount} files (${(deletedSize / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log('✅ No old backups to clean up');
    }
  } catch (error) {
    console.warn('⚠️  Failed to clean up old backups:', error instanceof Error ? error.message : 'Unknown error');
  }
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
 * Generate backup report
 */
function generateReport(result: BackupResult, config: BackupConfig): void {
  console.log('\n📊 BACKUP REPORT');
  console.log('================');
  
  console.log('\n🔧 Configuration:');
  console.log(`   Format: ${config.format}`);
  console.log(`   Compression: ${config.compress ? 'enabled' : 'disabled'}`);
  console.log(`   Include schema: ${config.includeSchema}`);
  console.log(`   Include data: ${config.includeData}`);
  console.log(`   Output directory: ${config.outputDir}`);
  console.log(`   Retention: ${config.retentionDays} days`);

  if (config.excludeTables.length > 0) {
    console.log(`   Excluded tables: ${config.excludeTables.join(', ')}`);
  }
  if (config.includeTables.length > 0) {
    console.log(`   Included tables: ${config.includeTables.join(', ')}`);
  }

  console.log('\n📦 Backup Results:');
  console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)} seconds`);
  console.log(`   Size: ${formatFileSize(result.size)}`);
  
  if (result.compressedSize) {
    console.log(`   Compressed size: ${formatFileSize(result.compressedSize)}`);
    console.log(`   Compression ratio: ${result.compressionRatio?.toFixed(1)}%`);
  }

  if (result.backupPath) {
    console.log(`   Backup file: ${result.backupPath}`);
  }
  if (result.compressedPath) {
    console.log(`   Compressed file: ${result.compressedPath}`);
  }

  console.log('\n📝 Metadata:');
  console.log(`   Database: ${result.metadata.databaseName}`);
  console.log(`   Timestamp: ${result.metadata.timestamp}`);
  if (result.metadata.postgresVersion) {
    console.log(`   PostgreSQL version: ${result.metadata.postgresVersion}`);
  }
  if (result.metadata.tableCount) {
    console.log(`   Tables: ${result.metadata.tableCount}`);
  }
  if (result.metadata.recordCount) {
    console.log(`   Records: ${result.metadata.recordCount}`);
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`   - ${error}`));
  }

  if (result.success) {
    console.log('\n🎉 Database backup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Verify the backup file exists and has reasonable size');
    console.log('2. Test restoration process if this is your first backup');
    console.log('3. Store backup securely with proper access controls');
    console.log('4. Document backup location and recovery procedures');
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
    console.log('💾 Starting Database Backup Script');
    console.log('===================================\n');

    // Parse configuration
    const config = parseArgs();

    // Check required tools
    await checkRequiredTools();

    // Get database connection info
    const dbInfo = getDatabaseConnection(config);

    // Ensure backup directory exists
    ensureBackupDirectory(config.outputDir);

    // Generate backup filename
    const outputPath = generateBackupFilename(config, dbInfo);
    console.log(`🎯 Target: ${outputPath}`);

    // Show configuration summary
    console.log('\n⚙️  Configuration:');
    console.log(`   Database: ${dbInfo.database}@${dbInfo.host}:${dbInfo.port}`);
    console.log(`   Format: ${config.format}`);
    console.log(`   Compression: ${config.compress ? 'enabled' : 'disabled'}`);
    console.log(`   Verification: ${config.verifyBackup ? 'enabled' : 'disabled'}`);
    console.log(`   Output: ${config.outputDir}`);

    // Ask for confirmation in production
    if (process.env.NODE_ENV === 'production') {
      console.log('\n⚠️  PRODUCTION ENVIRONMENT DETECTED');
      const confirmed = await askForConfirmation('Continue with database backup?');
      if (!confirmed) {
        console.log('❌ Cancelled by user');
        return;
      }
    }

    // Initialize result object
    const result: BackupResult = {
      success: false,
      size: 0,
      duration: 0,
      metadata: {
        timestamp: new Date().toISOString(),
        databaseName: dbInfo.database,
        format: config.format,
        compressed: config.compress,
        size: 0,
        duration: 0,
        config
      },
      errors: []
    };

    try {
      // Execute backup
      const backupResult = await executeBackup(config, dbInfo, outputPath);
      result.duration = backupResult.duration;
      result.size = backupResult.size;
      result.backupPath = outputPath;
      result.metadata.duration = backupResult.duration;
      result.metadata.size = backupResult.size;

      // Compress if requested and format is SQL
      if (config.compress && config.format === 'sql' && !outputPath.endsWith('.gz')) {
        const compressedPath = await compressBackup(outputPath);
        result.compressedPath = compressedPath;
        const compressedStats = fs.statSync(compressedPath);
        result.compressedSize = compressedStats.size;
        result.compressionRatio = ((result.size - result.compressedSize) / result.size) * 100;
        result.metadata.compressedSize = result.compressedSize;
      }

      // Verify backup if requested
      if (config.verifyBackup) {
        const verificationPath = result.compressedPath || result.backupPath!;
        const isValid = await verifyBackup(verificationPath, config);
        if (!isValid) {
          result.errors.push('Backup verification failed');
        }
      }

      // Get database statistics
      const stats = await getDatabaseStats(dbInfo);
      result.metadata.postgresVersion = stats.postgresVersion;
      result.metadata.tableCount = stats.tableCount;
      result.metadata.recordCount = stats.recordCount;

      // Create metadata file
      createMetadataFile(result.backupPath!, result, config, dbInfo);

      // Clean up old backups
      await cleanupOldBackups(config);

      result.success = result.errors.length === 0;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(errorMessage);
      console.error('❌ Backup failed:', errorMessage);
    }

    // Generate report
    generateReport(result, config);

    if (!result.success) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 Database backup failed:', error);
    
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