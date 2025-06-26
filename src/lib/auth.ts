import { createClient } from '@/utils/supabase/server';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (error || profile?.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
  
  return { user, profile };
}

export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
      
    return !error && profile?.role === 'ADMIN';
  } catch {
    return false;
  }
} 