import { Prisma, PaymentMethod, OrderStatus, PaymentStatus } from '@prisma/client';

// Export the PaymentMethod enum from Prisma
export { PaymentMethod, OrderStatus, PaymentStatus } from '@prisma/client';

// Legacy type aliases for backward compatibility with test files
export type CreateOrderInput = OrderInput;
export type FulfillmentType = FulfillmentOptions;

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

export type FulfillmentOptions = PickupFulfillment | LocalDeliveryFulfillment | NationwideShippingFulfillment;

// Customer info type
export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  pickupTime?: string;
}

// Order input for creating orders
export interface OrderInput {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    variantId?: string;
  }>;
  customerInfo: CustomerInfo;
  fulfillment: FulfillmentOptions;
  paymentMethod: PaymentMethod;
}

// Order creation result
export interface OrderCreationResult {
  success: boolean;
  orderId?: string;
  error?: string;
} 