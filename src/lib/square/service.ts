/**
 * Square Service Layer
 *
 * Provides a clean service interface for interacting with Square APIs
 * while ensuring proper runtime initialization and error handling
 */

import { logger } from '../../utils/logger';
import { getSquareClient, resetSquareClient } from './client';
import { config } from '../config';
import * as Square from 'square';

/**
 * Square service class for handling Square API operations
 * This creates a safer abstraction layer on top of the Square client
 */
export class SquareService {
  private client: any;
  private initialized: boolean = false;

  constructor() {
    // Skip initialization during build time
    if (config.app.isBuildTime) {
      logger.warn('SquareService - Skipping initialization during build time');
      return;
    }

    this.initialize();
  }

  /**
   * Initializes the Square client if not already done
   */
  private initialize(): void {
    if (this.initialized) return;

    try {
      logger.info('SquareService - Initializing client');
      this.client = getSquareClient();

      if (!this.client) {
        throw new Error('Failed to initialize Square client');
      }

      this.initialized = true;
    } catch (error) {
      logger.error('SquareService - Error initializing client:', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Ensures the client is ready before operations
   */
  private ensureClient(): void {
    if (!this.initialized) {
      this.initialize();
    }

    if (!this.client) {
      throw new Error('Square client not initialized');
    }
  }

  /**
   * Gets catalog items from Square
   */
  async getCatalogItems(): Promise<any[]> {
    this.ensureClient();

    try {
      logger.debug('SquareService - Fetching catalog items');
      const response = await this.client.catalogApi.listCatalog(undefined, 'ITEM');
      return response.result.objects || [];
    } catch (error) {
      logger.error('SquareService - Error fetching catalog items:', error);
      throw error;
    }
  }

  /**
   * Gets locations from Square
   */
  async getLocations(): Promise<any[]> {
    this.ensureClient();

    try {
      if (!this.client.locationsApi) {
        logger.debug('SquareService - Locations API not available');
        return [];
      }

      logger.debug('SquareService - Fetching locations');
      const response = await this.client.locationsApi.listLocations();
      return response.result.locations || [];
    } catch (error) {
      logger.error('SquareService - Error fetching locations:', error);
      return [];
    }
  }

  /**
   * Creates a Square order
   */
  async createOrder(orderData: any): Promise<any> {
    this.ensureClient();

    try {
      logger.debug('SquareService - Creating order', { orderData });
      const response = await this.client.ordersApi.createOrder(orderData);
      return response.result;
    } catch (error) {
      logger.error('SquareService - Error creating order:', error);
      throw error;
    }
  }

  /**
   * Creates a payment for an order
   */
  async createPayment(paymentData: any): Promise<any> {
    this.ensureClient();

    try {
      logger.debug('SquareService - Creating payment', { paymentData });
      const response = await this.client.paymentsApi.createPayment(paymentData);
      return response.result;
    } catch (error) {
      logger.error('SquareService - Error creating payment:', error);
      throw error;
    }
  }

  /**
   * Updates a Square order (fallback for finalizing orders)
   */
  async updateOrder(orderId: string, updateData: any): Promise<any> {
    this.ensureClient();

    try {
      logger.debug('SquareService - Updating order', { orderId, updateData });
      const response = await this.client.ordersApi.updateOrder(orderId, updateData);
      return response.result;
    } catch (error) {
      logger.error('SquareService - Error updating order:', error);
      throw error;
    }
  }

  /**
   * Retrieves a Square order by ID
   */
  async retrieveOrder(orderId: string): Promise<any> {
    this.ensureClient();

    try {
      logger.debug('SquareService - Retrieving order', { orderId });
      const response = await this.client.ordersApi.retrieveOrder(orderId);
      return response.result;
    } catch (error) {
      logger.error('SquareService - Error retrieving order:', error);
      throw error;
    }
  }

  /**
   * Search catalog objects
   */
  async searchCatalog(searchRequest: any): Promise<any> {
    this.ensureClient();

    try {
      logger.debug('SquareService - Searching catalog', searchRequest);
      const response = await this.client.catalogApi.searchCatalogObjects(searchRequest as any);
      return response.result;
    } catch (error) {
      logger.error('SquareService - Error searching catalog:', error);
      throw error;
    }
  }

  /**
   * Update a catalog item
   */
  async updateCatalogItem(catalogObject: any): Promise<any> {
    this.ensureClient();

    try {
      logger.debug('SquareService - Updating catalog item', { id: catalogObject.id });
      const response = await this.client.catalogApi.upsertCatalogObject({
        idempotencyKey: `update-${catalogObject.id}-${Date.now()}`,
        object: catalogObject,
      });
      return response.result;
    } catch (error) {
      logger.error('SquareService - Error updating catalog item:', error);
      throw error;
    }
  }

  /**
   * Resets the Square client (useful for testing)
   */
  reset(): void {
    this.client = null;
    this.initialized = false;
    resetSquareClient();
  }
}

// Create a singleton instance of the service
let serviceInstance: SquareService | null = null;

/**
 * Gets the Square service instance
 */
export const getSquareService = (): SquareService => {
  if (!serviceInstance) {
    serviceInstance = new SquareService();
  }
  return serviceInstance;
};

/**
 * Resets the Square service instance (useful for testing)
 */
export const resetSquareService = (): void => {
  if (serviceInstance) {
    serviceInstance.reset();
  }
  serviceInstance = null;
};
