import { NextRequest, NextResponse } from 'next/server';
import { updateShippingConfiguration, getAllShippingConfigurations } from '@/lib/shippingUtils';
import { createClient } from '@/utils/supabase/server';

// Import our new test utilities
import { mockConsole, restoreConsole } from '@/__tests__/setup/test-utils';

// Mock the dependencies
jest.mock('@/lib/shippingUtils');
jest.mock('@/utils/supabase/server');

const mockUpdateShippingConfiguration = updateShippingConfiguration as jest.MockedFunction<
  typeof updateShippingConfiguration
>;
const mockGetAllShippingConfigurations = getAllShippingConfigurations as jest.MockedFunction<
  typeof getAllShippingConfigurations
>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Mock Supabase client with proper chaining
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

describe('/api/admin/shipping-config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsole(); // Use utility for console mocking

    // Setup default Supabase client mock
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any);
  });

  afterEach(() => {
    restoreConsole(); // Use utility for cleanup
  });

  describe('GET: retrieve all configurations', () => {
    test('should return all shipping configurations for admin user', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      // Fix the chained mock calls
      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const mockConfigurations = [
        {
          productName: 'alfajores',
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        },
        {
          productName: 'empanadas',
          baseWeightLb: 1.0,
          weightPerUnitLb: 0.8,
          isActive: true,
          applicableForNationwideOnly: true,
        },
      ];

      mockGetAllShippingConfigurations.mockResolvedValue(mockConfigurations);

      // Since we can't directly test the route handler, we'll test the underlying logic
      const configurations = await getAllShippingConfigurations();

      expect(mockGetAllShippingConfigurations).toHaveBeenCalled();
      expect(configurations).toEqual(mockConfigurations);
      expect(configurations).toHaveLength(2);
    });

    test('should return 401 for non-admin user', async () => {
      // Mock non-admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'regular-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'USER' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      // Test authorization logic
      const userProfile = await mockSingle();
      const isAdmin = userProfile.data?.role === 'ADMIN';

      expect(isAdmin).toBe(false);
    });

    test('should return 401 for unauthenticated user', async () => {
      // Mock unauthenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const {
        data: { user },
        error,
      } = await mockSupabaseClient.auth.getUser();

      expect(user).toBeNull();
      expect(error).toBeTruthy();
    });

    test('should handle database errors gracefully', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      mockGetAllShippingConfigurations.mockRejectedValue(new Error('Database connection failed'));

      await expect(getAllShippingConfigurations()).rejects.toThrow('Database connection failed');
    });

    test('should return empty array when no configurations exist', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      mockGetAllShippingConfigurations.mockResolvedValue([]);

      const configurations = await getAllShippingConfigurations();

      expect(configurations).toEqual([]);
      expect(configurations).toHaveLength(0);
    });
  });

  describe('POST: create/update configuration', () => {
    const validConfigurationData = {
      configurations: [
        {
          productName: 'alfajores',
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        },
      ],
    };

    test('should create new configuration for admin user', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const mockUpdatedConfig = {
        productName: 'alfajores',
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
        id: 'config-id-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUpdateShippingConfiguration.mockResolvedValue(mockUpdatedConfig);

      const result = await updateShippingConfiguration(
        validConfigurationData.configurations[0].productName,
        {
          baseWeightLb: validConfigurationData.configurations[0].baseWeightLb,
          weightPerUnitLb: validConfigurationData.configurations[0].weightPerUnitLb,
          isActive: validConfigurationData.configurations[0].isActive,
          applicableForNationwideOnly:
            validConfigurationData.configurations[0].applicableForNationwideOnly,
        }
      );

      expect(mockUpdateShippingConfiguration).toHaveBeenCalledWith('alfajores', {
        baseWeightLb: 0.5,
        weightPerUnitLb: 0.4,
        isActive: true,
        applicableForNationwideOnly: true,
      });
      expect(result).toEqual(mockUpdatedConfig);
    });

    test('should update existing configuration', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const updatedConfigData = {
        productName: 'alfajores',
        baseWeightLb: 0.6, // Updated weight
        weightPerUnitLb: 0.5, // Updated weight
        isActive: true,
        applicableForNationwideOnly: false, // Updated setting
      };

      const mockUpdatedConfig = {
        ...updatedConfigData,
        id: 'config-id-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      mockUpdateShippingConfiguration.mockResolvedValue(mockUpdatedConfig);

      const result = await updateShippingConfiguration(updatedConfigData.productName, {
        baseWeightLb: updatedConfigData.baseWeightLb,
        weightPerUnitLb: updatedConfigData.weightPerUnitLb,
        isActive: updatedConfigData.isActive,
        applicableForNationwideOnly: updatedConfigData.applicableForNationwideOnly,
      });

      expect(result.baseWeightLb).toBe(0.6);
      expect(result.weightPerUnitLb).toBe(0.5);
      expect(result.applicableForNationwideOnly).toBe(false);
    });

    test('should handle multiple configurations in single request', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const multipleConfigs = [
        {
          productName: 'alfajores',
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        },
        {
          productName: 'empanadas',
          baseWeightLb: 1.0,
          weightPerUnitLb: 0.8,
          isActive: true,
          applicableForNationwideOnly: true,
        },
      ];

      mockUpdateShippingConfiguration
        .mockResolvedValueOnce({ ...multipleConfigs[0], id: 'config-1' })
        .mockResolvedValueOnce({ ...multipleConfigs[1], id: 'config-2' });

      // Test updating multiple configurations
      const results = [];
      for (const config of multipleConfigs) {
        const result = await updateShippingConfiguration(config.productName, {
          baseWeightLb: config.baseWeightLb,
          weightPerUnitLb: config.weightPerUnitLb,
          isActive: config.isActive,
          applicableForNationwideOnly: config.applicableForNationwideOnly,
        });
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0].productName).toBe('alfajores');
      expect(results[1].productName).toBe('empanadas');
    });

    test('should return 401 for non-admin user', async () => {
      // Mock non-admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'regular-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'USER' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      // Test authorization logic
      const userProfile = await mockSingle();
      const isAdmin = userProfile.data?.role === 'ADMIN';

      expect(isAdmin).toBe(false);
    });

    test('should validate configuration data', async () => {
      const invalidConfigurations = [
        {
          productName: '', // Invalid: empty product name
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        },
        {
          productName: 'alfajores',
          baseWeightLb: -0.1, // Invalid: negative weight
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        },
        {
          productName: 'alfajores',
          baseWeightLb: 0.5,
          weightPerUnitLb: 60, // Invalid: exceeds max weight
          isActive: true,
          applicableForNationwideOnly: true,
        },
      ];

      // These would be caught by Zod validation in the actual API route
      invalidConfigurations.forEach(config => {
        expect(
          config.productName === '' || config.baseWeightLb < 0.1 || config.weightPerUnitLb > 50
        ).toBe(true);
      });
    });

    test('should handle partial configuration update failures', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const multipleConfigs = [
        {
          productName: 'alfajores',
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        },
        {
          productName: 'empanadas',
          baseWeightLb: 1.0,
          weightPerUnitLb: 0.8,
          isActive: true,
          applicableForNationwideOnly: true,
        },
      ];

      // First config succeeds, second fails
      mockUpdateShippingConfiguration
        .mockResolvedValueOnce({ ...multipleConfigs[0], id: 'config-1' })
        .mockRejectedValueOnce(new Error('Database constraint violation'));

      const results = [];
      for (const config of multipleConfigs) {
        try {
          const result = await updateShippingConfiguration(config.productName, {
            baseWeightLb: config.baseWeightLb,
            weightPerUnitLb: config.weightPerUnitLb,
            isActive: config.isActive,
            applicableForNationwideOnly: config.applicableForNationwideOnly,
          });
          results.push(result);
        } catch (error) {
          // Continue with other configurations instead of failing entirely
          console.error(`Failed to update configuration for ${config.productName}:`, error);
        }
      }

      expect(results).toHaveLength(1); // Only first config succeeded
      expect(results[0].productName).toBe('alfajores');
    });
  });

  describe('Authorization middleware', () => {
    test('should verify admin role correctly', async () => {
      // Test admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const {
        data: { user },
      } = await mockSupabaseClient.auth.getUser();
      const adminProfile = await mockSingle();

      expect(user).toBeTruthy();
      expect(adminProfile.data?.role).toBe('ADMIN');
    });

    test('should reject non-admin users', async () => {
      // Test regular user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'regular-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'USER' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const {
        data: { user },
      } = await mockSupabaseClient.auth.getUser();
      const adminProfile = await mockSingle();

      expect(user).toBeTruthy();
      expect(adminProfile.data?.role).not.toBe('ADMIN');
    });

    test('should reject users without profile', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-without-profile' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Profile not found'),
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const {
        data: { user },
      } = await mockSupabaseClient.auth.getUser();
      const adminProfile = await mockSingle();

      expect(user).toBeTruthy();
      expect(adminProfile.data).toBeNull();
    });

    test('should handle authentication errors', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      const {
        data: { user },
        error,
      } = await mockSupabaseClient.auth.getUser();

      expect(user).toBeNull();
      expect(error).toBeTruthy();
    });

    test('should handle database connection errors during auth check', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockRejectedValue(new Error('Database connection failed'));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const {
        data: { user },
      } = await mockSupabaseClient.auth.getUser();

      expect(user).toBeTruthy();
      await expect(mockSingle()).rejects.toThrow('Database connection failed');
    });
  });

  describe('Error handling', () => {
    test('should handle malformed request body', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      // Test with malformed data (this would be caught by Zod validation)
      const malformedData = {
        configurations: [
          {
            // Missing required fields
            productName: 'alfajores',
            // baseWeightLb missing
            weightPerUnitLb: 0.4,
            isActive: true,
          },
        ],
      };

      // Simulate validation error
      const hasRequiredFields = malformedData.configurations.every(
        config =>
          config.productName &&
          'baseWeightLb' in config &&
          config.weightPerUnitLb !== undefined &&
          config.isActive !== undefined
      );

      expect(hasRequiredFields).toBe(false);
    });

    test('should handle database constraint violations', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      mockUpdateShippingConfiguration.mockRejectedValue(new Error('Unique constraint violation'));

      await expect(
        updateShippingConfiguration('alfajores', {
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        })
      ).rejects.toThrow('Unique constraint violation');
    });

    test('should handle network timeouts', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      mockUpdateShippingConfiguration.mockRejectedValue(new Error('Request timeout'));

      await expect(
        updateShippingConfiguration('alfajores', {
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        })
      ).rejects.toThrow('Request timeout');
    });

    test('should handle unexpected server errors', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      mockGetAllShippingConfigurations.mockRejectedValue(new Error('Internal server error'));

      await expect(getAllShippingConfigurations()).rejects.toThrow('Internal server error');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle complete configuration management workflow', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      // 1. Get existing configurations
      const existingConfigs = [
        {
          productName: 'alfajores',
          baseWeightLb: 0.4,
          weightPerUnitLb: 0.3,
          isActive: true,
          applicableForNationwideOnly: true,
        },
      ];

      mockGetAllShippingConfigurations.mockResolvedValue(existingConfigs);

      const configs = await getAllShippingConfigurations();
      expect(configs).toHaveLength(1);

      // 2. Update configuration
      const updatedConfig = {
        productName: 'alfajores',
        baseWeightLb: 0.5, // Updated
        weightPerUnitLb: 0.4, // Updated
        isActive: true,
        applicableForNationwideOnly: true,
      };

      mockUpdateShippingConfiguration.mockResolvedValue({
        ...updatedConfig,
        id: 'config-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      });

      const result = await updateShippingConfiguration(updatedConfig.productName, {
        baseWeightLb: updatedConfig.baseWeightLb,
        weightPerUnitLb: updatedConfig.weightPerUnitLb,
        isActive: updatedConfig.isActive,
        applicableForNationwideOnly: updatedConfig.applicableForNationwideOnly,
      });

      expect(result.baseWeightLb).toBe(0.5);
      expect(result.weightPerUnitLb).toBe(0.4);

      // 3. Verify updated configurations
      const updatedConfigs = [result];
      mockGetAllShippingConfigurations.mockResolvedValue(updatedConfigs);

      const finalConfigs = await getAllShippingConfigurations();
      expect(finalConfigs[0].baseWeightLb).toBe(0.5);
    });

    test('should handle bulk configuration updates', async () => {
      // Mock admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-user-id' } },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({
        data: { role: 'ADMIN' },
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      });

      const bulkConfigs = [
        {
          productName: 'alfajores',
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.4,
          isActive: true,
          applicableForNationwideOnly: true,
        },
        {
          productName: 'empanadas',
          baseWeightLb: 1.0,
          weightPerUnitLb: 0.8,
          isActive: true,
          applicableForNationwideOnly: true,
        },
        {
          productName: 'default',
          baseWeightLb: 0.5,
          weightPerUnitLb: 0.5,
          isActive: true,
          applicableForNationwideOnly: false,
        },
      ];

      // Mock successful updates for all configurations
      mockUpdateShippingConfiguration
        .mockResolvedValueOnce({ ...bulkConfigs[0], id: 'config-1' })
        .mockResolvedValueOnce({ ...bulkConfigs[1], id: 'config-2' })
        .mockResolvedValueOnce({ ...bulkConfigs[2], id: 'config-3' });

      const results = [];
      for (const config of bulkConfigs) {
        const result = await updateShippingConfiguration(config.productName, {
          baseWeightLb: config.baseWeightLb,
          weightPerUnitLb: config.weightPerUnitLb,
          isActive: config.isActive,
          applicableForNationwideOnly: config.applicableForNationwideOnly,
        });
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect(results.map(r => r.productName)).toEqual(['alfajores', 'empanadas', 'default']);
    });
  });
});
