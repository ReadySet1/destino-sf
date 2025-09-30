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
    const { ShippoClientManager } = await import('@/lib/shippo/client');
    const shippoClient = ShippoClientManager.getInstance();
    
    if (!shippoClient) {
      return {
        isValid: false,
        errors: ['Shippo client not available']
      };
    }
    
    // Note: This is a placeholder for address validation
    // The actual Shippo SDK v2.15+ API structure may be different
    // This would need to be updated based on the actual Shippo v2.15+ documentation
    const result = await shippoClient.addresses?.validate?.(address);
    
    return {
      isValid: result?.validation_results?.is_valid || false,
      address: result,
      errors: result?.validation_results?.messages?.map((msg: any) => msg.text) || []
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Address validation failed']
    };
  }
}
