/**
 * Email utility functions for formatting order data
 */

export interface ShippingAddress {
  recipientName?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

/**
 * Formats a shipping address for display in emails
 */
export function formatShippingAddress(address: ShippingAddress): string {
  const lines: string[] = [];

  if (address.recipientName) {
    lines.push(address.recipientName);
  }

  lines.push(address.street);

  if (address.street2) {
    lines.push(address.street2);
  }

  lines.push(`${address.city}, ${address.state} ${address.postalCode}`);

  if (address.country && address.country !== 'US') {
    lines.push(address.country);
  }

  return lines.join('\n');
}

/**
 * Extracts and formats shipping address from order notes
 */
export function extractShippingAddressFromNotes(notes: string | null): ShippingAddress | null {
  if (!notes) return null;

  try {
    const parsed = JSON.parse(notes);
    if (parsed.shippingAddress) {
      return parsed.shippingAddress as ShippingAddress;
    }
    return null;
  } catch (error) {
    console.warn('Failed to parse shipping address from notes:', error);
    return null;
  }
}

/**
 * Formats order notes for display, handling shipping addresses specially
 */
export function formatOrderNotes(notes: string | null): {
  hasShippingAddress: boolean;
  shippingAddress?: string;
  otherNotes?: string;
} {
  if (!notes) {
    return { hasShippingAddress: false };
  }

  try {
    const parsed = JSON.parse(notes);

    // Check if this contains a shipping address
    if (parsed.shippingAddress) {
      const formattedAddress = formatShippingAddress(parsed.shippingAddress);
      return {
        hasShippingAddress: true,
        shippingAddress: formattedAddress,
        otherNotes: parsed.deliveryInstructions || parsed.specialRequests || undefined,
      };
    }

    // Check for delivery address (local delivery)
    if (parsed.deliveryAddress) {
      const formattedAddress = formatShippingAddress(parsed.deliveryAddress);
      return {
        hasShippingAddress: true,
        shippingAddress: formattedAddress,
        otherNotes: parsed.deliveryInstructions || undefined,
      };
    }

    // If it's just a string, return as other notes
    return {
      hasShippingAddress: false,
      otherNotes: notes,
    };
  } catch (error) {
    // If it's not JSON, treat as plain text notes
    return {
      hasShippingAddress: false,
      otherNotes: notes,
    };
  }
}
