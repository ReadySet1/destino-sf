# Database Backup Plan for Supabase Free Tier

## 🎯 Overview

This backup strategy provides automated daily backups for Supabase free tier projects deployed on Vercel, using multiple storage providers for redundancy.

**Backup Strategy**: 3-2-1 Rule

- 3 copies of data (Production + 2 backups)
- 2 different storage types (GitHub + Cloud Storage)
- 1 offsite backup (Cloud Storage)

## 📋 Implementation Components

### 1. Backup Storage Options

#### Primary: GitHub Private Repository

- **Pros**: Free, version controlled, easy restoration
- **Cons**: 100MB file size limit, not ideal for large datasets
- **Best for**: Schema + small to medium datasets

#### Secondary: Cloud Storage (Choose one)

- **Supabase Storage**: Integrated with Supabase, generous free tier (1GB, then pay-per-use)
- **Cloudflare R2**: S3-compatible, generous free tier (10GB/month)
- **AWS S3**: Reliable, pay-per-use
- **Vercel Blob**: Integrated with Vercel, 5GB free tier
- **Google Cloud Storage**: Reliable, reasonable pricing

### 2. Backup Types

1. **Schema Backup**: Database structure, functions, RLS policies
2. **Data Backup**: Table data in JSON/CSV format
3. **Incremental Backup**: Only changed records (for large datasets)

## 🚀 Implementation

### Step 1: Environment Variables

Add to `.env.local` and Vercel environment variables:

```bash
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# Backup Storage (GitHub)
GITHUB_TOKEN=your_github_pat_token
GITHUB_BACKUP_REPO=username/repo-backups
GITHUB_BACKUP_BRANCH=main

# Backup Storage (Choose one cloud provider)
# Option A: Supabase Storage
SUPABASE_STORAGE_BUCKET=backups

# Option B: Cloudflare R2
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=supabase-backups
R2_ENDPOINT=https://[account_id].r2.cloudflarestorage.com

# Option C: AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=supabase-backups
AWS_REGION=us-east-1

# Option D: Vercel Blob
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# Notification (Optional)
SLACK_WEBHOOK_URL=your_slack_webhook
DISCORD_WEBHOOK_URL=your_discord_webhook
ADMIN_EMAIL=admin@example.com

# Cron Secret (Generate a random string)
CRON_SECRET=your_random_secret_string
```

### Step 2: Install Dependencies

```bash
npm install @supabase/supabase-js @aws-sdk/client-s3 @octokit/rest zod date-fns @vercel/blob
npm install --save-dev @types/pg
```

### Step 3: Vercel Cron Job Configuration

Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/cleanup",
      "schedule": "0 3 * * 0"
    }
  ]
}
```

### Step 4: Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── cron/
│   │   │   ├── backup/
│   │   │   │   └── route.ts        # Daily backup cron job
│   │   │   └── cleanup/
│   │   │       └── route.ts        # Weekly cleanup cron job
│   │   └── admin/
│   │       ├── backup/
│   │       │   ├── route.ts        # Manual backup endpoint
│   │       │   └── list/
│   │       │       └── route.ts    # List backups endpoint
│   │       └── restore/
│   │           └── route.ts        # Restore backup endpoint
│   └── admin/
│       └── backup/
│           └── page.tsx             # Backup management UI
└── lib/
    └── backup/
        ├── config.ts                # Backup configuration
        ├── types.ts                 # TypeScript types
        ├── supabase-backup.ts       # Backup logic
        ├── storage-providers.ts     # Storage providers
        └── restore.ts               # Restore logic
```

## 📝 Code Implementation

### Backup Configuration (`src/lib/backup/config.ts`)

```typescript
import { z } from 'zod';

export const BackupConfigSchema = z.object({
  retention: z.object({
    daily: z.number().default(7),
    weekly: z.number().default(4),
    monthly: z.number().default(3),
  }),
  tables: z.array(z.string()).default([]),
  excludeTables: z.array(z.string()).default(['migrations', 'schema_migrations']),
  maxBackupSize: z.number().default(100),
  compression: z.boolean().default(true),
  encryption: z.boolean().default(false),
  storageProviders: z.array(z.enum(['github', 'supabase', 's3', 'r2', 'blob'])).default(['github']),
});

export type BackupConfig = z.infer<typeof BackupConfigSchema>;

export const defaultConfig: BackupConfig = {
  retention: {
    daily: 7,
    weekly: 4,
    monthly: 3,
  },
  tables: [], // Empty means backup all tables
  excludeTables: ['migrations', 'schema_migrations'],
  maxBackupSize: 100,
  compression: true,
  encryption: false,
  storageProviders: ['github', 'supabase'],
};
```

### Types (`src/lib/backup/types.ts`)

```typescript
export interface BackupMetadata {
  id: string;
  timestamp: Date;
  version: string;
  type: 'full' | 'incremental';
  size: number;
  tables: string[];
  rowCounts: Record<string, number>;
  checksum: string;
  compressed: boolean;
  encrypted: boolean;
  storageLocation: string[];
}

export interface BackupResult {
  success: boolean;
  metadata?: BackupMetadata;
  backupData?: string;
  errors?: string[];
  warnings?: string[];
}
```

### Main Backup Logic (`src/lib/backup/supabase-backup.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';
import crypto from 'crypto';
import zlib from 'zlib';
import { promisify } from 'util';
import { BackupConfig, BackupResult, BackupMetadata } from './types';

const gzip = promisify(zlib.gzip);

export class SupabaseBackup {
  private supabase;

  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }

  async getTableList(): Promise<string[]> {
    const { data, error } = await this.supabase.rpc('get_tables_list');
    if (error) {
      // Fallback: query information_schema
      const { data: tables } = await this.supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

      return tables?.map((t: any) => t.table_name) || [];
    }
    return data || [];
  }

  async backupTable(tableName: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async backupAllTables(tables: string[]): Promise<Record<string, any[]>> {
    const backup: Record<string, any[]> = {};

    for (const table of tables) {
      try {
        backup[table] = await this.backupTable(table);
        console.log(`✓ Backed up ${table}: ${backup[table].length} rows`);
      } catch (error: any) {
        console.error(`✗ Failed to backup ${table}:`, error.message);
      }
    }

    return backup;
  }

  async createBackup(config: BackupConfig): Promise<BackupResult> {
    try {
      const timestamp = new Date();
      const backupId = `backup_${format(timestamp, 'yyyyMMdd_HHmmss')}`;

      // Get list of tables
      let tables = config.tables;
      if (tables.length === 0) {
        const allTables = await this.getTableList();
        tables = allTables.filter(t => !config.excludeTables.includes(t));
      }

      // Backup data
      const data = await this.backupAllTables(tables);

      // Calculate row counts
      const rowCounts: Record<string, number> = {};
      for (const [table, rows] of Object.entries(data)) {
        rowCounts[table] = rows.length;
      }

      // Create backup object
      const backup = {
        id: backupId,
        timestamp: timestamp.toISOString(),
        version: '1.0',
        data,
        metadata: {
          tables,
          rowCounts,
          totalRows: Object.values(rowCounts).reduce((a, b) => a + b, 0),
        },
      };

      // Convert to JSON
      let backupData = JSON.stringify(backup, null, 2);
      let compressed = false;

      // Compress if enabled and needed
      if (config.compression && backupData.length > 1024 * 1024) {
        backupData = (await gzip(backupData)).toString('base64');
        compressed = true;
      }

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(backupData).digest('hex');

      // Create metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        version: '1.0',
        type: 'full',
        size: Buffer.byteLength(backupData),
        tables,
        rowCounts,
        checksum,
        compressed,
        encrypted: false,
        storageLocation: [],
      };

      return {
        success: true,
        metadata,
        backupData,
      };
    } catch (error: any) {
      return {
        success: false,
        errors: [error.message],
      };
    }
  }
}
```

### Storage Providers (`src/lib/backup/storage-providers.ts`)

```typescript
import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';

export interface StorageProvider {
  name: string;
  upload(key: string, data: string | Buffer): Promise<string>;
  download(key: string): Promise<string | Buffer>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

export class GitHubStorage implements StorageProvider {
  name = 'github';
  private octokit: Octokit;
  private repo: string;
  private owner: string;
  private branch: string;

  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const [owner, repo] = process.env.GITHUB_BACKUP_REPO!.split('/');
    this.owner = owner;
    this.repo = repo;
    this.branch = process.env.GITHUB_BACKUP_BRANCH || 'main';
  }

  async upload(key: string, data: string | Buffer): Promise<string> {
    const content = Buffer.from(data).toString('base64');

    try {
      // Check if file exists
      const existing = await this.octokit.repos
        .getContent({
          owner: this.owner,
          repo: this.repo,
          path: key,
          ref: this.branch,
        })
        .catch(() => null);

      const message = `Backup: ${key}`;

      if (existing && existing.data && 'sha' in existing.data) {
        // Update existing file
        await this.octokit.repos.createOrUpdateFileContents({
          owner: this.owner,
          repo: this.repo,
          path: key,
          message,
          content,
          branch: this.branch,
          sha: existing.data.sha,
        });
      } else {
        // Create new file
        await this.octokit.repos.createOrUpdateFileContents({
          owner: this.owner,
          repo: this.repo,
          path: key,
          message,
          content,
          branch: this.branch,
        });
      }

      return `github://${this.owner}/${this.repo}/${key}`;
    } catch (error: any) {
      console.error('GitHub upload error:', error.message);
      throw error;
    }
  }

  async download(key: string): Promise<Buffer> {
    const { data } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: key,
      ref: this.branch,
    });

    if ('content' in data) {
      return Buffer.from(data.content, 'base64');
    }

    throw new Error('File not found or is a directory');
  }

  async delete(key: string): Promise<void> {
    const { data: file } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: key,
      ref: this.branch,
    });

    if ('sha' in file) {
      await this.octokit.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path: key,
        message: `Delete backup: ${key}`,
        sha: file.sha,
        branch: this.branch,
      });
    }
  }

  async list(prefix?: string): Promise<string[]> {
    const { data } = await this.octokit.repos.getContent({
      owner: this.owner,
      repo: this.repo,
      path: prefix || '',
      ref: this.branch,
    });

    if (Array.isArray(data)) {
      return data.filter(item => item.type === 'file').map(item => item.path);
    }

    return [];
  }
}

export class SupabaseStorage implements StorageProvider {
  name = 'supabase';
  private supabase;
  private bucket: string;

  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'backups';
  }

  async upload(key: string, data: string | Buffer): Promise<string> {
    try {
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

      const { data: uploadData, error } = await this.supabase.storage
        .from(this.bucket)
        .upload(key, buffer, {
          contentType: 'application/json',
          upsert: true,
        });

      if (error) throw error;

      return `supabase://${this.bucket}/${key}`;
    } catch (error: any) {
      console.error('Supabase Storage upload error:', error.message);
      throw error;
    }
  }

  async download(key: string): Promise<Buffer> {
    const { data, error } = await this.supabase.storage.from(this.bucket).download(key);

    if (error) throw error;
    if (!data) throw new Error('File not found');

    return Buffer.from(await data.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucket).remove([key]);

    if (error) throw error;
  }

  async list(prefix?: string): Promise<string[]> {
    const { data, error } = await this.supabase.storage.from(this.bucket).list(prefix || '', {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) throw error;
    return data?.map(item => item.name) || [];
  }
}

export function getStorageProvider(name: string): StorageProvider {
  switch (name) {
    case 'github':
      return new GitHubStorage();
    case 'supabase':
      return new SupabaseStorage();
    // Add other providers as needed
    default:
      throw new Error(`Unknown storage provider: ${name}`);
  }
}
```

### Cron Job - Daily Backup (`src/app/api/cron/backup/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { SupabaseBackup } from '@/lib/backup/supabase-backup';
import { getStorageProvider } from '@/lib/backup/storage-providers';
import { defaultConfig } from '@/lib/backup/config';
import { format } from 'date-fns';

export const maxDuration = 300; // 5 minutes max for Vercel Hobby

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron job
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting database backup...');

    // Create backup
    const backup = new SupabaseBackup();
    const result = await backup.createBackup(defaultConfig);

    if (!result.success) {
      throw new Error(result.errors?.join(', '));
    }

    // Upload to storage providers
    const uploadResults = [];
    for (const providerName of defaultConfig.storageProviders) {
      try {
        const provider = getStorageProvider(providerName);
        const filename = `backups/${format(new Date(), 'yyyy/MM/dd')}/backup_${Date.now()}.json`;

        const url = await provider.upload(filename, result.backupData!);

        uploadResults.push({
          provider: providerName,
          success: true,
          url,
        });

        console.log(`✓ Uploaded to ${providerName}: ${url}`);
      } catch (error: any) {
        console.error(`✗ Failed to upload to ${providerName}:`, error.message);
        uploadResults.push({
          provider: providerName,
          success: false,
          error: error.message,
        });
      }
    }

    // Send notification (optional)
    if (process.env.SLACK_WEBHOOK_URL) {
      await sendBackupNotification(result, uploadResults);
    }

    return NextResponse.json({
      success: true,
      metadata: result.metadata,
      uploads: uploadResults,
    });
  } catch (error: any) {
    console.error('Backup failed:', error);

    // Send failure notification
    if (process.env.SLACK_WEBHOOK_URL) {
      await sendFailureNotification(error);
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

async function sendBackupNotification(result: any, uploads: any[]) {
  const totalRows = Object.values(result.metadata.rowCounts as Record<string, number>).reduce(
    (a, b) => a + b,
    0
  );

  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `✅ Database backup successful`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `*Database Backup Completed*\n` +
              `• Backup ID: ${result.metadata.id}\n` +
              `• Tables: ${result.metadata.tables.length}\n` +
              `• Total Rows: ${totalRows}\n` +
              `• Size: ${(result.metadata.size / 1024 / 1024).toFixed(2)} MB\n` +
              `• Storage: ${uploads
                .filter(u => u.success)
                .map(u => u.provider)
                .join(', ')}`,
          },
        },
      ],
    }),
  });
}

async function sendFailureNotification(error: any) {
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `❌ Database backup failed: ${error.message}`,
    }),
  });
}
```

### Cron Job - Weekly Cleanup (`src/app/api/cron/cleanup/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getStorageProvider } from '@/lib/backup/storage-providers';
import { defaultConfig } from '@/lib/backup/config';
import { subDays, subWeeks, subMonths, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a Vercel Cron job
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🧹 Starting backup cleanup...');

    const now = new Date();
    const dailyCutoff = subDays(now, defaultConfig.retention.daily);
    const weeklyCutoff = subWeeks(now, defaultConfig.retention.weekly);
    const monthlyCutoff = subMonths(now, defaultConfig.retention.monthly);

    let deletedCount = 0;

    for (const providerName of defaultConfig.storageProviders) {
      try {
        const provider = getStorageProvider(providerName);
        const files = await provider.list('backups/');

        for (const file of files) {
          // Parse date from filename
          const match = file.match(/backup_(\d{8}_\d{6})/);
          if (!match) continue;

          const dateStr = match[1];
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1;
          const day = parseInt(dateStr.substring(6, 8));
          const backupDate = new Date(year, month, day);

          // Determine if should delete based on retention policy
          if (shouldDelete(backupDate, dailyCutoff, weeklyCutoff, monthlyCutoff)) {
            await provider.delete(file);
            deletedCount++;
            console.log(`✓ Deleted old backup: ${file}`);
          }
        }
      } catch (error: any) {
        console.error(`✗ Cleanup failed for ${providerName}:`, error.message);
      }
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
    });
  } catch (error: any) {
    console.error('Cleanup failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function shouldDelete(
  backupDate: Date,
  dailyCutoff: Date,
  weeklyCutoff: Date,
  monthlyCutoff: Date
): boolean {
  // Keep all backups newer than daily cutoff
  if (backupDate > dailyCutoff) return false;

  // Keep weekly backups (Sunday) between daily and weekly cutoff
  if (backupDate > weeklyCutoff && backupDate.getDay() === 0) return false;

  // Keep monthly backups (1st of month) between weekly and monthly cutoff
  if (backupDate > monthlyCutoff && backupDate.getDate() === 1) return false;

  // Delete if older than monthly cutoff
  if (backupDate < monthlyCutoff) return true;

  // Delete daily backups older than daily cutoff
  return true;
}
```

## 🔧 Setup Instructions

### 1. Create Supabase Storage Bucket (If using Supabase Storage)

**Benefits**: Native integration, no additional credentials needed, same authentication as your database.

1. Go to your Supabase project dashboard
2. Navigate to Storage section
3. Create a new bucket named `backups` (or use your preferred name)
4. Set the bucket as private for security
5. Configure bucket policies if needed (optional - service role key has full access)

### 2. Create GitHub Backup Repository

1. Create a new private repository on GitHub (e.g., `supabase-backups`)
2. Generate a Personal Access Token with repo permissions
3. Add the token to Vercel environment variables

### 3. Configure Vercel Environment Variables

```bash
# In Vercel Dashboard > Settings > Environment Variables
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=backups
GITHUB_TOKEN=your_github_pat_token
GITHUB_BACKUP_REPO=username/supabase-backups
GITHUB_BACKUP_BRANCH=main
CRON_SECRET=generate_random_string_here
```

### 4. Deploy to Vercel

```bash
git add .
git commit -m "Add database backup system"
git push
vercel --prod
```

### 5. Verify Cron Jobs

After deployment, verify cron jobs are registered:

1. Go to Vercel Dashboard
2. Select your project
3. Go to Functions tab
4. Check that `/api/cron/backup` and `/api/cron/cleanup` are listed

## 📊 Monitoring & Alerts

### Health Check Endpoint

Create `/api/health/backup` to monitor backup status:

```typescript
export async function GET() {
  // Check last backup timestamp
  // Return status and metrics
}
```

### Recommended Monitoring

1. **Uptime Monitoring**: Use services like UptimeRobot to monitor backup health endpoint
2. **Backup Verification**: Weekly manual checks of backup integrity
3. **Storage Monitoring**: Track storage usage in GitHub/Cloud provider
4. **Alert Channels**: Configure Slack/Discord webhooks for notifications

## 🚨 Disaster Recovery Plan

### Restore Process

1. **Identify Recovery Point**: Choose backup to restore from
2. **Verify Backup Integrity**: Check checksum and decompress if needed
3. **Test Restore**: First restore to staging/development environment
4. **Production Restore**: Execute restore with maintenance mode enabled
5. **Verify Data**: Run data integrity checks post-restore
6. **Clear Cache**: Invalidate all caches after restore

### Emergency Contacts

- **Primary DBA**: [Your Name] - [Contact]
- **Backup Admin**: [Backup Contact]
- **Supabase Support**: support@supabase.io

## 📈 Cost Analysis

### Estimated Monthly Costs

- **GitHub Storage**: Free (up to 1GB)
- **Supabase Storage**: Free tier (1GB), then $0.021/GB
- **Cloudflare R2**: Free tier (10GB)
- **Vercel Functions**: Free tier (100GB-hrs)
- **Total**: $0 for small to medium projects

### When to Upgrade

- Database > 100MB compressed
- Need point-in-time recovery
- Require < 24hr RPO
- Need automated testing of backups

## 🔒 Security Considerations

1. **Encryption**: Enable at-rest encryption for sensitive data
2. **Access Control**: Limit backup access to authorized personnel only
3. **Audit Logging**: Log all backup and restore operations
4. **Secret Rotation**: Rotate tokens and keys quarterly
5. **Compliance**: Ensure GDPR compliance for EU data

## 📝 Maintenance Checklist

### Daily

- [x] Automated backup runs at 2:00 AM UTC
- [ ] Check for backup failure notifications

### Weekly

- [ ] Verify backup file integrity
- [ ] Check storage usage
- [ ] Review backup logs

### Monthly

- [ ] Test restore process on staging
- [ ] Review and update retention policy
- [ ] Update documentation

### Quarterly

- [ ] Full disaster recovery drill
- [ ] Rotate access tokens
- [ ] Review backup strategy

## 🎯 Next Steps

1. **Immediate Actions**:
   - [ ] Set up GitHub backup repository
   - [ ] Configure environment variables
   - [ ] Deploy initial version
   - [ ] Test manual backup

2. **Week 1**:
   - [ ] Verify daily backups running
   - [ ] Set up monitoring alerts
   - [ ] Document restore process

3. **Month 1**:
   - [ ] Perform first restore test
   - [ ] Optimize backup size if needed
   - [ ] Add incremental backups if required

## 📚 Additional Resources

- [Supabase Backup Documentation](https://supabase.com/docs/guides/platform/backups)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [3-2-1 Backup Strategy](https://www.veeam.com/blog/321-backup-rule.html)
