# Spotlight Image Orphan Cleanup System

## Overview

The spotlight picks feature allows admins to upload custom images. However, if a user uploads an image but then closes the modal without saving the spotlight pick, the uploaded image becomes "orphaned" - it exists in Supabase storage but isn't referenced by any database record.

This document describes the comprehensive fallback system implemented to handle this scenario.

## Problem

When users upload images for spotlight picks but don't save them:
1. Image gets uploaded to Supabase storage immediately
2. User closes modal without saving the spotlight pick
3. Image remains in storage but no database record references it
4. Storage space is wasted with orphaned files

## Solution Components

### 1. Database Tracking

**New Model: `SpotlightImageUpload`**
```prisma
model SpotlightImageUpload {
  id        String   @id @default(uuid()) @db.Uuid
  imageUrl  String   @map("image_url")
  position  Int
  uploadedBy String  @map("uploaded_by") @db.Uuid
  isUsed    Boolean  @default(false) @map("is_used")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  uploader Profile @relation(fields: [uploadedBy], references: [id], onDelete: Cascade)

  @@index([isUsed])
  @@index([createdAt])
  @@index([uploadedBy])
  @@map("spotlight_image_uploads")
}
```

This table tracks:
- Every image upload with URL and timestamp
- Which user uploaded it
- Whether it's been used in a saved spotlight pick
- When it was uploaded

### 2. Enhanced Upload Process

**File: `src/lib/storage/spotlight-storage.ts`**

The `uploadSpotlightImage` function now:
1. Uploads image to Supabase storage
2. Records the upload in the tracking table with `isUsed: false`
3. Associates it with the user who uploaded it

### 3. Marking Images as Used

**File: `src/app/api/admin/spotlight-picks/route.ts`**

When a spotlight pick is successfully saved:
1. The `markSpotlightImageAsUsed` function is called
2. It marks the corresponding image record as `isUsed: true`
3. This prevents the image from being cleaned up

### 4. Cleanup Functions

**File: `src/lib/storage/spotlight-storage.ts`**

#### `cleanupOrphanedSpotlightImages(olderThanMinutes)`
- Finds images marked as `isUsed: false` older than specified time
- Deletes them from both Supabase storage and database
- Returns statistics about what was cleaned up

#### `getSpotlightImageStats()`
- Returns statistics about uploads:
  - Total uploads
  - Used images
  - Orphaned images
  - Old orphaned images (>1 hour)

### 5. Admin API Endpoints

**File: `src/app/api/admin/spotlight-picks/cleanup/route.ts`**

- `GET /api/admin/spotlight-picks/cleanup` - Get statistics
- `POST /api/admin/spotlight-picks/cleanup` - Perform cleanup

Both endpoints require admin authentication.

### 6. Admin UI Panel

**File: `src/components/admin/SpotlightPicks/ImageCleanupPanel.tsx`**

Provides admins with:
- Real-time statistics dashboard
- Manual cleanup controls
- Configuration options
- Status alerts

### 7. Maintenance Script

**File: `scripts/cleanup-orphaned-spotlight-images.ts`**

Command-line script for automated cleanup:

```bash
# View what would be cleaned up (dry run)
pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts --dry-run

# Clean up images older than 60 minutes (default)
pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts

# Clean up images older than 2 hours
pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts --older-than-minutes=120

# Show help
pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts --help
```

## Usage Guide

### For Developers

1. **Testing the system:**
   ```typescript
   // Upload a test image
   const result = await uploadSpotlightImage(file, 1, userId);
   
   // Check stats
   const stats = await getSpotlightImageStats();
   
   // Mark as used when spotlight pick is saved
   await markSpotlightImageAsUsed(imageUrl);
   
   // Clean up orphans
   const cleanup = await cleanupOrphanedSpotlightImages(60);
   ```

2. **API Usage:**
   ```bash
   # Get stats
   curl -X GET /api/admin/spotlight-picks/cleanup
   
   # Cleanup images older than 2 hours
   curl -X POST /api/admin/spotlight-picks/cleanup \
     -H "Content-Type: application/json" \
     -d '{"olderThanMinutes": 120}'
   ```

### For Admins

1. **Monitor orphaned images:**
   - Visit the admin panel
   - Check the Image Cleanup Management section
   - Review statistics regularly

2. **Manual cleanup:**
   - Set the time threshold (default: 60 minutes)
   - Click "Clean Up Orphaned Images"
   - Review the results

3. **Automated cleanup:**
   - Set up a cron job to run the maintenance script
   - Recommended: every 2-4 hours
   ```bash
   # Example crontab entry (every 2 hours)
   0 */2 * * * cd /path/to/project && pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts --older-than-minutes=120
   ```

## Configuration

### Cleanup Timing
- **Default orphan age:** 60 minutes
- **Recommended range:** 30-240 minutes
- **Maximum allowed:** 10080 minutes (1 week)

### Safety Features

1. **Time-based protection:** Only cleans up images older than specified time
2. **Usage marking:** Images are marked as used when spotlight picks are saved
3. **User tracking:** All uploads are associated with the user who uploaded them
4. **Error handling:** Cleanup continues even if individual deletions fail
5. **Dry-run mode:** Test cleanup without actually deleting files

## Monitoring

### Key Metrics to Watch

1. **Orphaned Images Growth:** Should stay low with regular cleanup
2. **Old Orphaned Images:** Should be close to zero
3. **Cleanup Success Rate:** Should be high (few errors)
4. **Storage Usage:** Should remain stable or decrease

### Alerts to Set Up

Consider setting up monitoring for:
- High number of orphaned images (>50)
- Old orphaned images accumulating (>10)
- Cleanup failures
- Unusual upload patterns

## Troubleshooting

### Common Issues

1. **Cleanup not reducing orphan count:**
   - Check if time threshold is too restrictive
   - Verify admin permissions
   - Check for storage permission issues

2. **Images not being marked as used:**
   - Verify spotlight pick save operation
   - Check for database connectivity issues
   - Review error logs

3. **High orphan count:**
   - Users frequently abandoning uploads
   - Consider reducing cleanup interval
   - Review UI/UX for upload process

### Debugging

1. **Check upload tracking:**
   ```sql
   SELECT * FROM spotlight_image_uploads 
   WHERE is_used = false 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

2. **Verify cleanup history:**
   ```bash
   # Run with dry-run to see what would be cleaned
   pnpm tsx scripts/cleanup-orphaned-spotlight-images.ts --dry-run
   ```

3. **Check storage permissions:**
   ```typescript
   // Test storage access
   const result = await supabase.storage.from('spotlight-picks').list();
   ```

## Best Practices

1. **Regular Maintenance:** Run cleanup at least daily
2. **Monitor Trends:** Track orphan counts over time
3. **User Education:** Consider adding UI hints about saving changes
4. **Backup Strategy:** Ensure cleanup doesn't interfere with backups
5. **Testing:** Test cleanup process in staging before production

## Future Enhancements

Potential improvements to consider:

1. **Auto-cleanup on modal close:** Delete uploaded image if modal closes without save
2. **Preview mode:** Allow temporary uploads with automatic cleanup
3. **Batch upload tracking:** Handle multiple images per upload session
4. **Usage analytics:** Track which positions have most orphans
5. **Storage quotas:** Set limits per user or time period 