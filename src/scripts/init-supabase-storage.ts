import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function initializeStorage() {
  try {
    console.log('🚀 Initializing Supabase Storage...');

    // Create the catering-images bucket
    const { data: bucket, error: bucketError } = await supabase
      .storage
      .createBucket('catering-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/jpg'],
        fileSizeLimit: 10485760, // 10MB
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket "catering-images" already exists');
      } else {
        throw bucketError;
      }
    } else {
      console.log('✅ Created bucket "catering-images"');
    }

    // Set up RLS policies for the bucket
    console.log('🔐 Setting up RLS policies...');

    // Policy to allow public read access
    const { error: readPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'catering-images',
      policy_name: 'Public read access',
      definition: 'true', // Allow all reads
      command: 'SELECT'
    });

    if (readPolicyError) {
      console.log('⚠️ Read policy may already exist:', readPolicyError.message);
    } else {
      console.log('✅ Created read policy');
    }

    // Policy to allow authenticated users to upload
    const { error: uploadPolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'catering-images',
      policy_name: 'Authenticated upload access',
      definition: 'auth.role() = "authenticated"',
      command: 'INSERT'
    });

    if (uploadPolicyError) {
      console.log('⚠️ Upload policy may already exist:', uploadPolicyError.message);
    } else {
      console.log('✅ Created upload policy');
    }

    // Policy to allow authenticated users to update
    const { error: updatePolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'catering-images',
      policy_name: 'Authenticated update access',
      definition: 'auth.role() = "authenticated"',
      command: 'UPDATE'
    });

    if (updatePolicyError) {
      console.log('⚠️ Update policy may already exist:', updatePolicyError.message);
    } else {
      console.log('✅ Created update policy');
    }

    // Policy to allow authenticated users to delete
    const { error: deletePolicyError } = await supabase.rpc('create_storage_policy', {
      bucket_name: 'catering-images',
      policy_name: 'Authenticated delete access',
      definition: 'auth.role() = "authenticated"',
      command: 'DELETE'
    });

    if (deletePolicyError) {
      console.log('⚠️ Delete policy may already exist:', deletePolicyError.message);
    } else {
      console.log('✅ Created delete policy');
    }

    console.log('✨ Supabase Storage initialization complete!');
    console.log('📂 Bucket URL:', `${supabaseUrl}/storage/v1/object/public/catering-images/`);

  } catch (error) {
    console.error('❌ Failed to initialize storage:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeStorage();
}

export { initializeStorage }; 