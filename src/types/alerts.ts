import {
  Order,
  OrderItem,
  Product,
  Variant,
  EmailAlert,
  AlertType,
  AlertPriority,
  AlertStatus,
} from '@prisma/client';

// Extended Order type with relations for alert context
export type OrderWithItems = Order & {
  items: (OrderItem & {
    product: Product;
    variant: Variant | null;
  })[];
};

// Alert configuration interface
export interface AlertConfig {
  type: AlertType;
  priority: AlertPriority;
  recipients: string[];
  template: string;
}

// Alert sending result
export interface AlertResult {
  success: boolean;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}

// Alert metadata for different alert types
export interface NewOrderAlertData {
  order: OrderWithItems;
  timestamp: Date;
  totalOrdersToday: number;
}

export interface OrderStatusChangeAlertData {
  order: OrderWithItems;
  previousStatus: string;
  newStatus: string;
  timestamp: Date;
}

export interface PaymentFailedAlertData {
  order: OrderWithItems;
  error: string;
  timestamp: Date;
}

export interface SystemErrorAlertData {
  error: Error;
  context: object;
  timestamp: Date;
}

// Phase 3 & 4: Additional alert data interfaces
export interface CustomerOrderConfirmationData {
  order: OrderWithItems;
  estimatedPreparationTime?: string;
}

export interface CustomerOrderStatusData {
  order: OrderWithItems;
  previousStatus: string;
  statusMessage?: string;
  nextSteps?: string;
}

export interface CustomerPickupReadyData {
  order: OrderWithItems;
  shopAddress?: string;
  pickupInstructions?: string;
  parkingInfo?: string;
}

export interface CustomerFeedbackRequestData {
  order: OrderWithItems;
  reviewPlatforms?: {
    google?: string;
    yelp?: string;
    facebook?: string;
  };
  incentive?: {
    description: string;
    details: string;
  };
}

export interface ContactFormReceivedData {
  name: string;
  email: string;
  subject?: string;
  message: string;
  type: 'general' | 'catering' | 'support';
  timestamp: Date;
}

export interface InventoryLowStockData {
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  category?: string;
}

export interface SalesTrendAlertData {
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercentage: number;
  period: string;
  timestamp: Date;
}

export interface RevenueMilestoneData {
  milestone: number;
  currentRevenue: number;
  period: 'daily' | 'weekly' | 'monthly';
  timestamp: Date;
}

// Alert data union type
export type AlertData =
  | NewOrderAlertData
  | OrderStatusChangeAlertData
  | PaymentFailedAlertData
  | SystemErrorAlertData
  | CustomerOrderConfirmationData
  | CustomerOrderStatusData
  | CustomerPickupReadyData
  | CustomerFeedbackRequestData
  | ContactFormReceivedData
  | InventoryLowStockData
  | SalesTrendAlertData
  | RevenueMilestoneData;

// Database alert creation input
export interface CreateAlertInput {
  type: AlertType;
  priority: AlertPriority;
  recipientEmail: string;
  subject: string;
  metadata?: object;
  relatedOrderId?: string;
  relatedUserId?: string;
  customerEmail?: string;
  customerName?: string;
  scheduledFor?: Date;
  templateData?: Record<string, any>;
}

// Alert retry configuration
export interface RetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
}
