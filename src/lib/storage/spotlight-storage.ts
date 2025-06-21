import { createClient } from '@/utils/supabase/server';
import { createClient as createClientSide } from '@/utils/supabase/client';

const BUCKET_NAME = 'spotlight-picks';
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload an image to Supabase Storage for spotlight picks
 */
export async function uploadSpotlightImage(
  file: File,
  position: number
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

    return {
      success: true,
      url: urlData.publicUrl
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