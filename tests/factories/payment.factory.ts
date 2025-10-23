/**
 * Payment Test Data Factory
 * Generates realistic payment data for testing
 */

import { faker } from '@faker-js/faker';
import { Prisma, PaymentStatus } from '@prisma/client';

export interface PaymentFactoryOptions {
  orderId?: string;
  squarePaymentId?: string;
  amount?: number;
  status?: PaymentStatus;
  receiptUrl?: string | null;
}

/**
 * Generate payment data (does not create in database)
 */
export function buildPayment(options: PaymentFactoryOptions = {}): Prisma.PaymentUncheckedCreateInput {
  return {
    orderId: options.orderId || faker.string.uuid(),
    squarePaymentId: options.squarePaymentId || `sqpmt_${faker.string.alphanumeric(22)}`,
    amount: options.amount || faker.number.int({ min: 2000, max: 10000 }), // $20-$100
    status: options.status || PaymentStatus.PAID,
    receiptUrl: options.receiptUrl === undefined ? faker.internet.url() : options.receiptUrl,
  };
}

/**
 * Generate multiple payments
 */
export function buildPayments(count: number, options: PaymentFactoryOptions = {}): Prisma.PaymentUncheckedCreateInput[] {
  return Array.from({ length: count }, () => buildPayment(options));
}

/**
 * Generate successful payment
 */
export function buildSuccessfulPayment(options: Omit<PaymentFactoryOptions, 'status'> = {}): Prisma.PaymentUncheckedCreateInput {
  return buildPayment({
    ...options,
    status: PaymentStatus.PAID,
  });
}

/**
 * Generate pending payment
 */
export function buildPendingPayment(options: Omit<PaymentFactoryOptions, 'status'> = {}): Prisma.PaymentUncheckedCreateInput {
  return buildPayment({
    ...options,
    status: PaymentStatus.PENDING,
  });
}

/**
 * Generate failed payment
 */
export function buildFailedPayment(options: Omit<PaymentFactoryOptions, 'status'> = {}): Prisma.PaymentUncheckedCreateInput {
  return buildPayment({
    ...options,
    status: PaymentStatus.FAILED,
  });
}

/**
 * Generate test payment with predictable data
 */
export function buildTestPayment(suffix: string = ''): Prisma.PaymentUncheckedCreateInput {
  return {
    orderId: 'test-order-id',
    squarePaymentId: `test-payment-id${suffix}`,
    amount: 5000, // $50.00
    status: PaymentStatus.PAID,
    receiptUrl: 'https://example.com/receipt',
  };
}

export interface PaymentInfoFactoryOptions {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  cardholderName?: string;
}

/**
 * Generate payment card info for testing (Square sandbox card)
 */
export function buildPaymentInfo(options: PaymentInfoFactoryOptions = {}): {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
} {
  return {
    number: options.cardNumber || '4111 1111 1111 1111', // Square sandbox test card
    expiry: options.expiry || `${faker.number.int({ min: 1, max: 12 }).toString().padStart(2, '0')}/${faker.number.int({ min: 25, max: 30 })}`,
    cvv: options.cvv || faker.finance.creditCardCVV(),
    name: options.cardholderName || faker.person.fullName(),
  };
}

/**
 * Generate Square sandbox test card
 */
export function buildSquareTestCard(): {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
} {
  return {
    number: '4111 1111 1111 1111',
    expiry: '12/25',
    cvv: '123',
    name: 'Test Customer',
  };
}

/**
 * Generate different card brands for testing
 */
export function buildCardByBrand(brand: 'visa' | 'mastercard' | 'amex' | 'discover'): {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
} {
  const cards = {
    visa: '4111 1111 1111 1111',
    mastercard: '5555 5555 5555 4444',
    amex: '3782 822463 10005',
    discover: '6011 1111 1111 1117',
  };

  return {
    number: cards[brand],
    expiry: '12/25',
    cvv: brand === 'amex' ? '1234' : '123',
    name: faker.person.fullName(),
  };
}
