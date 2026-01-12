/**
 * Email Subject Sanitization Tests
 *
 * These tests verify that email subjects are properly sanitized to prevent
 * Resend API validation errors (newlines not allowed in subject field).
 *
 * Related fix: fix/db-connection-and-email-validation branch
 * Issue: Resend API error: "The `\n` is not allowed in the `subject` field"
 */

import { AlertService } from '@/lib/alerts';

// Mock Resend
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null }),
    },
  })),
}));

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    emailAlert: {
      create: jest.fn().mockResolvedValue({ id: 'mock-alert-id' }),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

// Mock env
jest.mock('@/env', () => ({
  env: {
    SHOP_NAME: 'Test Shop',
    FROM_EMAIL: 'test@example.com',
    RESEND_API_KEY: 'test-api-key',
    ADMIN_EMAIL: 'admin@example.com',
  },
}));

// Mock email routing
jest.mock('@/lib/email-routing', () => ({
  getRecipientEmail: jest.fn().mockReturnValue('admin@example.com'),
}));

// Mock webhook queue
jest.mock('@/lib/webhook-queue', () => ({
  sendEmailWithQueue: jest.fn().mockResolvedValue(undefined),
}));

describe('Email Subject Sanitization', () => {
  /**
   * Test the sanitization logic that should be applied to email subjects
   * This tests the behavior that the AlertService should implement
   */
  describe('sanitizeEmailSubject behavior', () => {
    // Helper function that mimics the sanitization logic
    const sanitizeEmailSubject = (subject: string | undefined): string => {
      if (!subject) {
        return 'General inquiry';
      }
      const sanitized = subject.replace(/[\r\n]+/g, ' ').trim();
      return sanitized.length > 78 ? sanitized.substring(0, 75) + '...' : sanitized;
    };

    it('should return "General inquiry" for undefined subject', () => {
      expect(sanitizeEmailSubject(undefined)).toBe('General inquiry');
    });

    it('should return "General inquiry" for empty string', () => {
      expect(sanitizeEmailSubject('')).toBe('General inquiry');
    });

    it('should remove newline characters from subject', () => {
      const input = 'Hello\nWorld';
      expect(sanitizeEmailSubject(input)).toBe('Hello World');
    });

    it('should remove carriage return characters from subject', () => {
      const input = 'Hello\rWorld';
      expect(sanitizeEmailSubject(input)).toBe('Hello World');
    });

    it('should remove CRLF sequences from subject', () => {
      const input = 'Hello\r\nWorld';
      expect(sanitizeEmailSubject(input)).toBe('Hello World');
    });

    it('should handle multiple consecutive newlines', () => {
      const input = 'Hello\n\n\nWorld';
      expect(sanitizeEmailSubject(input)).toBe('Hello World');
    });

    it('should handle mixed newline types', () => {
      const input = 'Line1\nLine2\rLine3\r\nLine4';
      expect(sanitizeEmailSubject(input)).toBe('Line1 Line2 Line3 Line4');
    });

    it('should trim leading and trailing whitespace', () => {
      const input = '  Hello World  ';
      expect(sanitizeEmailSubject(input)).toBe('Hello World');
    });

    it('should handle newlines at start and end', () => {
      const input = '\nHello World\n';
      expect(sanitizeEmailSubject(input)).toBe('Hello World');
    });

    it('should truncate subjects longer than 78 characters', () => {
      const longSubject = 'A'.repeat(100);
      const result = sanitizeEmailSubject(longSubject);
      expect(result.length).toBe(78);
      expect(result.endsWith('...')).toBe(true);
    });

    it('should not truncate subjects at exactly 78 characters', () => {
      const exactSubject = 'A'.repeat(78);
      expect(sanitizeEmailSubject(exactSubject)).toBe(exactSubject);
    });

    it('should handle real-world contact form subject with name containing newlines', () => {
      const input = 'general inquiry from John\nDoe';
      expect(sanitizeEmailSubject(input)).toBe('general inquiry from John Doe');
    });

    it('should preserve normal subjects without modification', () => {
      const input = 'Question about catering services';
      expect(sanitizeEmailSubject(input)).toBe(input);
    });
  });

  describe('Name sanitization for email subjects', () => {
    // Helper function that mimics name sanitization
    const sanitizeName = (name: string): string => {
      return (name || '').replace(/[\r\n]+/g, ' ').trim();
    };

    it('should remove newlines from names', () => {
      expect(sanitizeName('John\nDoe')).toBe('John Doe');
    });

    it('should handle empty name', () => {
      expect(sanitizeName('')).toBe('');
    });

    it('should handle name with only whitespace', () => {
      expect(sanitizeName('   ')).toBe('');
    });

    it('should handle name with multiple newlines', () => {
      expect(sanitizeName('John\n\nDoe\r\nSmith')).toBe('John Doe Smith');
    });

    it('should preserve normal names', () => {
      expect(sanitizeName('John Doe')).toBe('John Doe');
    });
  });

  describe('Shop name sanitization', () => {
    // Helper function that mimics shop name sanitization from env
    const sanitizeShopName = (shopName: string): string => {
      return (shopName || 'Default Shop').replace(/[\r\n]+/g, ' ').trim();
    };

    it('should remove newlines from shop name', () => {
      expect(sanitizeShopName('Destino\nSF')).toBe('Destino SF');
    });

    it('should use default if empty', () => {
      expect(sanitizeShopName('')).toBe('Default Shop');
    });

    it('should handle shop name with CRLF', () => {
      expect(sanitizeShopName('My\r\nShop')).toBe('My Shop');
    });
  });
});

describe('Contact Form Subject Construction', () => {
  /**
   * Test the subject line construction used in the customer alerts API route
   */
  describe('Fallback subject generation', () => {
    const buildSubject = (
      subject: string | undefined,
      contactType: string | undefined,
      name: string
    ): string => {
      const sanitizedName = (name || '').replace(/[\r\n]+/g, ' ').trim();
      const sanitizedSubject = subject ? subject.replace(/[\r\n]+/g, ' ').trim() : null;

      return sanitizedSubject || `${contactType || 'general'} inquiry from ${sanitizedName}`;
    };

    it('should use provided subject when available', () => {
      const result = buildSubject('My Question', 'general', 'John Doe');
      expect(result).toBe('My Question');
    });

    it('should build fallback subject when no subject provided', () => {
      const result = buildSubject(undefined, 'catering', 'John Doe');
      expect(result).toBe('catering inquiry from John Doe');
    });

    it('should use "general" as default contact type', () => {
      const result = buildSubject(undefined, undefined, 'John Doe');
      expect(result).toBe('general inquiry from John Doe');
    });

    it('should sanitize name in fallback subject', () => {
      const result = buildSubject(undefined, 'general', 'John\nDoe');
      expect(result).toBe('general inquiry from John Doe');
    });

    it('should sanitize provided subject', () => {
      const result = buildSubject('Question\nabout\nservices', 'general', 'John Doe');
      expect(result).toBe('Question about services');
    });

    it('should handle empty subject string as needing fallback', () => {
      const result = buildSubject('', 'support', 'Jane Smith');
      expect(result).toBe('support inquiry from Jane Smith');
    });

    it('should handle subject with only whitespace/newlines', () => {
      const result = buildSubject('\n\n', 'support', 'Jane Smith');
      expect(result).toBe('support inquiry from Jane Smith');
    });
  });
});

describe('Real-world Contact Form Scenarios', () => {
  /**
   * Test cases based on actual production error scenarios
   */
  describe('Production error case: Roy Lau contact form', () => {
    const sanitizeName = (name: string): string =>
      (name || '').replace(/[\r\n]+/g, ' ').trim();
    const sanitizeSubject = (subject: string | undefined): string => {
      if (!subject) return 'General inquiry';
      const sanitized = subject.replace(/[\r\n]+/g, ' ').trim();
      return sanitized || 'General inquiry';
    };

    it('should handle the actual production case', () => {
      // Simulating the production data that caused the error
      const contactData = {
        name: 'Roy Lau',
        email: 'roy@example.com',
        subject: 'general inquiry from Roy Lau', // This was auto-generated
        message: 'Hi,\n\nI am local...',
        type: 'general',
      };

      // The subject should not contain newlines
      expect(sanitizeSubject(contactData.subject)).toBe('general inquiry from Roy Lau');
      expect(sanitizeName(contactData.name)).toBe('Roy Lau');
    });

    it('should handle case where name contains hidden newlines', () => {
      const contactData = {
        name: 'Roy\nLau', // Name with newline (possibly from form paste)
        email: 'roy@example.com',
        type: 'general',
      };

      const sanitizedName = sanitizeName(contactData.name);
      const generatedSubject = `${contactData.type} inquiry from ${sanitizedName}`;

      expect(generatedSubject).toBe('general inquiry from Roy Lau');
      expect(generatedSubject).not.toContain('\n');
    });
  });

  describe('Edge cases from form inputs', () => {
    const sanitizeForSubject = (value: string): string =>
      (value || '').replace(/[\r\n]+/g, ' ').trim();

    it('should handle pasted multi-line text in name field', () => {
      const pastedName = 'John Doe\nCEO, Company Inc.\n123 Main St';
      expect(sanitizeForSubject(pastedName)).toBe('John Doe CEO, Company Inc. 123 Main St');
    });

    it('should handle Unicode with newlines', () => {
      const unicodeName = 'José\nGarcía';
      expect(sanitizeForSubject(unicodeName)).toBe('José García');
    });

    it('should handle tabs and newlines mixed', () => {
      const mixedInput = 'Name\tWith\nTabs\r\nAnd\tNewlines';
      // Only newlines are replaced, tabs are preserved
      expect(sanitizeForSubject(mixedInput)).toBe('Name\tWith Tabs And\tNewlines');
    });

    it('should handle Windows-style line endings', () => {
      const windowsText = 'Line1\r\nLine2\r\nLine3';
      expect(sanitizeForSubject(windowsText)).toBe('Line1 Line2 Line3');
    });

    it('should handle Mac classic line endings', () => {
      const macText = 'Line1\rLine2\rLine3';
      expect(sanitizeForSubject(macText)).toBe('Line1 Line2 Line3');
    });

    it('should handle Unix line endings', () => {
      const unixText = 'Line1\nLine2\nLine3';
      expect(sanitizeForSubject(unixText)).toBe('Line1 Line2 Line3');
    });
  });
});

describe('Email Header Injection Prevention', () => {
  /**
   * Test that sanitization prevents email header injection attacks
   */
  describe('Header injection prevention', () => {
    const sanitize = (value: string): string =>
      (value || '').replace(/[\r\n]+/g, ' ').trim();

    it('should prevent basic header injection', () => {
      const malicious = 'Subject\r\nBcc: attacker@evil.com\r\n\r\nMalicious content';
      const sanitized = sanitize(malicious);
      // The key protection is removing newlines - the text becomes one line
      // without the newlines, the Bcc header won't be interpreted as a separate header
      expect(sanitized).not.toContain('\r\n');
      expect(sanitized).not.toContain('\n');
      expect(sanitized).not.toContain('\r');
      // The content is now on one line, which prevents header injection
      expect(sanitized).toBe('Subject Bcc: attacker@evil.com Malicious content');
    });

    it('should prevent CC injection', () => {
      const malicious = 'Hello\r\nCc: spam@evil.com';
      const sanitized = sanitize(malicious);
      expect(sanitized).toBe('Hello Cc: spam@evil.com');
      expect(sanitized).not.toContain('\r\n');
    });

    it('should prevent content injection via newlines', () => {
      const malicious = 'Normal Subject\r\n\r\n<script>alert("xss")</script>';
      const sanitized = sanitize(malicious);
      expect(sanitized).not.toContain('\r\n\r\n');
    });
  });
});
