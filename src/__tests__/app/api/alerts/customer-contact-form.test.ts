/**
 * Customer Alerts API Route Tests - Contact Form Handler
 *
 * These tests verify the contact form handling in the customer alerts API,
 * with focus on email subject sanitization to prevent Resend API errors.
 *
 * Related fix: fix/db-connection-and-email-validation branch
 * Issue: Resend API error: "The `\n` is not allowed in the `subject` field"
 */

import { NextRequest } from 'next/server';

// Create the mock function at the module level before any imports
const mockSendContactFormReceived = jest.fn();

// Mock the alert service - must be before importing the route
jest.mock('@/lib/alerts', () => ({
  alertService: {
    sendContactFormReceived: (...args: unknown[]) => mockSendContactFormReceived(...args),
  },
}));

// Mock Prisma
jest.mock('@/lib/db-unified', () => ({
  prisma: {
    order: {
      findUnique: jest.fn(),
    },
    emailAlert: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
  withRetry: jest.fn((fn) => fn()),
}));

// Mock rate limiter
jest.mock('@/lib/security/rate-limiter', () => ({
  contactFormRateLimiter: {
    check: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  },
}));

// Import the route handler AFTER all mocks are set up
const { POST } = require('@/app/api/alerts/customer/route');

describe('Customer Alerts API - Contact Form', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendContactFormReceived.mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });
  });

  /**
   * Helper to create a mock NextRequest
   */
  const createRequest = (body: Record<string, unknown>): NextRequest => {
    return new NextRequest('http://localhost:3000/api/alerts/customer', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
    });
  };

  describe('Contact Form Validation', () => {
    it('should require name field', async () => {
      const request = createRequest({
        type: 'contact_form',
        email: 'test@example.com',
        message: 'Test message',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('name');
    });

    it('should require email field', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        message: 'Test message',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('email');
    });

    it('should require message field', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'test@example.com',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('message');
    });

    it('should reject messages exceeding max length', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'test@example.com',
        message: 'A'.repeat(6000), // Exceeds 5000 char limit
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('5000');
    });
  });

  describe('Subject Sanitization', () => {
    it('should sanitize name with newlines when building fallback subject', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John\nDoe',
        email: 'test@example.com',
        message: 'Test message',
        contactType: 'general',
      });

      await POST(request);

      // Verify the sanitized data was passed to the alert service
      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe', // Newline removed
          subject: 'general inquiry from John Doe', // Subject built with sanitized name
        })
      );
    });

    it('should sanitize explicit subject with newlines', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'test@example.com',
        message: 'Test message',
        subject: 'Question\nabout\nservices',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Question about services', // Newlines replaced with spaces
        })
      );
    });

    it('should sanitize name with CRLF sequences', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John\r\nDoe',
        email: 'test@example.com',
        message: 'Test message',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
        })
      );
    });

    it('should sanitize name with carriage returns', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John\rDoe',
        email: 'test@example.com',
        message: 'Test message',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
        })
      );
    });

    it('should handle subject with only newlines by using fallback', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'test@example.com',
        message: 'Test message',
        subject: '\n\n\n', // Only newlines
        contactType: 'support',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'support inquiry from John Doe', // Falls back to generated subject
        })
      );
    });

    it('should trim whitespace from sanitized values', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: '  John Doe  ',
        email: 'test@example.com',
        message: 'Test message',
        subject: '  Question  ',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          subject: 'Question',
        })
      );
    });
  });

  describe('Contact Type Handling', () => {
    it('should use provided contactType in fallback subject', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'test@example.com',
        message: 'Test message',
        contactType: 'catering',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'catering inquiry from John Doe',
          type: 'catering',
        })
      );
    });

    it('should default to "general" when contactType not provided', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'test@example.com',
        message: 'Test message',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'general inquiry from John Doe',
          type: 'general',
        })
      );
    });
  });

  describe('Honeypot Protection', () => {
    it('should silently reject submissions with honeypot field filled', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'Bot Name',
        email: 'bot@example.com',
        message: 'Spam message',
        website: 'http://spam-site.com', // Honeypot field
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Returns success to not alert bots
      expect(data.success).toBe(true);
      expect(data.messageId).toBe('filtered');

      // Alert service should NOT be called
      expect(mockSendContactFormReceived).not.toHaveBeenCalled();
    });
  });

  describe('Successful Submission', () => {
    it('should return success for valid contact form submission', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'I would like to learn more about your catering services.',
        contactType: 'catering',
        subject: 'Catering Inquiry',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageId).toBe('test-message-id');
    });

    it('should include timestamp in contact data', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(Date),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle alert service failure gracefully', async () => {
      mockSendContactFormReceived.mockResolvedValue({
        success: false,
        error: 'Email delivery failed',
      });

      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Email delivery failed');
    });

    it('should return 400 for invalid alert type', async () => {
      const request = createRequest({
        type: 'invalid_type',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid alert type');
    });
  });

  describe('Real-world Production Scenarios', () => {
    it('should handle the Roy Lau case - production error scenario', async () => {
      // This test simulates the actual production error case
      const request = createRequest({
        type: 'contact_form',
        name: 'Roy Lau',
        email: 'roy@example.com',
        message: 'Hi,\n\nI am local and would like to learn more.',
        contactType: 'general',
        // No explicit subject - will use fallback
      });

      await POST(request);

      // Verify the subject doesn't contain newlines
      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Roy Lau',
          subject: 'general inquiry from Roy Lau',
        })
      );

      const callArgs = mockSendContactFormReceived.mock.calls[0][0];
      expect(callArgs.subject).not.toContain('\n');
      expect(callArgs.subject).not.toContain('\r');
    });

    it('should handle pasted multi-line name from clipboard', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Smith\nCEO, Acme Corp\n123 Business Ave',
        email: 'john@acme.com',
        message: 'Interested in corporate catering.',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Smith CEO, Acme Corp 123 Business Ave',
        })
      );

      const callArgs = mockSendContactFormReceived.mock.calls[0][0];
      expect(callArgs.name).not.toContain('\n');
    });

    it('should handle international names with newlines', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'José\nGarcía\nRodríguez',
        email: 'jose@example.com',
        message: 'Hola, me gustaría saber más.',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'José García Rodríguez',
        })
      );
    });
  });
});

describe('Customer Alerts API - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendContactFormReceived.mockResolvedValue({
      success: true,
      messageId: 'test-message-id',
    });
  });

  const createRequest = (body: Record<string, unknown>): NextRequest => {
    return new NextRequest('http://localhost:3000/api/alerts/customer', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '127.0.0.1',
      },
    });
  };

  describe('Unicode and Special Characters', () => {
    it('should preserve emojis in names', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John 🎉 Doe',
        email: 'john@example.com',
        message: 'Test message',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John 🎉 Doe',
        })
      );
    });

    it('should preserve special characters in subjects', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
        subject: 'Question about "special" & <things>',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Question about "special" & <things>',
        })
      );
    });
  });

  describe('Empty and Whitespace Values', () => {
    it('should handle name with only spaces and newlines', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: '   \n   \n   ',
        email: 'john@example.com',
        message: 'Test message',
      });

      await POST(request);

      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '', // Trimmed to empty
        })
      );
    });

    it('should use empty subject when sanitized subject becomes empty', async () => {
      const request = createRequest({
        type: 'contact_form',
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Test message',
        subject: '   \r\n   ', // Only whitespace and newlines
        contactType: 'support',
      });

      await POST(request);

      // Should fall back to generated subject when sanitized subject is empty
      expect(mockSendContactFormReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'support inquiry from John Doe',
        })
      );
    });
  });
});
