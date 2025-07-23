'use server';

import { signOutAction } from '@/app/actions/auth';

// Re-export the centralized signOutAction for consistency
export async function handleSignOut() {
  return signOutAction();
}
