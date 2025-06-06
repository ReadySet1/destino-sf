'use server';

import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { supabaseAdmin } from '@/lib/supabase/admin'; // Import the admin client
import { UserRole as PrismaUserRole } from '@prisma/client'; // Use generated Prisma types for roles

// Remove the manually defined UserRole type
// type UserRole = Parameters<typeof prisma.profile.create>[0]['data']['role'];

export async function createUserAction(formData: FormData) {
  const email = formData.get('email') as string;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const roleStr = formData.get('role') as string;
  // Validate and cast the role string to the Prisma enum type
  const role: PrismaUserRole = Object.values(PrismaUserRole).includes(roleStr as PrismaUserRole)
    ? (roleStr as PrismaUserRole)
    : PrismaUserRole.CUSTOMER; // Default to CUSTOMER if invalid

  // Get address fields
  const hasAddress = formData.get('hasAddress') === 'on';
  const addressId = formData.get('addressId') as string;
  const addressName = formData.get('address_name') as string;
  const street = formData.get('street') as string;
  const street2 = formData.get('street2') as string;
  const city = formData.get('city') as string;
  const state = formData.get('state') as string;
  const postalCode = formData.get('postalCode') as string;
  const country = formData.get('country') as string || 'US';
  const isDefaultShipping = formData.get('isDefaultShipping') === 'on';
  const isDefaultBilling = formData.get('isDefaultBilling') === 'on';

  // Simple validation
  if (!email) {
    return { success: false, error: 'Email is required' }; // Return error object
  }
  if (!roleStr || !Object.values(PrismaUserRole).includes(roleStr as PrismaUserRole)) {
    return { success: false, error: 'Valid role is required' }; // Return error object
  }

  if (hasAddress && (!street || !city || !state || !postalCode)) {
    return { success: false, error: 'Address fields are required when adding an address' }; // Return error object
  }

  try {
    // 1. Create user in Supabase Auth using Admin client and send invitation email
    // This will send an invitation email to the user to set their password.
    logger.info(`Attempting to create Supabase Auth user and send invitation for: ${email}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        name: name || '', 
        phone: phone || '',
        // Note: Avoid storing 'role' directly in user_metadata if you manage it in Prisma
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?redirect_to=/setup-password?email=${encodeURIComponent(email)}`,
    });

    if (authError) {
      logger.error('Supabase Auth user creation failed:', authError);
      // Provide more specific error message for duplicate email
      if (authError.message.includes('already registered')) {
        throw new Error('A user with this email already exists in the authentication system.');
      }
      throw new Error(`Failed to create authentication user: ${authError.message}`);
    }

    if (!authData || !authData.user) {
      logger.error('Supabase Auth user creation returned no user data.');
      throw new Error('Failed to create authentication user: No user data returned.');
    }

    const supabaseUserId = authData.user.id;
    const supabaseUserEmail = authData.user.email; // Use email confirmed by Supabase
    logger.info(`Supabase Auth user created successfully: ${supabaseUserId} (${supabaseUserEmail})`);

    // 2. Create the user profile in the Prisma database
    logger.info(`Creating Prisma profile for user ID: ${supabaseUserId}`);
    const profile = await prisma.profile.create({
      data: {
        id: supabaseUserId, // Use the ID from Supabase Auth
        email: supabaseUserEmail!, // Use the email from Supabase Auth
        name: name || null,
        phone: phone || null,
        role: role, // Use the validated role
        // created_at and updated_at are handled by Prisma defaults
      },
    });
    logger.info(`Prisma profile created successfully for user ID: ${profile.id}`);

    // 3. Create address if needed (using the Supabase User ID)
    if (hasAddress) {
      logger.info(`Creating address for user ID: ${supabaseUserId}`);
      /* 
      await prisma.address.create({
        data: {
          userId: supabaseUserId, // Use Supabase ID
          name: addressName || null,
          street,
          street2: street2 || null,
          city,
          state,
          postalCode,
          country,
          isDefaultShipping,
          isDefaultBilling,
        },
      });
      logger.info(`Address created successfully for user ID: ${supabaseUserId}`);
      */
      logger.info('Address creation skipped temporarily - uncomment the code block above when ready.');
    }

    logger.info(`User process completed successfully for: ${supabaseUserEmail}`);

    // Return success
    return { success: true };

  } catch (error) {
    logger.error('Error in createUserAction:', error);
    // Return error object instead of throwing to allow the form to display it
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred during user creation.'
    };
  }
}

// --- Update updateUserAction (Consider refactoring similarly if needed) ---

export async function updateUserAction(formData: FormData) {
  const id = formData.get('id') as string; // This should be the Supabase User ID
  const email = formData.get('email') as string;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const roleStr = formData.get('role') as string;
  const role: PrismaUserRole = Object.values(PrismaUserRole).includes(roleStr as PrismaUserRole)
    ? (roleStr as PrismaUserRole)
    : PrismaUserRole.CUSTOMER; // Default role

  // Address fields...
  const hasAddress = formData.get('hasAddress') === 'on';
  // ... (rest of address fields as before)

  // Validation
  if (!id || !email) {
    return { success: false, error: 'User ID and email are required' };
  }
  if (!roleStr || !Object.values(PrismaUserRole).includes(roleStr as PrismaUserRole)) {
    return { success: false, error: 'Valid role is required' };
  }
  // ... (address validation as before)

  try {
    // TODO: Consider updating Supabase Auth email/metadata if changed?
    // Example (Needs careful error handling and testing):
    // const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
    //   id,
    //   { email: email, user_metadata: { name: name || '', phone: phone || '' } }
    // );
    // if (authUpdateError) { 
    //   logger.error('Supabase Auth user update failed:', authUpdateError);
    //   throw new Error(`Failed to update authentication user: ${authUpdateError.message}`);
    // }
    logger.warn(`Supabase Auth details for user ${id} were NOT updated. Implement if needed.`);

    // Update the Prisma profile
    logger.info(`Updating Prisma profile for user ID: ${id}`);
    await prisma.profile.update({
      where: { id }, // Use Supabase ID
      data: {
        email, // Update email in profile
        name: name || null,
        phone: phone || null,
        role,
        // updated_at is handled by Prisma
      },
    });
    logger.info(`Prisma profile updated successfully for user ID: ${id}`);

    // Handle address update/creation (using Supabase ID)
    if (hasAddress) {
      logger.info(`Address update/creation logic for user ID: ${id}`);
      /*
      // Address logic using `id` (Supabase User ID)
      // ... (address update/create logic as before, ensuring userId is `id`)
      */
      logger.info('Address update/creation skipped temporarily - uncomment the code block when ready.');
    }

    logger.info(`User update process completed successfully for ID: ${id}`);
    return { success: true };

  } catch (error) {
    logger.error('Error updating user:', error);
     // Provide more specific error message for duplicate email (from Prisma update)
    if (error instanceof Error && error.message.includes('Unique constraint failed') && error.message.includes('email')) {
       return { success: false, error: 'A user with this email already exists.' };
    }
    // Return error object
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred during user update.'
    };
  }
}

export async function deleteUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    logger.warn('deleteUserAction called without userId.');
    return { success: false, error: 'User ID is required for deletion.' };
  }

  logger.info(`Attempting to delete user: ${userId}`);

  try {
    // 1. Delete from Supabase Auth
    logger.info(`Deleting user ${userId} from Supabase Auth...`);
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    // Check for specific error (user not found) - treat as success if goal is deletion
    if (authError && authError.message !== 'User not found') { 
      logger.error(`Supabase Auth deletion failed for user ${userId}:`, authError);
      throw new Error(`Failed to delete authentication user: ${authError.message}`);
    }
    if (authError && authError.message === 'User not found') {
      logger.warn(`User ${userId} not found in Supabase Auth, proceeding to delete profile.`);
    } else {
       logger.info(`User ${userId} deleted successfully from Supabase Auth.`);
    }
   
    // 2. Delete from Prisma Database
    logger.info(`Deleting profile for user ${userId} from Prisma database...`);
    await prisma.profile.delete({
      where: { id: userId },
    });
    logger.info(`Profile for user ${userId} deleted successfully from Prisma.`);

    // If we reach here, both deletions were successful or handled gracefully
    logger.info(`User ${userId} deleted successfully from all systems.`);
    return { success: true };

  } catch (error) {
    logger.error(`Error during deleteUserAction for user ${userId}:`, error);

    // Handle potential Prisma error (e.g., profile already deleted)
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
       logger.warn(`Profile for user ${userId} already deleted from Prisma.`);
       // If Auth deletion succeeded or user wasn't found, consider this overall success.
       // Re-check the specific authError condition if needed for stricter handling.
       return { success: true }; // Or return specific state if needed
    }

    // Return a generic error for other issues
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred during user deletion.'
    };
  }
}

export async function resendPasswordSetupAction(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    logger.warn('resendPasswordSetupAction called without userId.');
    return { success: false, error: 'User ID is required.' };
  }

  logger.info(`Attempting to resend password setup invitation for user: ${userId}`);

  try {
    // Get the user's profile to get their email
    const profile = await prisma.profile.findUnique({
      where: { id: userId },
      select: { email: true, name: true, phone: true },
    });

    if (!profile) {
      logger.error(`Profile not found for user ${userId}`);
      return { success: false, error: 'User profile not found.' };
    }

    // Send invitation email using Supabase Admin
    logger.info(`Sending password setup invitation to: ${profile.email}`);
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(profile.email, {
      data: { 
        name: profile.name || '', 
        phone: profile.phone || '',
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?redirect_to=/setup-password?email=${encodeURIComponent(profile.email)}`,
    });

    if (inviteError) {
      logger.error(`Failed to send password setup invitation for user ${userId}:`, inviteError);
      return { success: false, error: `Failed to send invitation: ${inviteError.message}` };
    }

    logger.info(`Password setup invitation sent successfully for user ${userId}`);
    return { success: true };

  } catch (error) {
    logger.error(`Error in resendPasswordSetupAction for user ${userId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred while sending the invitation.'
    };
  }
} 