import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ShippoClientManager } from '@/lib/shippo/client';
import { Shippo } from 'shippo';

// Mock Shippo SDK
jest.mock('shippo', () => {
  return {
    Shippo: jest.fn(),
  };
});

const MockShippo = Shippo as jest.MockedClass<typeof Shippo>;

describe('ShippoClientManager', () => {
  let mockShippoInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ShippoClientManager.reset();

    mockShippoInstance = {
      transactions: { create: jest.fn() },
      shipments: { create: jest.fn() },
      tracks: { retrieve: jest.fn() },
    };
  });

  afterEach(() => {
    delete process.env.SHIPPO_API_KEY;
    ShippoClientManager.reset();
  });

  describe('getInstance', () => {
    it('should initialize client with v2.15+ pattern successfully', () => {
      process.env.SHIPPO_API_KEY = 'test-api-key';
      MockShippo.mockImplementation(() => mockShippoInstance);

      const client = ShippoClientManager.getInstance();

      expect(client).toBe(mockShippoInstance);
      expect(MockShippo).toHaveBeenCalledWith({
        apiKeyHeader: 'test-api-key',
        serverURL: 'https://api.goshippo.com',
      });
    });

    it('should return the same instance on subsequent calls', () => {
      process.env.SHIPPO_API_KEY = 'test-api-key';
      MockShippo.mockImplementation(() => mockShippoInstance);

      const client1 = ShippoClientManager.getInstance();
      const client2 = ShippoClientManager.getInstance();

      expect(client1).toBe(client2);
      expect(MockShippo).toHaveBeenCalledTimes(1);
    });

    it('should throw error when API key is missing', () => {
      delete process.env.SHIPPO_API_KEY;

      expect(() => {
        ShippoClientManager.getInstance();
      }).toThrow('Shippo API key is required but not configured');
    });

    it('should fallback to simple constructor on v2.15+ failure', () => {
      process.env.SHIPPO_API_KEY = 'test-api-key';
      
      MockShippo
        .mockImplementationOnce(() => {
          throw new Error('v2.15+ initialization failed');
        })
        .mockImplementationOnce(() => mockShippoInstance);

      const client = ShippoClientManager.getInstance();

      expect(client).toBe(mockShippoInstance);
      expect(MockShippo).toHaveBeenCalledTimes(2);
      expect(MockShippo).toHaveBeenNthCalledWith(1, {
        apiKeyHeader: 'test-api-key',
        serverURL: 'https://api.goshippo.com',
      });
      expect(MockShippo).toHaveBeenNthCalledWith(2, 'test-api-key');
    });

    it('should fallback to config object on simple constructor failure', () => {
      process.env.SHIPPO_API_KEY = 'test-api-key';
      
      MockShippo
        .mockImplementationOnce(() => {
          throw new Error('v2.15+ initialization failed');
        })
        .mockImplementationOnce(() => {
          throw new Error('Simple constructor failed');
        })
        .mockImplementationOnce(() => mockShippoInstance);

      const client = ShippoClientManager.getInstance();

      expect(client).toBe(mockShippoInstance);
      expect(MockShippo).toHaveBeenCalledTimes(3);
      expect(MockShippo).toHaveBeenNthCalledWith(3, {
        apiKey: 'test-api-key',
      });
    });

    it('should throw error when all initialization methods fail', () => {
      process.env.SHIPPO_API_KEY = 'test-api-key';
      
      MockShippo.mockImplementation(() => {
        throw new Error('All methods failed');
      });

      expect(() => {
        ShippoClientManager.getInstance();
      }).toThrow('Failed to initialize Shippo client: All methods failed');
    });

    it('should return mock client when set', () => {
      const mockClient = { test: 'mock-client' };
      ShippoClientManager.setMockClient(mockClient);

      const client = ShippoClientManager.getInstance();

      expect(client).toBe(mockClient);
      expect(MockShippo).not.toHaveBeenCalled();
    });

    it('should recreate client when API key changes', () => {
      process.env.SHIPPO_API_KEY = 'api-key-1';
      MockShippo.mockImplementation(() => ({ instance: 1 }));

      const client1 = ShippoClientManager.getInstance();
      expect(client1).toEqual({ instance: 1 });

      // Change API key
      process.env.SHIPPO_API_KEY = 'api-key-2';
      MockShippo.mockImplementation(() => ({ instance: 2 }));

      const client2 = ShippoClientManager.getInstance();
      expect(client2).toEqual({ instance: 2 });
      expect(MockShippo).toHaveBeenCalledTimes(2);
    });
  });

  describe('setMockClient', () => {
    it('should set and return mock client', () => {
      const mockClient = { mock: true };
      ShippoClientManager.setMockClient(mockClient);

      const client = ShippoClientManager.getInstance();
      expect(client).toBe(mockClient);
    });
  });

  describe('reset', () => {
    it('should reset client instance and mock', () => {
      process.env.SHIPPO_API_KEY = 'test-api-key';
      MockShippo.mockImplementation(() => mockShippoInstance);

      // Get initial instance
      const client1 = ShippoClientManager.getInstance();
      expect(client1).toBe(mockShippoInstance);

      // Reset
      ShippoClientManager.reset();

      // Get new instance should create new client
      const mockShippoInstance2 = { different: 'instance' };
      MockShippo.mockImplementation(() => mockShippoInstance2);

      const client2 = ShippoClientManager.getInstance();
      expect(client2).toBe(mockShippoInstance2);
      expect(MockShippo).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateConnection', () => {
    it('should validate successful connection', async () => {
      process.env.SHIPPO_API_KEY = 'test-api-key';
      MockShippo.mockImplementation(() => mockShippoInstance);

      const result = await ShippoClientManager.validateConnection();

      expect(result.connected).toBe(true);
      expect(result.version).toBe('v2.15+');
    });

    it('should handle connection failure', async () => {
      delete process.env.SHIPPO_API_KEY;

      const result = await ShippoClientManager.validateConnection();

      expect(result.connected).toBe(false);
      expect(result.version).toBe('unknown');
      expect(result.error).toContain('Shippo API key is required');
    });

    it('should handle client initialization failure', async () => {
      process.env.SHIPPO_API_KEY = 'test-api-key';
      MockShippo.mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      const result = await ShippoClientManager.validateConnection();

      expect(result.connected).toBe(false);
      expect(result.version).toBe('unknown');
      expect(result.error).toContain('Initialization failed');
    });
  });
});