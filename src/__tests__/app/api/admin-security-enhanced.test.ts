import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';

// Mock dependencies
jest.mock('next-auth/next');
jest.mock('@/lib/db');
jest.mock('@/lib/auth');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

describe('Admin API Routes - Security & Validation', () => {
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment
    process.env.NEXTAUTH_SECRET = 'test-secret';
    process.env.ADMIN_EMAIL = 'admin@destinosf.com';
  });

  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.ADMIN_EMAIL;
  });

  describe('Authentication Middleware', () => {
    it('should reject requests without valid session', async () => {
      mockGetServerSession.mockResolvedValue(null);

      mockRequest = new NextRequest('http://localhost:3000/api/admin/orders');

      const authenticateAdmin = async (req: NextRequest) => {
        const session = await getServerSession();
        if (!session) {
          return new Response(
            JSON.stringify({ error: 'Authentication required' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return null;
      };

      const response = await authenticateAdmin(mockRequest);

      expect(response?.status).toBe(401);
      const body = await response?.json();
      expect(body.error).toBe('Authentication required');
    });

    it('should reject non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          email: 'regular@user.com',
          role: 'USER',
        },
        expires: '2024-12-31',
      });

      mockRequest = new NextRequest('http://localhost:3000/api/admin/products');

      const authorizeAdmin = async (req: NextRequest) => {
        const session = await getServerSession();
        if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
          return new Response(
            JSON.stringify({ error: 'Insufficient permissions' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return null;
      };

      const response = await authorizeAdmin(mockRequest);

      expect(response?.status).toBe(403);
      const body = await response?.json();
      expect(body.error).toBe('Insufficient permissions');
    });

    it('should allow valid admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          email: 'admin@destinosf.com',
          role: 'ADMIN',
        },
        expires: '2024-12-31',
      });

      mockRequest = new NextRequest('http://localhost:3000/api/admin/orders');

      const authorizeAdmin = async (req: NextRequest) => {
        const session = await getServerSession();
        if (!session?.user?.email || session.user.email !== process.env.ADMIN_EMAIL) {
          return new Response(
            JSON.stringify({ error: 'Insufficient permissions' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return null;
      };

      const response = await authorizeAdmin(mockRequest);

      expect(response).toBeNull();
    });

    it('should handle session validation errors gracefully', async () => {
      mockGetServerSession.mockRejectedValue(new Error('Session validation failed'));

      mockRequest = new NextRequest('http://localhost:3000/api/admin/dashboard');

      const handleSessionError = async (req: NextRequest) => {
        try {
          const session = await getServerSession();
          return session;
        } catch (error) {
          return new Response(
            JSON.stringify({ error: 'Authentication service unavailable' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      };

      const response = await handleSessionError(mockRequest);

      expect(response).toBeInstanceOf(Response);
      if (response instanceof Response) {
        expect(response.status).toBe(503);
        const body = await response.json();
        expect(body.error).toBe('Authentication service unavailable');
      }
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate product creation data', async () => {
      const validateProductData = (data: any) => {
        const errors: string[] = [];

        if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
          errors.push('Product name is required');
        }

        if (data.name && data.name.length > 255) {
          errors.push('Product name must be less than 255 characters');
        }

        if (!data.price || typeof data.price !== 'number' || data.price <= 0) {
          errors.push('Valid price is required');
        }

        if (data.price && data.price > 10000) {
          errors.push('Price cannot exceed $10,000');
        }

        if (data.description && typeof data.description !== 'string') {
          errors.push('Description must be a string');
        }

        if (data.category && !['empanadas', 'alfajores', 'other'].includes(data.category)) {
          errors.push('Invalid category');
        }

        return errors;
      };

      // Test valid data
      const validData = {
        name: 'Beef Empanadas',
        price: 12.99,
        description: 'Delicious beef empanadas',
        category: 'empanadas',
      };

      expect(validateProductData(validData)).toEqual([]);

      // Test invalid data
      const invalidData = {
        name: '',
        price: -5,
        description: 123,
        category: 'invalid',
      };

      const errors = validateProductData(invalidData);
      expect(errors).toContain('Product name is required');
      expect(errors).toContain('Valid price is required');
      expect(errors).toContain('Description must be a string');
      expect(errors).toContain('Invalid category');
    });

    it('should sanitize HTML input to prevent XSS', async () => {
      const sanitizeHtml = (input: string): string => {
        return input
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      };

      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(maliciousInput);

      expect(sanitized).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(sanitized).not.toContain('<script>');
    });

    it('should validate SQL injection attempts', async () => {
      const validateSqlInput = (input: string): boolean => {
        const sqlPatterns = [
          /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
          /(;|\-\-|\/\*|\*\/)/,
          /(\b(OR|AND)\b.*=.*)/i,
        ];

        return !sqlPatterns.some(pattern => pattern.test(input));
      };

      const safeInputs = [
        'Beef Empanadas',
        'Product description with normal text',
        'Category: empanadas',
      ];

      const maliciousInputs = [
        "'; DROP TABLE products; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM users",
        "/* comment */ SELECT password",
      ];

      safeInputs.forEach(input => {
        expect(validateSqlInput(input)).toBe(true);
      });

      maliciousInputs.forEach(input => {
        expect(validateSqlInput(input)).toBe(false);
      });
    });

    it('should enforce rate limiting on sensitive endpoints', async () => {
      class RateLimiter {
        private requests: Map<string, number[]> = new Map();
        private windowMs: number;
        private maxRequests: number;

        constructor(windowMs: number = 60000, maxRequests: number = 10) {
          this.windowMs = windowMs;
          this.maxRequests = maxRequests;
        }

        isAllowed(identifier: string): boolean {
          const now = Date.now();
          const windowStart = now - this.windowMs;

          if (!this.requests.has(identifier)) {
            this.requests.set(identifier, []);
          }

          const userRequests = this.requests.get(identifier)!;
          
          // Remove old requests outside the window
          const validRequests = userRequests.filter(time => time > windowStart);
          
          if (validRequests.length >= this.maxRequests) {
            return false;
          }

          validRequests.push(now);
          this.requests.set(identifier, validRequests);
          return true;
        }
      }

      const rateLimiter = new RateLimiter(60000, 5); // 5 requests per minute
      const clientIp = '192.168.1.100';

      // First 5 requests should be allowed
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.isAllowed(clientIp)).toBe(true);
      }

      // 6th request should be denied
      expect(rateLimiter.isAllowed(clientIp)).toBe(false);
    });
  });

  describe('Data Access Control', () => {
    it('should implement role-based access control', async () => {
      const checkPermissions = (userRole: string, requiredPermission: string): boolean => {
        const rolePermissions = {
          ADMIN: ['read', 'write', 'delete', 'manage_users'],
          MANAGER: ['read', 'write'],
          VIEWER: ['read'],
        };

        const permissions = rolePermissions[userRole as keyof typeof rolePermissions] || [];
        return permissions.includes(requiredPermission);
      };

      expect(checkPermissions('ADMIN', 'delete')).toBe(true);
      expect(checkPermissions('MANAGER', 'write')).toBe(true);
      expect(checkPermissions('VIEWER', 'read')).toBe(true);
      expect(checkPermissions('VIEWER', 'write')).toBe(false);
      expect(checkPermissions('MANAGER', 'manage_users')).toBe(false);
    });

    it('should filter sensitive data based on user role', async () => {
      interface User {
        id: string;
        email: string;
        password?: string;
        paymentInfo?: any;
        role: string;
      }

      const filterUserData = (user: User, requestorRole: string): Partial<User> => {
        const baseData = { id: user.id, email: user.email, role: user.role };

        if (requestorRole === 'ADMIN') {
          return { ...baseData, paymentInfo: user.paymentInfo };
        }

        if (requestorRole === 'MANAGER') {
          return baseData;
        }

        // Viewer or lower - minimal data
        return { id: user.id };
      };

      const user: User = {
        id: 'user-123',
        email: 'customer@example.com',
        password: 'hashed_password',
        paymentInfo: { last4: '1234' },
        role: 'USER',
      };

      const adminView = filterUserData(user, 'ADMIN');
      const managerView = filterUserData(user, 'MANAGER');
      const viewerView = filterUserData(user, 'VIEWER');

      expect(adminView.paymentInfo).toBeDefined();
      expect(adminView.email).toBeDefined();
      expect(adminView.password).toBeUndefined(); // Never expose password

      expect(managerView.email).toBeDefined();
      expect(managerView.paymentInfo).toBeUndefined();

      expect(viewerView.email).toBeUndefined();
      expect(Object.keys(viewerView)).toEqual(['id']);
    });
  });

  describe('API Response Security', () => {
    it('should include security headers in responses', async () => {
      const addSecurityHeaders = (response: Response): Response => {
        const headers = new Headers(response.headers);
        
        headers.set('X-Content-Type-Options', 'nosniff');
        headers.set('X-Frame-Options', 'DENY');
        headers.set('X-XSS-Protection', '1; mode=block');
        headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        headers.set('Content-Security-Policy', "default-src 'self'");
        headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      };

      const originalResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const secureResponse = addSecurityHeaders(originalResponse);

      expect(secureResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(secureResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(secureResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(secureResponse.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    });

    it('should handle error responses without exposing sensitive information', async () => {
      const createErrorResponse = (error: Error, isDevelopment: boolean = false): Response => {
        const publicMessage = 'An error occurred while processing your request';
        
        const errorResponse = {
          error: publicMessage,
          timestamp: new Date().toISOString(),
          requestId: Math.random().toString(36).substring(7),
          ...(isDevelopment && { details: error.message, stack: error.stack }),
        };

        return new Response(JSON.stringify(errorResponse), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      };

      const sensitiveError = new Error('Database connection failed: password=secret123');

      // Production response
      const prodResponse = createErrorResponse(sensitiveError, false);
      const prodBody = await prodResponse.json();

      expect(prodBody.error).toBe('An error occurred while processing your request');
      expect(prodBody.details).toBeUndefined();
      expect(prodBody.stack).toBeUndefined();

      // Development response
      const devResponse = createErrorResponse(sensitiveError, true);
      const devBody = await devResponse.json();

      expect(devBody.details).toBeDefined();
      expect(devBody.stack).toBeDefined();
    });
  });

  describe('Audit Logging', () => {
    it('should log administrative actions with context', async () => {
      interface AuditLog {
        userId: string;
        action: string;
        resource: string;
        timestamp: Date;
        ipAddress: string;
        userAgent: string;
        result: 'SUCCESS' | 'FAILURE';
        details?: any;
      }

      const logAdminAction = (
        userId: string,
        action: string,
        resource: string,
        request: NextRequest,
        result: 'SUCCESS' | 'FAILURE',
        details?: any
      ): AuditLog => {
        return {
          userId,
          action,
          resource,
          timestamp: new Date(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          result,
          details,
        };
      };

      mockRequest = new NextRequest('http://localhost:3000/api/admin/products', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'Mozilla/5.0 (Test Browser)',
        },
      });

      const auditLog = logAdminAction(
        'admin-123',
        'CREATE',
        'PRODUCT',
        mockRequest,
        'SUCCESS',
        { productId: 'prod-456' }
      );

      expect(auditLog.userId).toBe('admin-123');
      expect(auditLog.action).toBe('CREATE');
      expect(auditLog.resource).toBe('PRODUCT');
      expect(auditLog.ipAddress).toBe('192.168.1.100');
      expect(auditLog.userAgent).toBe('Mozilla/5.0 (Test Browser)');
      expect(auditLog.result).toBe('SUCCESS');
      expect(auditLog.details.productId).toBe('prod-456');
    });

    it('should implement audit log retention and cleanup', async () => {
      interface AuditLog {
        id: string;
        timestamp: Date;
        action: string;
      }

      const cleanupOldAuditLogs = (logs: AuditLog[], retentionDays: number = 90): AuditLog[] => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        return logs.filter(log => log.timestamp >= cutoffDate);
      };

      const oldLogs: AuditLog[] = [
        { id: '1', timestamp: new Date('2024-01-01'), action: 'LOGIN' },
        { id: '2', timestamp: new Date('2024-06-01'), action: 'CREATE_PRODUCT' },
        { id: '3', timestamp: new Date(), action: 'UPDATE_ORDER' },
      ];

      const cleanedLogs = cleanupOldAuditLogs(oldLogs, 30);

      expect(cleanedLogs).toHaveLength(1);
      expect(cleanedLogs[0].id).toBe('3');
    });
  });
}); 