/**
 * Represents a physical address
 */
export interface Address {
  /** Name of the recipient */
  recipientName?: string;
  /** Street address line 1 */
  street: string;
  /** Street address line 2 (optional) */
  street2?: string;
  /** City */
  city: string;
  /** State */
  state: string;
  /** Postal/ZIP code */
  postalCode: string;
  /** Country (defaults to US) */
  country?: string;
} 