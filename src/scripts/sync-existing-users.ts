#!/usr/bin/env tsx

/**
 * Script to sync existing Supabase Auth users with profiles
 * This script finds users without profiles and creates them
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncExistingUsers() {
  console.log('🚀 Starting user profile synchronization...');
  
  try {
    // Get all users from Supabase Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error fetching auth users:', authError);
      return;
    }
    
    console.log(`📊 Found ${authUsers.users.length} users in Supabase Auth`);
    
    // Get all existing profile IDs
    const existingProfiles = await prisma.profile.findMany({
      select: { id: true }
    });
    
    const existingProfileIds = new Set(existingProfiles.map(p => p.id));
    console.log(`📊 Found ${existingProfiles.length} existing profiles`);
    
    // Find users without profiles
    const usersWithoutProfiles = authUsers.users.filter(
      user => !existingProfileIds.has(user.id)
    );
    
    console.log(`🔍 Found ${usersWithoutProfiles.length} users without profiles`);
    
    if (usersWithoutProfiles.length === 0) {
      console.log('✅ All users already have profiles!');
      return;
    }
    
    // Create profiles for users without them
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithoutProfiles) {
      try {
        console.log(`🔄 Creating profile for user: ${user.email} (${user.id})`);
        
        // Use the database function to create profile
        const profileResult = await prisma.$queryRaw`
          SELECT public.ensure_user_profile(
            ${user.id}::uuid, 
            ${user.email || 'unknown@example.com'}::text, 
            'CUSTOMER'::text
          ) as result
        `;
        
        const result = (profileResult as any)[0]?.result;
        
        if (result?.action === 'error') {
          throw new Error(result.error);
        }
        
        if (result?.action === 'profile_created' || result?.action === 'profile_exists') {
          console.log(`✅ Profile created/ensured for user: ${user.email}`);
          successCount++;
        } else {
          throw new Error('Unexpected result from database function');
        }
        
      } catch (error) {
        console.error(`❌ Failed to create profile for user ${user.email}:`, error);
        errorCount++;
        
        // Try fallback method
        try {
          await prisma.profile.create({
            data: {
              id: user.id,
              email: user.email || 'unknown@example.com',
              role: 'CUSTOMER',
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
          console.log(`✅ Profile created using fallback for user: ${user.email}`);
          successCount++;
          errorCount--; // Adjust counts since fallback succeeded
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed for user ${user.email}:`, fallbackError);
        }
      }
    }
    
    console.log('\n📈 Synchronization Summary:');
    console.log(`✅ Successfully created: ${successCount} profiles`);
    console.log(`❌ Failed to create: ${errorCount} profiles`);
    console.log(`📊 Total processed: ${usersWithoutProfiles.length} users`);
    
  } catch (error) {
    console.error('💥 Fatal error during synchronization:', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Run the script if called directly
if (require.main === module) {
  syncExistingUsers()
    .then(() => {
      console.log('🎉 User synchronization completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export { syncExistingUsers };
