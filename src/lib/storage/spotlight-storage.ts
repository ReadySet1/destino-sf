import { createClient } from '@/utils/supabase/server';
import { createClient as createClientSide } from '@/utils/supabase/client';
import { prisma } from '@/lib/db';

const BUCKET_NAME = 'spotlight-picks';
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload an image to Supabase Storage for spotlight picks
 */
export async function uploadSpotlightImage(
  file: File,
  position: number,
  userId?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Validate file
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.'
      };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: 'File too large. Please upload an image under 5MB.'
      };
    }

    const supabase = await createClient();

    // Create a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `position-${position}_${Date.now()}.${fileExt}`;
    const filePath = `position-${position}/${fileName}`;

    // Upload file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false // Create new file, don't overwrite
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // Track the upload in database if userId is provided
    if (userId) {
      try {
        await prisma.spotlightImageUpload.create({
          data: {
            imageUrl: imageUrl,
            position: position,
            uploadedBy: userId,
            isUsed: false,
          },
        });
        console.log(`📸 Tracked spotlight image upload: ${imageUrl}`);
      } catch (dbError) {
        // Log but don't fail the upload
        console.error('Failed to track upload in database:', dbError);
      }
    }

    return {
      success: true,
      url: imageUrl
    };

  } catch (error) {
    console.error('Error uploading spotlight image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error'
    };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteSpotlightImage(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.findIndex(part => part === BUCKET_NAME);
    
    if (bucketIndex === -1) {
      return {
        success: false,
        error: 'Invalid image URL - not from spotlight picks bucket'
      };
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    // Delete file
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return {
        success: false,
        error: `Delete failed: ${deleteError.message}`
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Error deleting spotlight image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown delete error'
    };
  }
}

/**
 * Initialize the spotlight picks bucket if it doesn't exist (Server-side)
 */
export async function initializeSpotlightBucket(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return {
        success: false,
        error: `Failed to list buckets: ${listError.message}`
      };
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      // Create bucket
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ALLOWED_FILE_TYPES,
        fileSizeLimit: MAX_FILE_SIZE
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return {
          success: false,
          error: `Failed to create bucket: ${createError.message}`
        };
      }

      console.log(`Created spotlight picks bucket: ${BUCKET_NAME}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Error initializing spotlight picks bucket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown initialization error'
    };
  }
}

/**
 * Initialize the spotlight picks bucket (Client-side for scripts)
 */
export async function initializeSpotlightBucketClientSide(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClientSide();

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return {
        success: false,
        error: `Failed to list buckets: ${listError.message}`
      };
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (!bucketExists) {
      // Create bucket
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ALLOWED_FILE_TYPES,
        fileSizeLimit: MAX_FILE_SIZE
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return {
          success: false,
          error: `Failed to create bucket: ${createError.message}`
        };
      }

      console.log(`Created spotlight picks bucket: ${BUCKET_NAME}`);
    }

    return { success: true };

  } catch (error) {
    console.error('Error initializing spotlight picks bucket:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown initialization error'
    };
  }
}

/**
 * Mark an uploaded image as used (when spotlight pick is saved)
 */
export async function markSpotlightImageAsUsed(
  imageUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.spotlightImageUpload.updateMany({
      where: {
        imageUrl: imageUrl,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    });

    console.log(`✅ Marked spotlight image as used: ${imageUrl}`);
    return { success: true };

  } catch (error) {
    console.error('Error marking image as used:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error marking image as used'
    };
  }
}

/**
 * Clean up orphaned spotlight images
 * @param olderThanMinutes - Clean up images uploaded more than this many minutes ago and not used
 */
export async function cleanupOrphanedSpotlightImages(
  olderThanMinutes: number = 60
): Promise<{ success: boolean; deletedCount?: number; errors?: string[]; error?: string }> {
  try {
    const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    
    // Find orphaned images
    const orphanedUploads = await prisma.spotlightImageUpload.findMany({
      where: {
        isUsed: false,
        createdAt: {
          lt: cutoffTime,
        },
      },
    });

    if (orphanedUploads.length === 0) {
      console.log('🧹 No orphaned spotlight images found for cleanup');
      return { success: true, deletedCount: 0 };
    }

    console.log(`🧹 Found ${orphanedUploads.length} orphaned spotlight images to clean up`);

    const supabase = await createClient();
    const errors: string[] = [];
    let successCount = 0;

    // Delete from storage and database
    for (const upload of orphanedUploads) {
      try {
        // Extract file path from URL
        const url = new URL(upload.imageUrl);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part === BUCKET_NAME);
        
        if (bucketIndex !== -1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');

          // Delete from storage
          const { error: deleteError } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([filePath]);

          if (deleteError) {
            console.error(`Failed to delete ${filePath} from storage:`, deleteError);
            errors.push(`Storage deletion failed for ${upload.imageUrl}: ${deleteError.message}`);
          } else {
            console.log(`🗑️ Deleted orphaned image from storage: ${filePath}`);
          }
        }

        // Delete from database
        await prisma.spotlightImageUpload.delete({
          where: { id: upload.id },
        });

        successCount++;
        console.log(`🗑️ Deleted orphaned image record: ${upload.imageUrl}`);

      } catch (error) {
        const errorMsg = `Failed to delete ${upload.imageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    return {
      success: true,
      deletedCount: successCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('Error cleaning up orphaned spotlight images:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown cleanup error'
    };
  }
}

/**
 * Get statistics about spotlight image uploads
 */
export async function getSpotlightImageStats(): Promise<{
  success: boolean;
  stats?: {
    totalUploads: number;
    usedImages: number;
    orphanedImages: number;
    oldOrphanedImages: number;
  };
  error?: string;
}> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [totalUploads, usedImages, orphanedImages, oldOrphanedImages] = await Promise.all([
      prisma.spotlightImageUpload.count(),
      prisma.spotlightImageUpload.count({ where: { isUsed: true } }),
      prisma.spotlightImageUpload.count({ where: { isUsed: false } }),
      prisma.spotlightImageUpload.count({
        where: {
          isUsed: false,
          createdAt: {
            lt: oneHourAgo,
          },
        },
      }),
    ]);

    return {
      success: true,
      stats: {
        totalUploads,
        usedImages,
        orphanedImages,
        oldOrphanedImages,
      },
    };

  } catch (error) {
    console.error('Error getting spotlight image stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown stats error'
    };
  }
} 