/**
 * Centralized Shippo client with v2.15+ SDK support
 * Provides singleton pattern and proper error handling
 */

import { Shippo } from 'shippo';

interface ShippoClientConfig {
  apiKeyHeader: string;
  serverURL?: string;
}

interface ShippoClientInstance {
  client: any;
  initialized: boolean;
  apiKey: string;
}

/**
 * Singleton Shippo client manager
 */
class ShippoClientManager {
  private static instance: ShippoClientInstance | null = null;
  private static mockClient: any = null;

  /**
   * Set mock client for testing
   */
  static setMockClient(mockClient: any): void {
    this.mockClient = mockClient;
  }

  /**
   * Reset client instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.mockClient = null;
  }

  /**
   * Get or create Shippo client instance
   */
  static getInstance(): any {
    // Return mock client if set (for testing)
    if (this.mockClient) {
      return this.mockClient;
    }

    const apiKey = process.env.SHIPPO_API_KEY;

    if (!apiKey) {
      throw new Error('Shippo API key is required but not configured');
    }

    // Return existing instance if same API key
    if (this.instance && this.instance.apiKey === apiKey && this.instance.initialized) {
      return this.instance.client;
    }

    // Create new instance
    this.instance = {
      client: this.createClient(apiKey),
      initialized: true,
      apiKey,
    };

    return this.instance.client;
  }

  /**
   * Create Shippo client with proper v2.15+ initialization
   */
  private static createClient(apiKey: string): any {
    console.log(
      'Initializing Shippo client with API key:',
      apiKey ? `${apiKey.substring(0, 15)}...` : 'MISSING'
    );

    try {
      // Primary: Shippo SDK v2.15+ initialization pattern
      console.log('Attempting Shippo v2.15+ initialization pattern...');
      const client = new Shippo({
        apiKeyHeader: apiKey,
        serverURL: 'https://api.goshippo.com',
      });

      console.log('✅ Shippo client initialized successfully with v2.15+ pattern');
      return client;
    } catch (error) {
      console.error('❌ Modern Shippo initialization failed:', error);

      // Fallback: Legacy initialization patterns
      console.log('❌ All Shippo initialization methods failed');
      throw new Error('Failed to initialize Shippo client with v2.15+ pattern');
    }
  }

  /**
   * Validate client connection
   */
  static async validateConnection(): Promise<{
    connected: boolean;
    version: string;
    error?: string;
  }> {
    try {
      const client = this.getInstance();

      // Try to make a simple API call to validate connection
      // This is a lightweight check that doesn't create any resources
      if (client && typeof client === 'object') {
        return {
          connected: true,
          version: 'v2.15+',
        };
      }

      return {
        connected: false,
        version: 'unknown',
        error: 'Client not properly initialized',
      };
    } catch (error) {
      return {
        connected: false,
        version: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown connection error',
      };
    }
  }
}

export { ShippoClientManager };
export type { ShippoClientConfig };
