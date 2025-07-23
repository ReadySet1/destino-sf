// Mock environment variables
const mockEnv = {
  ADMIN_EMAIL: 'ealanis@readysetllc.com',
  JAMES_EMAIL: 'james@destinosf.com',
};

// Mock the env module
jest.mock('@/env', () => ({
  env: mockEnv,
}));

// Import the helper function from the email routing utility
import { getRecipientEmail } from '../lib/email-routing';

describe('Email Routing Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Alerts', () => {
    it('should route system errors to admin email', () => {
      const recipient = getRecipientEmail('SYSTEM_ERROR' as any);
      expect(recipient).toBe('ealanis@readysetllc.com');
    });

    it('should route payment failures to admin email', () => {
      const recipient = getRecipientEmail('PAYMENT_FAILED' as any);
      expect(recipient).toBe('ealanis@readysetllc.com');
    });

    it('should route payment gateway alerts to admin email', () => {
      const recipient = getRecipientEmail('PAYMENT_GATEWAY_ALERT' as any);
      expect(recipient).toBe('ealanis@readysetllc.com');
    });

    it('should route website performance alerts to admin email', () => {
      const recipient = getRecipientEmail('WEBSITE_PERFORMANCE_ALERT' as any);
      expect(recipient).toBe('ealanis@readysetllc.com');
    });
  });

  describe('Order & General Store Emails', () => {
    it('should route new orders to James email', () => {
      const recipient = getRecipientEmail('NEW_ORDER' as any);
      expect(recipient).toBe('james@destinosf.com');
    });

    it('should route order status changes to James email', () => {
      const recipient = getRecipientEmail('ORDER_STATUS_CHANGE' as any);
      expect(recipient).toBe('james@destinosf.com');
    });

    it('should route daily summaries to James email', () => {
      const recipient = getRecipientEmail('DAILY_SUMMARY' as any);
      expect(recipient).toBe('james@destinosf.com');
    });

    it('should route contact form submissions to James email', () => {
      const recipient = getRecipientEmail('CONTACT_FORM_RECEIVED' as any);
      expect(recipient).toBe('james@destinosf.com');
    });

    it('should route catering inquiries to James email', () => {
      const recipient = getRecipientEmail('CATERING_INQUIRY_RECEIVED' as any);
      expect(recipient).toBe('james@destinosf.com');
    });

    it('should route inventory alerts to James email', () => {
      const recipient = getRecipientEmail('INVENTORY_LOW_STOCK' as any);
      expect(recipient).toBe('james@destinosf.com');
    });

    it('should route sales trend alerts to James email', () => {
      const recipient = getRecipientEmail('SALES_TREND_ALERT' as any);
      expect(recipient).toBe('james@destinosf.com');
    });

    it('should route revenue milestones to James email', () => {
      const recipient = getRecipientEmail('REVENUE_MILESTONE' as any);
      expect(recipient).toBe('james@destinosf.com');
    });

    it('should route order volume alerts to James email', () => {
      const recipient = getRecipientEmail('ORDER_VOLUME_ALERT' as any);
      expect(recipient).toBe('james@destinosf.com');
    });
  });

  describe('Fallback Behavior', () => {
    it('should default to admin email for unknown alert types', () => {
      const recipient = getRecipientEmail('CUSTOMER_ORDER_CONFIRMATION' as any);
      expect(recipient).toBe('ealanis@readysetllc.com');
    });
  });
}); 