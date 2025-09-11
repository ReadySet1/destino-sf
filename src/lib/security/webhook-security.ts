/**
 * Comprehensive Webhook Security Implementation
 * 
 * Implements all security measures for webhook endpoints including
 * rate limiting, IP validation, replay protection, and monitoring.
 */

import { NextRequest } from 'next/server';
import { environmentRateLimiter } from './rate-limiter';
import { checkDuplicateWebhook } from '@/lib/db/queries/webhooks';
import { sendWebhookAlert } from '@/lib/monitoring/webhook-metrics';
import { type SquareEnvironment, WEBHOOK_CONSTANTS } from '@/types/webhook';

// Square's known IP ranges (this would need to be updated based on Square's actual ranges)
const SQUARE_IP_RANGES = [
  '52.85.109.0/24',    // Example Square IP range
  '54.240.0.0/16',     // Example Square IP range
  '192.168.1.0/24'     // Add actual Square IP ranges here
];

/**
 * Validate that request comes from Square's IP ranges
 * Note: This is optional but provides additional security
 */
export async function validateSquareIpRange(clientIp: string): Promise<boolean> {
  try {
    // Skip IP validation in development
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // Skip IP validation if running locally
    if (clientIp === '127.0.0.1' || clientIp === 'localhost' || clientIp === '::1') {
      return true;
    }
    
    // In production, you would implement actual IP range checking here
    // This is a simplified version
    const isValidSquareIp = SQUARE_IP_RANGES.some(range => {
      // Simple IP range check (in production, use a proper IP range library)
      return clientIp.startsWith(range.split('/')[0].substring(0, range.indexOf('.')));
    });
    
    if (!isValidSquareIp) {
      console.warn(`⚠️ Webhook from non-Square IP: ${clientIp}`);
      
      // Send alert for non-Square IPs
      await sendWebhookAlert({
        severity: 'low',
        title: 'Webhook from Non-Square IP',
        message: `Received webhook from IP address not in Square's known ranges: ${clientIp}`,
        details: { clientIp, knownRanges: SQUARE_IP_RANGES }
      });
    }
    
    return isValidSquareIp;
    
  } catch (error) {
    console.error('❌ IP validation error:', error);
    return true; // Don't block on validation errors
  }
}

/**
 * Check for replay attacks using event ID and timestamp
 */
export async function validateReplayProtection(
  eventId: string,
  createdAt: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // 1. Check if we've already processed this event
    const duplicateCheck = await checkDuplicateWebhook(eventId);
    if (duplicateCheck.isDuplicate) {
      return {
        valid: false,
        error: `Duplicate event detected: ${eventId} (existing: ${duplicateCheck.existingId})`
      };
    }

    // 2. Validate event timestamp (prevent old events)
    const eventTime = new Date(createdAt).getTime();
    const now = Date.now();
    const age = now - eventTime;
    
    if (age > WEBHOOK_CONSTANTS.MAX_EVENT_AGE_MS) {
      return {
        valid: false,
        error: `Event too old: ${age}ms > ${WEBHOOK_CONSTANTS.MAX_EVENT_AGE_MS}ms`
      };
    }

    // 3. Check for future events (clock skew protection)
    if (eventTime > now + 60000) { // Allow 1 minute of clock skew
      return {
        valid: false,
        error: `Event timestamp is in the future: ${createdAt}`
      };
    }

    return { valid: true };
    
  } catch (error) {
    console.error('❌ Replay protection validation error:', error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Replay validation failed'
    };
  }
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: NextRequest): string {
  // Check various headers for the real client IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }

  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp) {
    return xRealIp.trim();
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  return 'unknown';
}

/**
 * Comprehensive security validation for webhook requests
 */
export async function validateWebhookSecurity(
  request: NextRequest,
  environment: SquareEnvironment
): Promise<{ 
  valid: boolean; 
  error?: string;
  metadata?: {
    clientIp: string;
    userAgent: string;
    rateLimitInfo: any;
    ipValidation: boolean;
  };
}> {
  try {
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    console.log(`🔒 Security validation for ${environment} webhook from IP: ${clientIp}`);

    // 1. Rate limiting check
    const rateLimitResult = await environmentRateLimiter.check(clientIp, environment);
    if (!rateLimitResult.allowed) {
      console.warn(`🚫 Rate limit exceeded for IP: ${clientIp}`);
      
      await sendWebhookAlert({
        severity: 'medium',
        title: 'Webhook Rate Limit Exceeded',
        message: `IP address ${clientIp} exceeded rate limit for ${environment} webhooks`,
        details: {
          clientIp,
          environment,
          rateLimitInfo: rateLimitResult
        }
      });
      
      return {
        valid: false,
        error: rateLimitResult.message,
        metadata: {
          clientIp,
          userAgent,
          rateLimitInfo: rateLimitResult,
          ipValidation: false
        }
      };
    }

    // 2. Content length validation
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > WEBHOOK_CONSTANTS.MAX_BODY_SIZE) {
      console.warn(`🚫 Request body too large: ${contentLength} bytes`);
      
      return {
        valid: false,
        error: `Request body too large: ${contentLength} bytes > ${WEBHOOK_CONSTANTS.MAX_BODY_SIZE} bytes`
      };
    }

    // 3. User agent validation (optional but recommended)
    const isSquareUserAgent = userAgent.toLowerCase().includes('square') || 
                             userAgent.toLowerCase().includes('webhook');
    
    if (!isSquareUserAgent) {
      console.warn(`⚠️ Unexpected user agent: ${userAgent}`);
      // Don't reject, just log for monitoring
    }

    // 4. IP range validation
    const ipValidation = await validateSquareIpRange(clientIp);
    // Don't reject based on IP alone, as Square's IP ranges may change

    // 5. Header validation
    const hasRequiredSignature = request.headers.has(WEBHOOK_CONSTANTS.SIGNATURE_HEADER_SHA256) ||
                                request.headers.has(WEBHOOK_CONSTANTS.SIGNATURE_HEADER_SHA1);
    
    if (!hasRequiredSignature) {
      return {
        valid: false,
        error: 'Missing required signature headers'
      };
    }

    // 6. Content type validation
    const contentType = request.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      console.warn(`⚠️ Unexpected content type: ${contentType}`);
      // Don't reject, as Square might change this
    }

    console.log(`✅ Security validation passed for ${clientIp}`);

    return {
      valid: true,
      metadata: {
        clientIp,
        userAgent,
        rateLimitInfo: rateLimitResult,
        ipValidation
      }
    };

  } catch (error) {
    console.error('❌ Security validation error:', error);
    
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Security validation failed'
    };
  }
}

/**
 * Security middleware for webhook endpoints
 */
export async function webhookSecurityMiddleware(
  request: NextRequest,
  environment: SquareEnvironment
): Promise<{
  continue: boolean;
  response?: Response;
  metadata?: any;
}> {
  const securityResult = await validateWebhookSecurity(request, environment);
  
  if (!securityResult.valid) {
    console.warn(`🚫 Security validation failed: ${securityResult.error}`);
    
    return {
      continue: false,
      response: new Response(
        JSON.stringify({
          error: 'Security validation failed',
          details: securityResult.error,
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'X-Rate-Limit-Remaining': securityResult.metadata?.rateLimitInfo?.remaining?.toString() || '0',
            'X-Rate-Limit-Reset': securityResult.metadata?.rateLimitInfo?.resetTime?.toString() || '0'
          }
        }
      )
    };
  }

  return {
    continue: true,
    metadata: securityResult.metadata
  };
}

/**
 * Security monitoring and reporting
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private suspiciousIps: Map<string, { count: number; lastSeen: Date }> = new Map();

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Report suspicious activity
   */
  async reportSuspiciousActivity(params: {
    clientIp: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
    details?: Record<string, unknown>;
  }): Promise<void> {
    const { clientIp, reason, severity, details } = params;
    
    // Track suspicious IPs
    const existing = this.suspiciousIps.get(clientIp);
    this.suspiciousIps.set(clientIp, {
      count: (existing?.count || 0) + 1,
      lastSeen: new Date()
    });

    console.warn(`🚨 Suspicious activity from ${clientIp}: ${reason}`);

    // Send alert for repeated suspicious activity
    const suspiciousEntry = this.suspiciousIps.get(clientIp)!;
    if (suspiciousEntry.count >= 5) { // 5 or more suspicious activities
      await sendWebhookAlert({
        severity: 'high',
        title: 'Repeated Suspicious Webhook Activity',
        message: `IP ${clientIp} has ${suspiciousEntry.count} suspicious webhook activities`,
        details: {
          clientIp,
          reason,
          count: suspiciousEntry.count,
          lastSeen: suspiciousEntry.lastSeen,
          ...details
        }
      });
    } else {
      await sendWebhookAlert({
        severity,
        title: 'Suspicious Webhook Activity',
        message: reason,
        details: { clientIp, ...details }
      });
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    suspiciousIps: Array<{
      ip: string;
      count: number;
      lastSeen: Date;
    }>;
    rateLimitStats: any;
  } {
    const suspiciousIps = Array.from(this.suspiciousIps.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      lastSeen: data.lastSeen
    }));

    return {
      suspiciousIps: suspiciousIps.sort((a, b) => b.count - a.count),
      rateLimitStats: environmentRateLimiter.getStats()
    };
  }

  /**
   * Cleanup old suspicious IP records
   */
  cleanup(): void {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    for (const [ip, data] of this.suspiciousIps.entries()) {
      if (data.lastSeen.getTime() < oneWeekAgo) {
        this.suspiciousIps.delete(ip);
      }
    }
  }
}

export const securityMonitor = SecurityMonitor.getInstance();

// Cleanup suspicious IPs daily
setInterval(() => securityMonitor.cleanup(), 24 * 60 * 60 * 1000);
