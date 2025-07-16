/**
 * Square API Formatting Utilities
 * 
 * This module provides utility functions for formatting data to be compatible 
 * with Square's API requirements, particularly for sandbox testing.
 */

/**
 * Formats phone numbers for Square API compatibility (E.164 format)
 * Square API requires phone numbers in E.164 format: +[country code][number]
 * Maximum 15 digits total, no spaces or special characters except +
 * 
 * For Sandbox environment, Square requires specific test phone numbers:
 * Format: +1<valid-area-code>555<any-four-digits>
 * Example: +14255551111
 */
export function formatPhoneForSquare(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Phone number is required and must be a string');
  }

  // Check if we're in Sandbox environment
  const isSquareSandbox = process.env.USE_SQUARE_SANDBOX === 'true';
  
  if (isSquareSandbox) {
    // For Sandbox, use Square's required test phone number format
    // Extract area code from the phone number if possible, otherwise use a default
    const cleanPhone = phone.replace(/\D/g, '');
    let areaCode = '425'; // Default valid area code
    
    // Try to extract area code from 10 or 11 digit numbers
    if (cleanPhone.length === 10) {
      areaCode = cleanPhone.substring(0, 3);
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('1')) {
      areaCode = cleanPhone.substring(1, 4);
    }
    
    // Validate area code is reasonable (not starting with 0 or 1)
    if (areaCode.startsWith('0') || areaCode.startsWith('1')) {
      areaCode = '425'; // Use default valid area code
    }
    
    // Use last 4 digits if available, otherwise generate random
    let lastFour = '1111'; // Default
    if (cleanPhone.length >= 4) {
      const digits = cleanPhone.slice(-4);
      lastFour = digits.padStart(4, '1');
    }
    
    // Format for Square Sandbox: +1<area-code>555<four-digits>
    const formattedPhone = `+1${areaCode}555${lastFour}`;
    console.log(`Sandbox: Phone formatted from ${phone} to ${formattedPhone}`);
    return formattedPhone;
  }

  // Production environment - use standard E.164 formatting
  // Remove all non-digit characters except + at the beginning
  let cleanPhone = phone.trim();
  
  // If it already starts with +, validate and clean it
  if (cleanPhone.startsWith('+')) {
    const digitsOnly = cleanPhone.substring(1).replace(/\D/g, '');
    
    // Validate E.164 format: must be 7-15 digits after the +
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      throw new Error(`Invalid phone number length: ${digitsOnly.length} digits. E.164 format requires 7-15 digits after country code.`);
    }
    
    // Must not start with 0 (no country codes start with 0)
    if (digitsOnly.startsWith('0')) {
      throw new Error('Invalid phone number: country codes cannot start with 0');
    }
    
    const formattedPhone = `+${digitsOnly}`;
    console.log(`Phone formatted from ${phone} to ${formattedPhone}`);
    return formattedPhone;
  }
  
  // Remove all non-digit characters
  const digitsOnly = cleanPhone.replace(/\D/g, '');
  
  // Handle different US number formats
  if (digitsOnly.length === 10) {
    // 10-digit US number, add +1 prefix
    const formattedPhone = `+1${digitsOnly}`;
    console.log(`US phone formatted from ${phone} to ${formattedPhone}`);
    return formattedPhone;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    // 11-digit number starting with 1 (US), add + prefix
    const formattedPhone = `+${digitsOnly}`;
    console.log(`US phone formatted from ${phone} to ${formattedPhone}`);
    return formattedPhone;
  } else if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    // International number without + prefix
    // Assume it's already properly formatted without country code prefix
    // For safety, we'll need the caller to provide proper format
    throw new Error(`Phone number format unclear: ${digitsOnly.length} digits. Please provide phone number with country code (e.g., +1 for US numbers).`);
  } else {
    // Invalid length
    throw new Error(`Invalid phone number: ${digitsOnly.length} digits. Phone numbers must be 7-15 digits in E.164 format.`);
  }
}

/**
 * Formats phone numbers specifically for Square CreatePaymentLink API
 * This API seems to have stricter validation than other Square APIs
 * Falls back to null if formatting fails, allowing optional phone numbers
 */
export function formatPhoneForSquarePaymentLink(phone: string): string | null {
  try {
    // First try the standard formatting
    const formattedPhone = formatPhoneForSquare(phone);
    
    // Additional validation for payment links - ensure it's between 10-15 digits
    const digitsOnly = formattedPhone.substring(1); // Remove the +
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      console.warn(`Phone number ${formattedPhone} may not be valid for Square payment links (${digitsOnly.length} digits)`);
      return null;
    }
    
    // Additional Square Payment Link specific validation
    // Square CreatePaymentLink API is very strict about phone format
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      // US number with country code - this is the format Square expects
      // But let's validate the area code is not invalid
      const areaCode = digitsOnly.substring(1, 4);
      
      // Check for invalid area codes that Square might reject
      const invalidAreaCodes = [
        '000', '001', '002', '003', '004', '005', '006', '007', '008', '009',
        '911', '555', '800', '888', '877', '866', '855', '844', '833', '822'
      ];
      
      if (invalidAreaCodes.includes(areaCode)) {
        console.warn(`Phone number ${formattedPhone} has potentially invalid area code ${areaCode} for Square payment links`);
        return null;
      }
    } else if (digitsOnly.length === 10) {
      // US number without country code - need to add +1
      const areaCode = digitsOnly.substring(0, 3);
      
      // Check for invalid area codes
      const invalidAreaCodes = [
        '000', '001', '002', '003', '004', '005', '006', '007', '008', '009',
        '911', '555', '800', '888', '877', '866', '855', '844', '833', '822'
      ];
      
      if (invalidAreaCodes.includes(areaCode)) {
        console.warn(`Phone number ${formattedPhone} has potentially invalid area code ${areaCode} for Square payment links`);
        return null;
      }
    }
    
    return formattedPhone;
  } catch (error) {
    console.warn('Failed to format phone number for Square payment link:', error);
    return null;
  }
}

/**
 * Formats email addresses for Square API compatibility
 * Square's sandbox environment requires specific test email formats
 * For sandbox, we need to use test email addresses that Square accepts
 * For production, we use the email as provided
 */
export function formatEmailForSquare(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email address is required and must be a string');
  }

  // Check if we're in Sandbox environment
  const isSquareSandbox = process.env.USE_SQUARE_SANDBOX === 'true';
  
  if (isSquareSandbox) {
    // For Sandbox, Square has specific requirements for email addresses
    // Based on Square documentation and common patterns, we should use sandbox-friendly emails
    // Convert any email to a valid Square sandbox test email format
    
    // Extract the local part (before @) to create a unique identifier
    const localPart = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    
    // Use Square's common test email domain pattern
    // Common Square test emails follow the pattern: test+<identifier>@squareup.com
    const formattedEmail = `test+${localPart}@squareup.com`;
    
    console.log(`Sandbox: Email formatted from ${email} to ${formattedEmail}`);
    return formattedEmail;
  }

  // Production environment - validate email format but use as provided
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`Invalid email address format: ${email}`);
  }
  
  console.log(`Production: Using email as provided: ${email}`);
  return email;
}

/**
 * Validates and formats customer data for Square API requests
 * This is a convenience function that formats both phone and email
 */
export function formatCustomerDataForSquare(customerData: {
  email: string;
  phone: string;
  name: string;
}): {
  buyer_email: string;
  buyer_phone_number: string;
} {
  return {
    buyer_email: formatEmailForSquare(customerData.email),
    buyer_phone_number: formatPhoneForSquare(customerData.phone),
  };
}

/**
 * Validates and formats customer data specifically for Square Payment Links
 * This handles the stricter validation requirements of the CreatePaymentLink API
 */
export function formatCustomerDataForSquarePaymentLink(customerData: {
  email: string;
  phone: string;
  name: string;
}): {
  buyer_email: string;
  buyer_phone_number?: string;
} {
  const result: { buyer_email: string; buyer_phone_number?: string } = {
    buyer_email: formatEmailForSquare(customerData.email),
  };
  
  // Try to format phone number, but make it optional if it fails
  const formattedPhone = formatPhoneForSquarePaymentLink(customerData.phone);
  if (formattedPhone) {
    result.buyer_phone_number = formattedPhone;
  }
  
  return result;
} 