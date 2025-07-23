import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminAuth() {
  console.log('🔧 Fixing admin authentication linking...');

  const adminEmails = ['emmanuel@alanis.dev', 'james@destinosf.com'];

  for (const email of adminEmails) {
    console.log(`\n📧 Processing ${email}...`);

    try {
      // 1. Get Supabase Auth user
      const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listError) {
        console.error(`❌ Error listing users:`, listError);
        continue;
      }

      const authUser = authUsers.users.find(u => u.email === email);

      if (!authUser) {
        console.log(`⚠️  No Supabase Auth user found for ${email}`);
        continue;
      }

      console.log(`✅ Found Supabase Auth user: ${authUser.id}`);

      // 2. Get profile from database
      const profile = await prisma.profile.findUnique({
        where: { email },
      });

      if (!profile) {
        console.log(`⚠️  No profile found for ${email}`);
        continue;
      }

      console.log(`✅ Found profile with ID: ${profile.id}`);

      // 3. Check if they're linked correctly
      if (profile.id === authUser.id) {
        console.log(`✅ ${email} is already properly linked!`);
        continue;
      }

      // 4. Update profile to match auth user ID
      try {
        await prisma.profile.update({
          where: { email },
          data: {
            id: authUser.id,
            updated_at: new Date(),
          },
        });
        console.log(`🔗 Successfully linked ${email} profile to auth user ${authUser.id}`);
      } catch (updateError: any) {
        console.error(`❌ Error updating profile for ${email}:`, updateError);

        // If there's a conflict with the new ID, we might need to delete and recreate
        if (updateError.code === 'P2002') {
          console.log(`🔄 Attempting to recreate profile with correct ID...`);

          try {
            // Delete the old profile
            await prisma.profile.delete({
              where: { email },
            });

            // Create new profile with correct ID
            await prisma.profile.create({
              data: {
                id: authUser.id,
                email,
                name: profile.name,
                phone: profile.phone,
                role: profile.role,
              },
            });

            console.log(`✨ Successfully recreated profile for ${email}`);
          } catch (recreateError) {
            console.error(`❌ Failed to recreate profile for ${email}:`, recreateError);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${email}:`, error);
    }
  }

  console.log('\n🎉 Admin auth fixing completed!');
}

fixAdminAuth()
  .catch(e => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
