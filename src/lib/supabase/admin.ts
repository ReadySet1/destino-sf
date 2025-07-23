import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Ensure environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseServiceRoleKey) {
  // Log a more specific error server-side if the service role key is missing
  console.error(
    'Missing environment variable: SUPABASE_SERVICE_ROLE_KEY. This key is required for admin operations.'
  );
  throw new Error('Server configuration error: Missing Supabase service role key.');
}

// Create and export the Supabase Admin Client
// Note: This client has admin privileges and should only be used in server-side code (Server Actions, Route Handlers)
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // It's generally recommended to disable auto-refreshing tokens for server-side clients
    // as they use the service_role key which doesn't expire.
    autoRefreshToken: false,
    persistSession: false,
  },
});

console.log('Supabase Admin Client initialized.'); // Optional: Log initialization
