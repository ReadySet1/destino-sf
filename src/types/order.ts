import { Prisma, PaymentMethod, OrderStatus, PaymentStatus } from '@prisma/client';

// Export the PaymentMethod enum from Prisma
export { PaymentMethod, OrderStatus, PaymentStatus } from '@prisma/client';

// Create proper FulfillmentType enum for tests
export enum FulfillmentType {
  PICKUP = 'pickup',
  DELIVERY = 'local_delivery',
  LOCAL_DELIVERY = 'local_delivery',
  NATIONWIDE_SHIPPING = 'nationwide_shipping',
}

// Extend PaymentMethod to include test values
export type ExtendedPaymentMethod = PaymentMethod | 'CREDIT_CARD' | 'GIFT_CARD';

// Legacy type aliases for backward compatibility with test files
export type CreateOrderInput = OrderInput;

// Full order type with all relations
export type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
        variant: true;
      };
    };
    payments: true;
    profile: true;
  };
}>;

// Order item with product and variant relations
export type OrderItemWithRelations = Prisma.OrderItemGetPayload<{
  include: {
    product: true;
    variant: true;
  };
}>;

// Order creation data type
export type OrderCreateData = Prisma.OrderCreateInput;

// Order update data type
export type OrderUpdateData = Prisma.OrderUpdateInput;

// Order with items only
export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: true;
  };
}>;

// Fulfillment types
export type FulfillmentMethod = 'pickup' | 'local_delivery' | 'nationwide_shipping';

export interface BaseFulfillment {
  method: FulfillmentMethod;
}

export interface PickupFulfillment extends BaseFulfillment {
  method: 'pickup';
  pickupTime: string;
}

export interface LocalDeliveryFulfillment extends BaseFulfillment {
  method: 'local_delivery';
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  deliveryInstructions?: string;
}

export interface NationwideShippingFulfillment extends BaseFulfillment {
  method: 'nationwide_shipping';
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  shippingMethod: string;
  shippingCarrier: string;
  shippingCost: number;
  rateId: string;
}

export type FulfillmentOptions =
  | PickupFulfillment
  | LocalDeliveryFulfillment
  | NationwideShippingFulfillment;

// Customer info type
export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  pickupTime?: string;
}

// Order input for creating orders - support both old and new formats
export interface OrderInput {
  // New format
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    variantId?: string;
  }>;
  customerInfo?: CustomerInfo;
  fulfillment?: FulfillmentOptions;
  paymentMethod?: PaymentMethod | ExtendedPaymentMethod;

  // Legacy format for tests
  cartItems?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    category?: string;
  }>;
  customer?: {
    name: string;
    email: string;
    phone: string;
  };
  fulfillmentType?: string | FulfillmentType;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    recipientName?: string;
    apartmentNumber?: string;
  };
  specialInstructions?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    recipientName?: string;
    apartmentNumber?: string;
  };
}

// Order creation result
export interface OrderCreationResult {
  success: boolean;
  orderId?: string;
  order?: any;
  error?: string;
}
