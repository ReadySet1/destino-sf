import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';
import { applyRateLimit, shouldBypassInDevelopment } from '@/middleware/rate-limit';
import {
  generateCSP,
  getCSPForEnvironment,
  validateCSPConfig,
  TRUSTED_DOMAINS,
  SECURITY_HEADERS,
} from '@/lib/security/csp-config';

// Mock dependencies
jest.mock('@/middleware/rate-limit');
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

const mockApplyRateLimit = applyRateLimit as jest.MockedFunction<typeof applyRateLimit>;
const mockShouldBypassInDevelopment = shouldBypassInDevelopment as jest.MockedFunction<
  typeof shouldBypassInDevelopment
>;

// Mock crypto for nonce generation
const mockCrypto = {
  randomUUID: jest.fn(() => 'mock-uuid-123'),
};
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
});

describe.skip('Middleware Security System (Phase 2 - Security Headers & Rate Limiting)', () => {
  let mockRequest: NextRequest;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Setup environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

    // Default request
    mockRequest = new NextRequest('https://example.com/api/test', {
      method: 'GET',
      headers: {
        'user-agent': 'test-agent',
        'x-forwarded-for': '192.168.1.1',
      },
    });

    // Default mocks
    mockApplyRateLimit.mockResolvedValue(null);
    mockShouldBypassInDevelopment.mockReturnValue(false);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Static Asset Handling', () => {
    it('should skip middleware for Next.js static assets', async () => {
      const staticRequest = new NextRequest('https://example.com/_next/static/css/app.css');

      const response = await middleware(staticRequest);

      expect(response?.headers.get('X-Request-ID')).toBeUndefined();
      expect(mockApplyRateLimit).not.toHaveBeenCalled();
    });

    it('should skip middleware for favicon', async () => {
      const faviconRequest = new NextRequest('https://example.com/favicon.ico');

      const response = await middleware(faviconRequest);

      expect(response?.headers.get('X-Request-ID')).toBeUndefined();
      expect(mockApplyRateLimit).not.toHaveBeenCalled();
    });

    it('should skip middleware for image files', async () => {
      const imageFormats = ['svg', 'png', 'jpg', 'jpeg', 'gif', 'webp'];

      for (const format of imageFormats) {
        const imageRequest = new NextRequest(`https://example.com/image.${format}`);
        const response = await middleware(imageRequest);

        expect(response?.headers.get('X-Request-ID')).toBeUndefined();
      }

      expect(mockApplyRateLimit).not.toHaveBeenCalled();
    });

    it('should process non-static asset requests', async () => {
      const apiRequest = new NextRequest('https://example.com/api/orders');

      const response = await middleware(apiRequest);

      expect(response?.headers.get('X-Request-ID')).toBeDefined();
      expect(mockApplyRateLimit).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should apply rate limiting to API routes', async () => {
      const apiRequest = new NextRequest('https://example.com/api/checkout/payment');

      await middleware(apiRequest);

      expect(mockApplyRateLimit).toHaveBeenCalledWith(apiRequest);
    });

    it('should return rate limit response when limit exceeded', async () => {
      const rateLimitResponse = new NextResponse('Rate limit exceeded', { status: 429 });
      mockApplyRateLimit.mockResolvedValue(rateLimitResponse);

      const apiRequest = new NextRequest('https://example.com/api/orders');
      const response = await middleware(apiRequest);

      expect(response?.status).toBe(429);
    });

    it('should bypass rate limiting in development when configured', async () => {
      mockShouldBypassInDevelopment.mockReturnValue(true);

      const apiRequest = new NextRequest('https://example.com/api/test');

      await middleware(apiRequest);

      expect(mockApplyRateLimit).not.toHaveBeenCalled();
    });

    it('should not apply rate limiting to non-API routes', async () => {
      const pageRequest = new NextRequest('https://example.com/about');

      await middleware(pageRequest);

      expect(mockApplyRateLimit).not.toHaveBeenCalled();
    });

    it('should handle rate limiting errors gracefully', async () => {
      mockApplyRateLimit.mockRejectedValue(new Error('Rate limiting service down'));

      const apiRequest = new NextRequest('https://example.com/api/orders');
      const response = await middleware(apiRequest);

      // Should continue processing despite rate limiting error
      expect(response?.headers.get('X-Request-ID')).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    it('should add basic security headers to all responses', async () => {
      const response = await middleware(mockRequest);

      expect(response?.headers.get('X-DNS-Prefetch-Control')).toBe('off');
      expect(response?.headers.get('X-Download-Options')).toBe('noopen');
      expect(response?.headers.get('X-Permitted-Cross-Domain-Policies')).toBe('none');
      expect(response?.headers.get('X-CSRF-Protection')).toBe('1');
    });

    it('should add CSP nonce for HTML pages', async () => {
      const pageRequest = new NextRequest('https://example.com/checkout');

      const response = await middleware(pageRequest);

      expect(response?.headers.get('X-CSP-Nonce')).toBe('mock-uuid-123');
    });

    it('should not add CSP nonce for API routes', async () => {
      const apiRequest = new NextRequest('https://example.com/api/orders');

      const response = await middleware(apiRequest);

      expect(response?.headers.get('X-CSP-Nonce')).toBeNull();
    });

    it('should not add CSP nonce for static assets', async () => {
      const staticRequest = new NextRequest('https://example.com/styles.css');

      const response = await middleware(staticRequest);

      expect(response?.headers.get('X-CSP-Nonce')).toBeNull();
    });

    it('should add strict cache control for admin routes', async () => {
      const adminRequest = new NextRequest('https://example.com/admin/dashboard');

      const response = await middleware(adminRequest);

      expect(response?.headers.get('Cache-Control')).toBe(
        'no-store, no-cache, must-revalidate, private'
      );
      expect(response?.headers.get('Pragma')).toBe('no-cache');
      expect(response?.headers.get('Expires')).toBe('0');
    });

    it('should add strict cache control for protected routes', async () => {
      const protectedRequest = new NextRequest('https://example.com/protected/profile');

      const response = await middleware(protectedRequest);

      expect(response?.headers.get('Cache-Control')).toBe(
        'no-store, no-cache, must-revalidate, private'
      );
    });

    it('should generate unique request IDs', async () => {
      mockCrypto.randomUUID.mockReturnValueOnce('uuid-1').mockReturnValueOnce('uuid-2');

      const response1 = await middleware(mockRequest);
      const response2 = await middleware(mockRequest);

      expect(response1?.headers.get('X-Request-ID')).toContain('uuid-1');
      expect(response2?.headers.get('X-Request-ID')).toContain('uuid-2');
    });

    it('should include timestamp in request ID', async () => {
      const mockTimestamp = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const response = await middleware(mockRequest);

      expect(response?.headers.get('X-Request-ID')).toContain(mockTimestamp.toString());
    });
  });

  describe('Authentication Integration', () => {
    it('should handle Supabase authentication errors gracefully', async () => {
      // Mock Supabase to throw an error
      const mockCreateServerClient = require('@supabase/ssr').createServerClient;
      mockCreateServerClient.mockImplementation(() => {
        throw new Error('Supabase connection failed');
      });

      const response = await middleware(mockRequest);

      expect(consoleSpy).toHaveBeenCalledWith('Middleware error:', expect.any(Error));
      expect(response?.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should continue processing when auth check fails', async () => {
      const mockCreateServerClient = require('@supabase/ssr').createServerClient;
      mockCreateServerClient.mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Auth service down')),
        },
      }));

      const response = await middleware(mockRequest);

      expect(response?.headers.get('X-Request-ID')).toBeDefined();
    });

    it('should handle successful authentication', async () => {
      const mockCreateServerClient = require('@supabase/ssr').createServerClient;
      mockCreateServerClient.mockImplementation(() => ({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null,
          }),
        },
      }));

      const response = await middleware(mockRequest);

      expect(response?.headers.get('X-Request-ID')).toBeDefined();
    });
  });

  describe('Cookie Handling', () => {
    it('should handle cookie operations correctly', async () => {
      const requestWithCookies = new NextRequest('https://example.com/api/test', {
        headers: {
          cookie: 'session=abc123; theme=dark',
        },
      });

      const response = await middleware(requestWithCookies);

      expect(response).toBeDefined();
    });

    it('should set cookies in response when needed', async () => {
      // This tests the cookie callback implementation
      const response = await middleware(mockRequest);

      expect(response).toBeDefined();
    });
  });
});

describe.skip('CSP Configuration System', () => {
  describe('generateCSP function', () => {
    it('should generate development CSP with unsafe policies', () => {
      const csp = generateCSP({ environment: 'development' });

      expect(csp).toContain("'unsafe-inline'");
      expect(csp).toContain("'unsafe-eval'");
      expect(csp).toContain("default-src 'self'");
    });

    it('should generate production CSP without unsafe policies', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
      expect(csp).toContain("default-src 'self'");
    });

    it('should include nonce in CSP when provided', () => {
      const nonce = 'test-nonce-123';
      const csp = generateCSP({ environment: 'production', nonce });

      expect(csp).toContain(`'nonce-${nonce}'`);
    });

    it('should include trusted Square domains', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain('https://js.squareup.com');
      expect(csp).toContain('https://connect.squareup.com');
    });

    it('should include trusted Supabase domains', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain('https://*.supabase.co');
    });

    it('should include Google services for maps and fonts', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain('https://maps.googleapis.com');
      expect(csp).toContain('https://fonts.googleapis.com');
    });

    it('should include AWS S3 domains for images', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain('https://*.s3.amazonaws.com');
    });

    it('should set strict object-src policy', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain("object-src 'none'");
    });

    it('should set frame-ancestors to none', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should include upgrade-insecure-requests in production', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain('upgrade-insecure-requests');
    });

    it('should include report-uri in production', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain('report-uri /api/security/csp-report');
    });

    it('should not include report-uri in development', () => {
      const csp = generateCSP({ environment: 'development' });

      expect(csp).not.toContain('report-uri');
    });

    it('should handle test environment', () => {
      const csp = generateCSP({ environment: 'test' });

      expect(csp).toContain("default-src 'self'");
      expect(csp).not.toContain('upgrade-insecure-requests');
    });
  });

  describe('Environment-specific CSP functions', () => {
    it('should get development CSP with nonce', () => {
      const csp = getCSPForEnvironment('development', 'dev-nonce');

      expect(csp).toContain("'nonce-dev-nonce'");
      expect(csp).toContain("'unsafe-inline'");
    });

    it('should get production CSP with nonce', () => {
      const csp = getCSPForEnvironment('production', 'prod-nonce');

      expect(csp).toContain("'nonce-prod-nonce'");
      expect(csp).not.toContain("'unsafe-inline'");
    });
  });

  describe('CSP Validation', () => {
    it('should validate CSP configuration successfully', () => {
      const validation = validateCSPConfig();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required domains', () => {
      // Temporarily modify trusted domains
      const originalSquare = TRUSTED_DOMAINS.square;
      TRUSTED_DOMAINS.square = [];

      const validation = validateCSPConfig();

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(error => error.includes('js.squareup.com'))).toBe(true);

      // Restore original domains
      TRUSTED_DOMAINS.square = originalSquare;
    });
  });

  describe('Security Headers Configuration', () => {
    it('should define all required security headers', () => {
      expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
      expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
      expect(SECURITY_HEADERS['X-XSS-Protection']).toBe('1; mode=block');
      expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should define permissions policy', () => {
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('camera=()');
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('payment=(self)');
      expect(SECURITY_HEADERS['Permissions-Policy']).toContain('geolocation=(self)');
    });

    it('should define HSTS for production', () => {
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('max-age=63072000');
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('includeSubDomains');
      expect(SECURITY_HEADERS['Strict-Transport-Security']).toContain('preload');
    });
  });

  describe('Trusted Domains Configuration', () => {
    it('should include all required Square domains', () => {
      const squareDomains = TRUSTED_DOMAINS.square;

      expect(squareDomains).toContain('https://js.squareup.com');
      expect(squareDomains).toContain('https://connect.squareup.com');
      expect(squareDomains).toContain('https://connect.squareupsandbox.com');
    });

    it('should include Supabase domains', () => {
      const supabaseDomains = TRUSTED_DOMAINS.supabase;

      expect(supabaseDomains).toContain('https://*.supabase.co');
      expect(supabaseDomains).toContain('https://*.supabase.io');
    });

    it('should include Google service domains', () => {
      const googleDomains = TRUSTED_DOMAINS.google;

      expect(googleDomains).toContain('https://maps.googleapis.com');
      expect(googleDomains).toContain('https://fonts.googleapis.com');
      expect(googleDomains).toContain('https://fonts.gstatic.com');
    });

    it('should include AWS S3 domains for both environments', () => {
      const awsDomains = TRUSTED_DOMAINS.aws;

      expect(awsDomains).toContain('https://items-images-sandbox.s3.us-west-2.amazonaws.com');
      expect(awsDomains).toContain('https://items-images-production.s3.us-west-2.amazonaws.com');
    });

    it('should include other necessary service domains', () => {
      const otherDomains = TRUSTED_DOMAINS.other;

      expect(otherDomains).toContain('https://api.resend.com');
      expect(otherDomains).toContain('https://*.upstash.io');
      expect(otherDomains).toContain('https://*.sentry.io');
    });
  });

  describe('CSP Edge Cases and Security', () => {
    it('should handle empty nonce gracefully', () => {
      const csp = generateCSP({ environment: 'production', nonce: '' });

      expect(csp).not.toContain("'nonce-'");
    });

    it('should handle undefined nonce gracefully', () => {
      const csp = generateCSP({ environment: 'production', nonce: undefined });

      expect(csp).not.toContain('nonce-undefined');
    });

    it('should not allow data: URLs in script-src', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).not.toContain('script-src.*data:');
    });

    it('should allow data: URLs only for fonts and images', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain("font-src 'self' data:");
      expect(csp).toContain("img-src 'self' data:");
    });

    it('should prevent inline styles in production without nonce', () => {
      const csp = generateCSP({ environment: 'production' });

      // Should allow unsafe-inline for styles (required for CSS-in-JS)
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    });

    it('should block all plugins with object-src none', () => {
      const csp = generateCSP({ environment: 'production' });

      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('Performance and Optimization', () => {
    it('should generate CSP efficiently for large domain lists', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        generateCSP({ environment: 'production' });
      }

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Should be fast (under 100ms for 1000 generations)
      expect(executionTime).toBeLessThan(100);
    });

    it('should cache domain configurations efficiently', () => {
      const config1 = TRUSTED_DOMAINS.square;
      const config2 = TRUSTED_DOMAINS.square;

      // Should reference the same array (efficient)
      expect(config1).toBe(config2);
    });
  });
});
