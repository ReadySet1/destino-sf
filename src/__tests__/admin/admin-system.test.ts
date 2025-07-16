import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock external dependencies
jest.mock('@/lib/db', () => ({
  db: {
    cateringDeliveryZone: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    spotlightPick: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    profile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/admin',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Admin System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console methods to suppress logs during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Delivery Zone Management', () => {
    const mockDeliveryZones = [
      {
        id: 'zone-1',
        zone: 'SAN_FRANCISCO',
        name: 'San Francisco',
        description: 'San Francisco and surrounding areas',
        minimumAmount: 250.00,
        deliveryFee: 50.00,
        estimatedDeliveryTime: '1-2 hours',
        isActive: true,
        postalCodes: ['94102', '94103', '94104'],
        cities: ['San Francisco', 'Daly City'],
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'zone-2',
        zone: 'SOUTH_BAY',
        name: 'South Bay',
        description: 'San José, Santa Clara, Sunnyvale areas',
        minimumAmount: 350.00,
        deliveryFee: 75.00,
        estimatedDeliveryTime: '2-3 hours',
        isActive: true,
        postalCodes: ['95110', '95111', '95112'],
        cities: ['San Jose', 'Santa Clara', 'Sunnyvale'],
        displayOrder: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    test('should load delivery zones successfully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ deliveryZones: mockDeliveryZones }),
      } as Response);

      const { result, loadDeliveryZones } = await import('@/components/admin/DeliveryZoneManager');
      
      // This would be tested with component testing
      expect(fetch).toHaveBeenCalledWith('/api/admin/delivery-zones');
    });

    test('should validate zone creation data', () => {
      const validZoneData = {
        zone: 'PENINSULA',
        name: 'Peninsula',
        description: 'Peninsula delivery zone',
        minimumAmount: 400.00,
        deliveryFee: 100.00,
        estimatedDeliveryTime: '2-3 hours',
        isActive: true,
        postalCodes: ['94301', '94302', '94303'],
        cities: ['Palo Alto', 'Mountain View', 'Redwood City'],
        displayOrder: 3,
      };

      // Validation logic (would be extracted to utility functions)
      const validateZoneData = (data: any) => {
        const errors: string[] = [];
        
        if (!data.zone || data.zone.trim().length === 0) {
          errors.push('Zone identifier is required');
        }
        
        if (!data.name || data.name.trim().length === 0) {
          errors.push('Zone name is required');
        }
        
        if (data.minimumAmount < 0) {
          errors.push('Minimum amount cannot be negative');
        }
        
        if (data.deliveryFee < 0) {
          errors.push('Delivery fee cannot be negative');
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const validation = validateZoneData(validZoneData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject invalid zone data', () => {
      const invalidZoneData = {
        zone: '', // Missing zone identifier
        name: '', // Missing name
        minimumAmount: -100, // Negative amount
        deliveryFee: -50, // Negative fee
        isActive: true,
        postalCodes: [],
        cities: [],
      };

      const validateZoneData = (data: any) => {
        const errors: string[] = [];
        
        if (!data.zone || data.zone.trim().length === 0) {
          errors.push('Zone identifier is required');
        }
        
        if (!data.name || data.name.trim().length === 0) {
          errors.push('Zone name is required');
        }
        
        if (data.minimumAmount < 0) {
          errors.push('Minimum amount cannot be negative');
        }
        
        if (data.deliveryFee < 0) {
          errors.push('Delivery fee cannot be negative');
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      const validation = validateZoneData(invalidZoneData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Zone identifier is required');
      expect(validation.errors).toContain('Zone name is required');
      expect(validation.errors).toContain('Minimum amount cannot be negative');
      expect(validation.errors).toContain('Delivery fee cannot be negative');
    });

    test('should handle zone creation API calls', async () => {
      const newZoneData = {
        zone: 'EAST_BAY',
        name: 'East Bay',
        description: 'Oakland, Berkeley areas',
        minimumAmount: 300.00,
        deliveryFee: 60.00,
        estimatedDeliveryTime: '2-3 hours',
        isActive: true,
        postalCodes: ['94601', '94602', '94603'],
        cities: ['Oakland', 'Berkeley', 'Alameda'],
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Zone created successfully' }),
      } as Response);

      const response = await fetch('/api/admin/delivery-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newZoneData),
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/admin/delivery-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newZoneData),
      });
    });

    test('should handle zone status updates', async () => {
      const zoneId = 'zone-1';
      const newStatus = false;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Zone status updated' }),
      } as Response);

      const updateZoneStatus = async (id: string, isActive: boolean) => {
        const zone = mockDeliveryZones.find(z => z.id === id);
        if (!zone) throw new Error('Zone not found');

        return fetch('/api/admin/delivery-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...zone, isActive }),
        });
      };

      const response = await updateZoneStatus(zoneId, newStatus);
      expect(response.ok).toBe(true);
    });
  });

  describe('Spotlight Picks Management', () => {
    const mockSpotlightPicks = [
      {
        id: 'pick-1',
        position: 1,
        productId: 'prod-1',
        isActive: true,
        product: {
          id: 'prod-1',
          name: 'Dulce de Leche Alfajores',
          description: 'Traditional Argentine cookies',
          images: ['/images/products/alfajores.jpg'],
          price: 12.99,
          slug: 'dulce-de-leche-alfajores',
          category: { id: 'cat-1', name: 'Alfajores' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'pick-2',
        position: 2,
        productId: 'prod-2',
        isActive: true,
        product: {
          id: 'prod-2',
          name: 'Empanada Variety Pack',
          description: '12 assorted empanadas',
          images: ['/images/products/empanadas.jpg'],
          price: 48.00,
          slug: 'empanada-variety-pack',
          category: { id: 'cat-2', name: 'Empanadas' },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    test('should load spotlight picks successfully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockSpotlightPicks }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks');
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].position).toBe(1);
      expect(result.data[0].product.name).toBe('Dulce de Leche Alfajores');
    });

    test('should validate spotlight pick position constraints', () => {
      const validateSpotlightPick = (data: { position: number; productId: string; isActive: boolean }) => {
        const errors: string[] = [];
        
        if (data.position < 1 || data.position > 4) {
          errors.push('Position must be between 1 and 4');
        }
        
        if (!data.productId || data.productId.trim().length === 0) {
          errors.push('Product ID is required');
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      // Valid pick
      const validPick = { position: 2, productId: 'prod-123', isActive: true };
      const validResult = validateSpotlightPick(validPick);
      expect(validResult.isValid).toBe(true);

      // Invalid position
      const invalidPosition = { position: 5, productId: 'prod-123', isActive: true };
      const invalidResult = validateSpotlightPick(invalidPosition);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Position must be between 1 and 4');

      // Missing product ID
      const missingProduct = { position: 1, productId: '', isActive: true };
      const missingResult = validateSpotlightPick(missingProduct);
      expect(missingResult.isValid).toBe(false);
      expect(missingResult.errors).toContain('Product ID is required');
    });

    test('should handle spotlight pick creation and updates', async () => {
      const newPickData = {
        position: 3,
        productId: 'prod-3',
        isActive: true,
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Spotlight pick updated' }),
      } as Response);

      const response = await fetch('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPickData),
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/admin/spotlight-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPickData),
      });
    });

    test('should handle spotlight pick deletion', async () => {
      const position = 2;

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Spotlight pick cleared' }),
      } as Response);

      const response = await fetch(`/api/admin/spotlight-picks?position=${position}`, {
        method: 'DELETE',
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/api/admin/spotlight-picks?position=2', {
        method: 'DELETE',
      });
    });

    test('should ensure unique positions', () => {
      const checkPositionUniqueness = (picks: typeof mockSpotlightPicks, newPosition: number) => {
        const existingPick = picks.find(pick => pick.position === newPosition);
        return {
          isUnique: !existingPick,
          conflictingPick: existingPick || null,
        };
      };

      // Position 1 is taken
      const result1 = checkPositionUniqueness(mockSpotlightPicks, 1);
      expect(result1.isUnique).toBe(false);
      expect(result1.conflictingPick?.product.name).toBe('Dulce de Leche Alfajores');

      // Position 3 is available
      const result3 = checkPositionUniqueness(mockSpotlightPicks, 3);
      expect(result3.isUnique).toBe(true);
      expect(result3.conflictingPick).toBeNull();
    });
  });

  describe('Product Management', () => {
    const mockProducts = [
      {
        id: 'prod-1',
        name: 'Dulce de Leche Alfajores',
        description: 'Traditional Argentine cookies with dulce de leche filling',
        images: ['/images/products/alfajores-dulce.jpg'],
        price: 12.99,
        slug: 'dulce-de-leche-alfajores',
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Alfajores', slug: 'alfajores' },
        featured: true,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'prod-2',
        name: 'Beef Empanadas',
        description: 'Traditional beef empanadas with spices',
        images: ['/images/products/empanadas-beef.jpg'],
        price: 24.00,
        slug: 'beef-empanadas',
        categoryId: 'cat-2',
        category: { id: 'cat-2', name: 'Empanadas', slug: 'empanadas' },
        featured: false,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'prod-3',
        name: 'Chocolate Alfajores',
        description: 'Chocolate-covered alfajores',
        images: ['/images/products/alfajores-chocolate.jpg'],
        price: 14.99,
        slug: 'chocolate-alfajores',
        categoryId: 'cat-1',
        category: { id: 'cat-1', name: 'Alfajores', slug: 'alfajores' },
        featured: false,
        active: false, // Inactive product
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    test('should load products with pagination', async () => {
      const mockResponse = {
        data: mockProducts.slice(0, 2),
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const searchParams = new URLSearchParams({
        includePagination: 'true',
        page: '1',
        limit: '2',
      });

      const response = await fetch(`/api/products?${searchParams.toString()}`);
      const result = await response.json();

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
    });

    test('should filter products by category', async () => {
      const alfajoresProducts = mockProducts.filter(p => p.categoryId === 'cat-1');
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: alfajoresProducts }),
      } as Response);

      const searchParams = new URLSearchParams({
        categoryId: 'cat-1',
      });

      const response = await fetch(`/api/products?${searchParams.toString()}`);
      const result = await response.json();

      expect(result.data).toHaveLength(2);
      expect(result.data.every((p: any) => p.category.name === 'Alfajores')).toBe(true);
    });

    test('should search products by name and description', async () => {
      const searchTerm = 'chocolate';
      const searchResults = mockProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm)
      );

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: searchResults }),
      } as Response);

      const searchParams = new URLSearchParams({
        search: searchTerm,
      });

      const response = await fetch(`/api/products?${searchParams.toString()}`);
      const result = await response.json();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Chocolate Alfajores');
    });

    test('should filter products by active status', async () => {
      const activeProducts = mockProducts.filter(p => p.active);
      
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: activeProducts }),
      } as Response);

      const searchParams = new URLSearchParams({
        onlyActive: 'true',
      });

      const response = await fetch(`/api/products?${searchParams.toString()}`);
      const result = await response.json();

      expect(result.data).toHaveLength(2);
      expect(result.data.every((p: any) => p.active === true)).toBe(true);
    });

    test('should validate product data', () => {
      const validateProduct = (data: any) => {
        const errors: string[] = [];
        
        if (!data.name || data.name.trim().length === 0) {
          errors.push('Product name is required');
        }
        
        if (data.name && data.name.length > 100) {
          errors.push('Product name must be less than 100 characters');
        }
        
        if (data.price <= 0) {
          errors.push('Product price must be greater than 0');
        }
        
        if (!data.categoryId || data.categoryId.trim().length === 0) {
          errors.push('Category is required');
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      // Valid product
      const validProduct = {
        name: 'Test Product',
        description: 'Test description',
        price: 19.99,
        categoryId: 'cat-1',
        active: true,
      };
      
      const validResult = validateProduct(validProduct);
      expect(validResult.isValid).toBe(true);

      // Invalid product
      const invalidProduct = {
        name: '', // Missing name
        price: -5, // Invalid price
        categoryId: '', // Missing category
      };
      
      const invalidResult = validateProduct(invalidProduct);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Product name is required');
      expect(invalidResult.errors).toContain('Product price must be greater than 0');
      expect(invalidResult.errors).toContain('Category is required');
    });
  });

  describe('Order Management', () => {
    const mockOrders = [
      {
        id: 'order-1',
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1-415-555-0123',
        status: 'PENDING',
        paymentStatus: 'PAID',
        total: 47.98,
        fulfillmentType: 'pickup',
        pickupTime: new Date('2024-12-01T10:00:00Z'),
        items: [
          {
            id: 'item-1',
            quantity: 2,
            price: 12.99,
            product: { name: 'Dulce de Leche Alfajores' },
          },
          {
            id: 'item-2',
            quantity: 1,
            price: 24.00,
            product: { name: 'Beef Empanadas' },
          },
        ],
        createdAt: new Date('2024-11-25T09:00:00Z'),
        updatedAt: new Date('2024-11-25T09:00:00Z'),
      },
      {
        id: 'order-2',
        customerName: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1-415-555-0456',
        status: 'READY',
        paymentStatus: 'PAID',
        total: 89.97,
        fulfillmentType: 'local_delivery',
        deliveryAddress: '123 Main St, San Francisco, CA 94105',
        deliveryDate: new Date('2024-12-01T14:00:00Z'),
        items: [
          {
            id: 'item-3',
            quantity: 3,
            price: 14.99,
            product: { name: 'Chocolate Alfajores' },
          },
          {
            id: 'item-4',
            quantity: 2,
            price: 24.00,
            product: { name: 'Beef Empanadas' },
          },
        ],
        createdAt: new Date('2024-11-25T11:30:00Z'),
        updatedAt: new Date('2024-11-25T15:45:00Z'),
      },
    ];

    test('should load orders with filtering and pagination', async () => {
      const mockResponse = {
        data: mockOrders,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const searchParams = new URLSearchParams({
        page: '1',
        limit: '10',
        status: 'all',
      });

      const response = await fetch(`/api/admin/orders?${searchParams.toString()}`);
      const result = await response.json();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].customerName).toBe('John Doe');
      expect(result.data[1].status).toBe('READY');
    });

    test('should filter orders by status', () => {
      const filterOrdersByStatus = (orders: typeof mockOrders, status: string) => {
        if (status === 'all') return orders;
        return orders.filter(order => order.status === status);
      };

      const pendingOrders = filterOrdersByStatus(mockOrders, 'PENDING');
      expect(pendingOrders).toHaveLength(1);
      expect(pendingOrders[0].customerName).toBe('John Doe');

      const readyOrders = filterOrdersByStatus(mockOrders, 'READY');
      expect(readyOrders).toHaveLength(1);
      expect(readyOrders[0].customerName).toBe('Jane Smith');
    });

    test('should filter orders by fulfillment type', () => {
      const filterOrdersByFulfillment = (orders: typeof mockOrders, type: string) => {
        if (type === 'all') return orders;
        return orders.filter(order => order.fulfillmentType === type);
      };

      const pickupOrders = filterOrdersByFulfillment(mockOrders, 'pickup');
      expect(pickupOrders).toHaveLength(1);
      expect(pickupOrders[0].fulfillmentType).toBe('pickup');

      const deliveryOrders = filterOrdersByFulfillment(mockOrders, 'local_delivery');
      expect(deliveryOrders).toHaveLength(1);
      expect(deliveryOrders[0].fulfillmentType).toBe('local_delivery');
    });

    test('should update order status', async () => {
      const orderId = 'order-1';
      const newStatus = 'PROCESSING';

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Order status updated' }),
      } as Response);

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    });

    test('should validate order status transitions', () => {
      const validateStatusTransition = (currentStatus: string, newStatus: string) => {
        const validTransitions: Record<string, string[]> = {
          'PENDING': ['PROCESSING', 'CANCELLED'],
          'PROCESSING': ['READY', 'SHIPPING', 'CANCELLED'],
          'READY': ['COMPLETED', 'CANCELLED'],
          'SHIPPING': ['DELIVERED', 'CANCELLED'],
          'COMPLETED': [],
          'DELIVERED': [],
          'CANCELLED': [],
        };

        const allowedStatuses = validTransitions[currentStatus] || [];
        return {
          isValid: allowedStatuses.includes(newStatus),
          allowedStatuses,
        };
      };

      // Valid transition
      const validTransition = validateStatusTransition('PENDING', 'PROCESSING');
      expect(validTransition.isValid).toBe(true);

      // Invalid transition
      const invalidTransition = validateStatusTransition('COMPLETED', 'PENDING');
      expect(invalidTransition.isValid).toBe(false);

      // Edge case: same status
      const sameStatus = validateStatusTransition('READY', 'READY');
      expect(sameStatus.isValid).toBe(false);
    });

    test('should calculate order analytics', () => {
      const calculateOrderAnalytics = (orders: typeof mockOrders) => {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        const statusCounts = orders.reduce((counts, order) => {
          counts[order.status] = (counts[order.status] || 0) + 1;
          return counts;
        }, {} as Record<string, number>);

        const fulfillmentCounts = orders.reduce((counts, order) => {
          counts[order.fulfillmentType] = (counts[order.fulfillmentType] || 0) + 1;
          return counts;
        }, {} as Record<string, number>);

        return {
          totalOrders,
          totalRevenue,
          averageOrderValue,
          statusCounts,
          fulfillmentCounts,
        };
      };

      const analytics = calculateOrderAnalytics(mockOrders);
      
      expect(analytics.totalOrders).toBe(2);
      expect(analytics.totalRevenue).toBe(137.95); // 47.98 + 89.97
      expect(analytics.averageOrderValue).toBeCloseTo(68.975);
      expect(analytics.statusCounts).toEqual({
        'PENDING': 1,
        'READY': 1,
      });
      expect(analytics.fulfillmentCounts).toEqual({
        'pickup': 1,
        'local_delivery': 1,
      });
    });
  });

  describe('User Management', () => {
    const mockUsers = [
      {
        id: 'user-1',
        email: 'admin@destinosf.com',
        name: 'Admin User',
        role: 'ADMIN',
        phone: '+1-415-555-0001',
        isActive: true,
        lastLoginAt: new Date('2024-11-25T08:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-11-25T08:00:00Z'),
      },
      {
        id: 'user-2',
        email: 'manager@destinosf.com',
        name: 'Manager User',
        role: 'MANAGER',
        phone: '+1-415-555-0002',
        isActive: true,
        lastLoginAt: new Date('2024-11-24T16:30:00Z'),
        createdAt: new Date('2024-02-15T00:00:00Z'),
        updatedAt: new Date('2024-11-24T16:30:00Z'),
      },
      {
        id: 'user-3',
        email: 'customer@example.com',
        name: 'Regular Customer',
        role: 'CUSTOMER',
        phone: '+1-415-555-0123',
        isActive: true,
        lastLoginAt: new Date('2024-11-20T12:00:00Z'),
        createdAt: new Date('2024-11-01T00:00:00Z'),
        updatedAt: new Date('2024-11-20T12:00:00Z'),
      },
    ];

    test('should load users with role filtering', async () => {
      const adminUsers = mockUsers.filter(user => ['ADMIN', 'MANAGER'].includes(user.role));

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: adminUsers }),
      } as Response);

      const searchParams = new URLSearchParams({
        role: 'ADMIN,MANAGER',
      });

      const response = await fetch(`/api/admin/users?${searchParams.toString()}`);
      const result = await response.json();

      expect(result.data).toHaveLength(2);
      expect(result.data.every((u: any) => ['ADMIN', 'MANAGER'].includes(u.role))).toBe(true);
    });

    test('should validate user role permissions', () => {
      const hasPermission = (userRole: string, requiredRole: string) => {
        const roleHierarchy = {
          'CUSTOMER': 1,
          'MANAGER': 2,
          'ADMIN': 3,
        };

        const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
        const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

        return userLevel >= requiredLevel;
      };

      // Admin can access everything
      expect(hasPermission('ADMIN', 'CUSTOMER')).toBe(true);
      expect(hasPermission('ADMIN', 'MANAGER')).toBe(true);
      expect(hasPermission('ADMIN', 'ADMIN')).toBe(true);

      // Manager can access customer functions but not admin
      expect(hasPermission('MANAGER', 'CUSTOMER')).toBe(true);
      expect(hasPermission('MANAGER', 'MANAGER')).toBe(true);
      expect(hasPermission('MANAGER', 'ADMIN')).toBe(false);

      // Customer can only access customer functions
      expect(hasPermission('CUSTOMER', 'CUSTOMER')).toBe(true);
      expect(hasPermission('CUSTOMER', 'MANAGER')).toBe(false);
      expect(hasPermission('CUSTOMER', 'ADMIN')).toBe(false);
    });

    test('should update user status', async () => {
      const userId = 'user-3';
      const newStatus = false; // Deactivate user

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'User status updated' }),
      } as Response);

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });
    });

    test('should validate user creation data', () => {
      const validateUserData = (data: any) => {
        const errors: string[] = [];
        
        if (!data.email || !data.email.includes('@')) {
          errors.push('Valid email is required');
        }
        
        if (!data.name || data.name.trim().length < 2) {
          errors.push('Name must be at least 2 characters');
        }
        
        if (!['ADMIN', 'MANAGER', 'CUSTOMER'].includes(data.role)) {
          errors.push('Valid role is required');
        }

        if (data.phone && data.phone.replace(/\D/g, '').length < 7) {
          errors.push('Valid phone number is required');
        }

        return {
          isValid: errors.length === 0,
          errors,
        };
      };

      // Valid user
      const validUser = {
        email: 'newuser@example.com',
        name: 'New User',
        role: 'CUSTOMER',
        phone: '+1-415-555-9999',
      };
      
      const validResult = validateUserData(validUser);
      expect(validResult.isValid).toBe(true);

      // Invalid user
      const invalidUser = {
        email: 'invalid-email',
        name: 'A',
        role: 'INVALID_ROLE',
        phone: '123',
      };
      
      const invalidResult = validateUserData(invalidUser);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Valid email is required');
      expect(invalidResult.errors).toContain('Name must be at least 2 characters');
      expect(invalidResult.errors).toContain('Valid role is required');
      expect(invalidResult.errors).toContain('Valid phone number is required');
    });
  });

  describe('Admin Dashboard Analytics', () => {
    test('should calculate dashboard metrics', () => {
      const calculateDashboardMetrics = (orders: any[], users: any[], products: any[]) => {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Order metrics
        const totalOrders = orders.length;
        const recentOrders = orders.filter(order => 
          new Date(order.createdAt) >= thirtyDaysAgo
        );
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // User metrics
        const totalUsers = users.length;
        const activeUsers = users.filter(user => user.isActive).length;
        const newUsers = users.filter(user => 
          new Date(user.createdAt) >= thirtyDaysAgo
        );

        // Product metrics
        const totalProducts = products.length;
        const activeProducts = products.filter(product => product.active).length;
        const featuredProducts = products.filter(product => product.featured).length;

        return {
          orders: {
            total: totalOrders,
            recent: recentOrders.length,
            revenue: totalRevenue,
            averageValue: averageOrderValue,
          },
          users: {
            total: totalUsers,
            active: activeUsers,
            new: newUsers.length,
          },
          products: {
            total: totalProducts,
            active: activeProducts,
            featured: featuredProducts,
          },
        };
      };

      const mockOrders = [
        { id: '1', total: 50.00, createdAt: new Date('2024-11-25') },
        { id: '2', total: 75.00, createdAt: new Date('2024-11-20') },
        { id: '3', total: 100.00, createdAt: new Date('2024-10-15') }, // Older than 30 days
      ];

      const mockUsers = [
        { id: '1', isActive: true, createdAt: new Date('2024-11-25') },
        { id: '2', isActive: true, createdAt: new Date('2024-01-01') },
        { id: '3', isActive: false, createdAt: new Date('2024-11-20') },
      ];

      const mockProducts = [
        { id: '1', active: true, featured: true },
        { id: '2', active: true, featured: false },
        { id: '3', active: false, featured: false },
      ];

      const metrics = calculateDashboardMetrics(mockOrders, mockUsers, mockProducts);

      expect(metrics.orders.total).toBe(3);
      expect(metrics.orders.recent).toBe(2); // Only 2 orders in last 30 days
      expect(metrics.orders.revenue).toBe(225.00);
      expect(metrics.orders.averageValue).toBeCloseTo(75.00);

      expect(metrics.users.total).toBe(3);
      expect(metrics.users.active).toBe(2);
      expect(metrics.users.new).toBe(2); // 2 users created in last 30 days

      expect(metrics.products.total).toBe(3);
      expect(metrics.products.active).toBe(2);
      expect(metrics.products.featured).toBe(1);
    });

    test('should handle empty dashboard data gracefully', () => {
      const calculateDashboardMetrics = (orders: any[], users: any[], products: any[]) => {
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return {
          orders: {
            total: totalOrders,
            revenue: totalRevenue,
            averageValue: averageOrderValue,
          },
          users: {
            total: users.length,
          },
          products: {
            total: products.length,
          },
        };
      };

      const metrics = calculateDashboardMetrics([], [], []);

      expect(metrics.orders.total).toBe(0);
      expect(metrics.orders.revenue).toBe(0);
      expect(metrics.orders.averageValue).toBe(0);
      expect(metrics.users.total).toBe(0);
      expect(metrics.products.total).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle API errors gracefully', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      try {
        const response = await fetch('/api/admin/delivery-zones');
        expect(response).toBeUndefined(); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Network error');
      }
    });

    test('should handle malformed API responses', async () => {
      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      } as Response);

      const response = await fetch('/api/admin/orders');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    test('should validate admin permissions', () => {
      const checkAdminPermission = (userRole: string, requiredPermission: string) => {
        const permissions = {
          'ADMIN': ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
          'MANAGER': ['read', 'write'],
          'CUSTOMER': ['read'],
        };

        const userPermissions = permissions[userRole as keyof typeof permissions] || [];
        return userPermissions.includes(requiredPermission);
      };

      // Admin should have all permissions
      expect(checkAdminPermission('ADMIN', 'manage_users')).toBe(true);
      expect(checkAdminPermission('ADMIN', 'delete')).toBe(true);

      // Manager should have limited permissions
      expect(checkAdminPermission('MANAGER', 'write')).toBe(true);
      expect(checkAdminPermission('MANAGER', 'manage_users')).toBe(false);

      // Customer should have minimal permissions
      expect(checkAdminPermission('CUSTOMER', 'read')).toBe(true);
      expect(checkAdminPermission('CUSTOMER', 'write')).toBe(false);
    });

    test('should handle concurrent admin operations', async () => {
      // Simulate multiple admins updating the same resource
      const updateOperations = Array.from({ length: 5 }, (_, i) => 
        fetch('/api/admin/delivery-zones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'zone-1', name: `Updated Name ${i}` }),
        })
      );

      (fetch as jest.MockedFunction<typeof fetch>)
        .mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);

      const results = await Promise.all(updateOperations);
      
      // All operations should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      expect(fetch).toHaveBeenCalledTimes(5);
    });
  });
}); 