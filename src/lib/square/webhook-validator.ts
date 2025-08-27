import crypto from 'crypto';
import { Redis } from '@upstash/redis';

export class WebhookValidator {
  private redis: Redis;
  private readonly secret: string;
  private readonly maxClockSkew = 300; // 5 minutes in seconds

  constructor(secret: string) {
    this.secret = secret;
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  /**
   * Validate webhook signature with comprehensive security checks
   */
  async validateSignature(
    signature: string,
    body: string,
    timestamp: string,
    eventId: string
  ): Promise<boolean> {
    try {
      // 1. Prevent replay attacks - Check if we've seen this event before
      const processed = await this.redis.get(`webhook:${eventId}`);
      if (processed) {
        console.warn(`🔒 Duplicate webhook detected: ${eventId}`);
        return false;
      }

      // 2. Validate timestamp to prevent replay attacks
      const currentTime = Math.floor(Date.now() / 1000);
      const webhookTime = parseInt(timestamp);

      if (isNaN(webhookTime)) {
        console.error('🔒 Invalid timestamp format in webhook');
        return false;
      }

      if (Math.abs(currentTime - webhookTime) > this.maxClockSkew) {
        console.error(
          `🔒 Webhook timestamp outside acceptable window: ${Math.abs(currentTime - webhookTime)}s`
        );
        return false;
      }

      // 3. Validate signature with constant-time comparison
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(`${timestamp}.${body}`)
        .digest('base64');

      // Use constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      // 4. Mark as processed (with TTL to prevent Redis bloat)
      if (isValid) {
        await this.redis.set(`webhook:${eventId}`, true, { ex: 86400 }); // 24 hour TTL
        console.log(`✅ Webhook signature validated for event: ${eventId}`);
      } else {
        console.error(`🔒 Invalid webhook signature for event: ${eventId}`);
      }

      return isValid;
    } catch (error) {
      console.error('🔒 Error validating webhook signature:', error);
      return false;
    }
  }

  /**
   * Validate webhook signature for Square with enhanced security
   */
  async validateSquareSignature(
    signature: string,
    body: string,
    timestamp: string,
    eventId: string
  ): Promise<boolean> {
    try {
      // Enhanced Square-specific validation
      if (!signature || !body || !timestamp || !eventId) {
        console.error('🔒 Square webhook validation failed: Missing required parameters');
        return false;
      }

      // Validate signature format for Square (base64)
      const base64Regex = /^[A-Za-z0-9+/]+=*$/;
      if (!base64Regex.test(signature)) {
        console.error('🔒 Square webhook validation failed: Invalid signature format');
        return false;
      }

      // Call the general validation method
      const isValid = await this.validateSignature(signature, body, timestamp, eventId);
      
      if (isValid) {
        console.log(`✅ Square webhook signature validated for event: ${eventId}`);
      } else {
        console.error(`🔒 Square webhook signature validation failed for event: ${eventId}`);
      }

      return isValid;
    } catch (error) {
      console.error('🔒 Error validating Square webhook signature:', error);
      return false;
    }
  }

  /**
   * Validate webhook signature with additional Square-specific checks
   */
  async validateSquareWebhookHeaders(
    headers: Headers,
    body: string
  ): Promise<{ isValid: boolean; eventId?: string; timestamp?: string }> {
    try {
      const signature = headers.get('x-square-hmacsha256-signature');
      const timestamp = headers.get('x-square-timestamp');
      
      // Parse body to get event ID
      let eventId: string | undefined;
      try {
        const payload = JSON.parse(body);
        eventId = payload.event_id;
      } catch (error) {
        console.error('🔒 Failed to parse webhook body for event ID:', error);
        return { isValid: false };
      }

      if (!signature || !timestamp || !eventId) {
        console.error('🔒 Missing required Square webhook headers or event ID');
        return { isValid: false };
      }

      const isValid = await this.validateSquareSignature(signature, body, timestamp, eventId);
      
      return {
        isValid,
        eventId,
        timestamp,
      };
    } catch (error) {
      console.error('🔒 Error validating Square webhook headers:', error);
      return { isValid: false };
    }
  }

  /**
   * Validate webhook signature for Shippo
   */
  async validateShippoSignature(
    signature: string,
    body: string,
    eventId: string
  ): Promise<boolean> {
    // Shippo doesn't use timestamp, so we'll use current time
    const currentTimestamp = Math.floor(Date.now() / 1000).toString();
    return this.validateSignature(signature, body, currentTimestamp, eventId);
  }

  /**
   * Check if an event has already been processed (for idempotency)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const processed = await this.redis.get(`webhook:${eventId}`);
      return processed !== null;
    } catch (error) {
      console.error('Error checking event processing status:', error);
      return false;
    }
  }

  /**
   * Mark an event as processed
   */
  async markEventAsProcessed(eventId: string): Promise<void> {
    try {
      await this.redis.set(`webhook:${eventId}`, true, { ex: 86400 });
    } catch (error) {
      console.error('Error marking event as processed:', error);
    }
  }
}

/**
 * Singleton instance for webhook validation
 */
export const webhookValidator = new WebhookValidator(process.env.SQUARE_WEBHOOK_SECRET || '');
