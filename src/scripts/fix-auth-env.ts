import { config } from 'dotenv';

// Load environment variables
config();

interface EnvCheck {
  name: string;
  value?: string;
  required: boolean;
  description: string;
}

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables for authentication...\n');

  const envChecks: EnvCheck[] = [
    {
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL,
      required: true,
      description: 'Your Supabase project URL',
    },
    {
      name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      required: true,
      description: 'Your Supabase anonymous key',
    },
    {
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      value: process.env.SUPABASE_SERVICE_ROLE_KEY,
      required: false,
      description: 'Your Supabase service role key (for admin operations)',
    },
    {
      name: 'DATABASE_URL',
      value: process.env.DATABASE_URL,
      required: true,
      description: 'Your database connection string',
    },
  ];

  let missingRequired = 0;

  envChecks.forEach(check => {
    const status = check.value ? '✅' : check.required ? '❌' : '⚠️';
    const valueDisplay = check.value
      ? check.value.length > 20
        ? `${check.value.substring(0, 20)}...`
        : check.value
      : 'NOT_SET';

    console.log(`${status} ${check.name}`);
    console.log(`   Value: ${valueDisplay}`);
    console.log(`   Description: ${check.description}`);
    console.log('');

    if (check.required && !check.value) {
      missingRequired++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Missing required variables: ${missingRequired}`);

  if (missingRequired > 0) {
    console.log('\n❗ Action needed:');
    console.log('   1. Create a .env.local file in your project root');
    console.log('   2. Add the missing environment variables');
    console.log('   3. Get the values from your Supabase project dashboard');
    console.log('   4. Example .env.local structure:');
    console.log('');
    console.log('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    console.log(
      '   DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres'
    );
    console.log('');
  } else {
    console.log('\n✅ All required environment variables are set!');

    // Additional check for Supabase connection
    console.log('\n🔗 Testing Supabase connection...');
    testSupabaseConnection();
  }
}

async function testSupabaseConnection() {
  try {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Cannot test connection - missing URL or key');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test a simple query
    const { data, error } = await supabase.from('Category').select('count').limit(1);

    if (error) {
      console.log('❌ Supabase connection failed:');
      console.log(`   Error: ${error.message}`);

      // Check if it's a "Project no longer exists" error
      if (error.message.includes('Project no') || error.message.includes('project not found')) {
        console.log('\n💡 This looks like a project status issue:');
        console.log('   - Your Supabase project might be paused');
        console.log('   - Check your Supabase dashboard');
        console.log('   - Restart your project if needed');
      }
    } else {
      console.log('✅ Supabase connection successful!');
    }
  } catch (error) {
    console.log('❌ Error testing Supabase connection:');
    console.log(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Run the check
checkEnvironmentVariables();
