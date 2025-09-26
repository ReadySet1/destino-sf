export interface Address {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  address?: any;
  errors?: string[];
}

export async function validateShippingAddress(address: Address): Promise<AddressValidationResult> {
  try {
    // This would integrate with Shippo address validation
    const shippo = await import('shippo');
    const result = await shippo.default.address.validate(address);
    
    return {
      isValid: result.validation_results?.is_valid || false,
      address: result,
      errors: result.validation_results?.messages?.map((msg: any) => msg.text) || []
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Address validation failed']
    };
  }
}
