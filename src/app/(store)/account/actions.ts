'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

// Define and export the Server Action
export async function handleSignOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/sign-in');
} 