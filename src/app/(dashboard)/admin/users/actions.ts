'use server';

import { prisma } from '@/lib/prisma';
import { UserRole } from '@prisma/client';
import { logger } from '@/utils/logger';

export async function createUserAction(formData: FormData) {
  const id = formData.get('id') as string;
  const email = formData.get('email') as string;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const roleStr = formData.get('role') as string;
  const role = roleStr as UserRole;

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
    throw new Error('Email is required');
  }

  if (hasAddress && (!street || !city || !state || !postalCode)) {
    throw new Error('Address fields are required when adding an address');
  }

  try {
    // Create the user in the database
    const user = await prisma.profile.create({
      data: {
        id,
        email,
        name: name || null,
        phone: phone || null,
        role,
      },
    });

    // Log available models to help debug
    logger.info('Available Prisma models:', Object.keys(prisma));
    
    // Create address if needed - temporarily commented out until we fix the model name
    if (hasAddress) {
      logger.info('Address creation skipped temporarily - will be implemented once model issue is fixed');
      /* 
      await prisma.address.create({
        data: {
          userId: user.id,
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
      */
    }

    logger.info(`User "${email}" created successfully`);

    // Return success instead of redirecting
    return { success: true };
  } catch (error) {
    logger.error('Error creating user:', error);
    
    // Provide more specific error message for duplicate email
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      throw new Error('A user with this email already exists.');
    }
    
    throw new Error('Failed to create user. Please try again.');
  }
}

export async function updateUserAction(formData: FormData) {
  const id = formData.get('id') as string;
  const email = formData.get('email') as string;
  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const roleStr = formData.get('role') as string;
  const role = roleStr as UserRole;

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
  if (!id || !email) {
    throw new Error('User ID and email are required');
  }

  if (hasAddress && (!street || !city || !state || !postalCode)) {
    throw new Error('Address fields are required when adding an address');
  }

  try {
    // Update the user in the database
    await prisma.profile.update({
      where: { id },
      data: {
        email,
        name: name || null,
        phone: phone || null,
        role,
      },
    });

    // Log available models to help debug
    logger.info('Available Prisma models:', Object.keys(prisma));
    
    // Handle address update or creation - temporarily commented out until we fix the model name
    if (hasAddress) {
      logger.info('Address update/creation skipped temporarily - will be implemented once model issue is fixed');
      /*
      if (addressId) {
        // Update existing address
        await prisma.address.update({
          where: { id: addressId },
          data: {
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
      } else {
        // Create new address
        await prisma.address.create({
          data: {
            userId: id,
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
      }
      */
    }

    logger.info(`User "${email}" updated successfully`);

    // Return success instead of redirecting
    return { success: true };
  } catch (error) {
    logger.error('Error updating user:', error);
    
    // Provide more specific error message for duplicate email
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      throw new Error('A user with this email already exists.');
    }
    
    throw new Error('Failed to update user. Please try again.');
  }
} 