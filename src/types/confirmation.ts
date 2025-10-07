// Shared types for order confirmation pages
export type OrderType = 'store' | 'catering';

export interface BaseOrderData {
  id: string;
  status: string;
  total: number;
  customerName: string;
  createdAt?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  finalPrice?: number;
  totalPrice?: number;
  pricePerUnit?: number;
  image?: string;
  metadata?: {
    type: 'item' | 'package';
    minPeople?: number;
  };
  // Store-specific fields
  product?: {
    name: string | null;
    isPreorder?: boolean;
    preorderEndDate?: string | null;
  } | null;
  variant?: { name: string | null } | null;
}

export interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
}

export interface EventDetails {
  eventDate: string;
  specialRequests?: string;
}

export interface FulfillmentDetails {
  type?: 'pickup' | 'delivery' | 'shipment';
  pickupTime?: string;
  deliveryDetails?: {
    recipient?: {
      displayName?: string;
      address?: {
        addressLine1?: string;
        addressLine2?: string;
        locality?: string;
        administrativeDistrictLevel1?: string;
        postalCode?: string;
      };
    };
  };
  shipmentDetails?: {
    carrier?: string;
    recipient?: {
      displayName?: string;
      address?: {
        addressLine1?: string;
        addressLine2?: string;
        locality?: string;
        administrativeDistrictLevel1?: string;
        postalCode?: string;
      };
    };
  };
  trackingNumber?: string;
  shippingCarrier?: string;
}

export interface StoreOrderData extends BaseOrderData {
  pickupTime?: string;
  items: OrderItem[];
  paymentStatus?: string;
  fulfillment?: FulfillmentDetails;
}

export interface CateringOrderData extends BaseOrderData {
  eventDetails: EventDetails;
  items: OrderItem[];
  totalAmount: number;
}

export interface OrderConfirmationProps {
  orderType: OrderType;
  status: string;
  orderData: StoreOrderData | CateringOrderData | null;
  customerData?: CustomerInfo;
  paymentDetails?: {
    isSquareRedirect?: boolean;
    squareStatus?: string;
    squareOrderId?: string;
  };
}

// Type guards
export function isStoreOrder(
  orderData: StoreOrderData | CateringOrderData
): orderData is StoreOrderData {
  return 'pickupTime' in orderData;
}

export function isCateringOrder(
  orderData: StoreOrderData | CateringOrderData
): orderData is CateringOrderData {
  return 'eventDetails' in orderData;
}
