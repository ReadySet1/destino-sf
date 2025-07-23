/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/products/route';
import { prisma } from '@/lib/db';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/products - GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return products with default parameters', async () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: false,
        active: true,
        slug: 'test-product',
        variants: [],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProducts);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { active: true },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: false,
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: undefined,
      take: undefined,
    });
  });

  it('should handle includeVariants parameter', async () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: false,
        active: true,
        slug: 'test-product',
        variants: [
          {
            id: 'variant-1',
            name: 'Large',
            price: 15.99,
            squareVariantId: 'square-variant-1',
          },
        ],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const request = new NextRequest('http://localhost:3000/api/products?includeVariants=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProducts);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { active: true },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            price: true,
          }),
        }),
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: undefined,
      take: undefined,
    });
  });

  it('should handle onlyActive parameter', async () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: false,
        active: false,
        slug: 'test-product',
        variants: [],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const request = new NextRequest('http://localhost:3000/api/products?onlyActive=false');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProducts);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: {},
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: false,
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: undefined,
      take: undefined,
    });
  });

  it('should handle categoryId parameter', async () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: false,
        active: true,
        slug: 'test-product',
        variants: [],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const request = new NextRequest('http://localhost:3000/api/products?categoryId=category-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProducts);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { active: true, categoryId: 'category-1' },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: false,
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: undefined,
      take: undefined,
    });
  });

  it('should handle featured parameter', async () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: true,
        active: true,
        slug: 'test-product',
        variants: [],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const request = new NextRequest('http://localhost:3000/api/products?featured=true');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProducts);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { active: true, featured: true },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: false,
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: undefined,
      take: undefined,
    });
  });

  it('should handle exclude parameter', async () => {
    const mockProducts = [
      {
        id: 'product-2',
        name: 'Test Product 2',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: false,
        active: true,
        slug: 'test-product-2',
        variants: [],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const request = new NextRequest('http://localhost:3000/api/products?exclude=product-1');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProducts);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { active: true, NOT: { id: 'product-1' } },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: false,
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: undefined,
      take: undefined,
    });
  });

  it('should handle search parameter', async () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: false,
        active: true,
        slug: 'test-product',
        variants: [],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const request = new NextRequest('http://localhost:3000/api/products?search=test');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProducts);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        OR: [
          {
            name: {
              contains: 'test',
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: 'test',
              mode: 'insensitive',
            },
          },
          {
            category: {
              name: {
                contains: 'test',
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: false,
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: undefined,
      take: undefined,
    });
  });

  it('should handle pagination with includePagination', async () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: false,
        active: true,
        slug: 'test-product',
        variants: [],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
    (mockPrisma.product.count as jest.Mock).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/products?includePagination=true&page=2&limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockProducts);
    expect(data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: true,
    });
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { active: true },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: false,
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: 10,
      take: 10,
    });
  });

  it('should handle limit parameter without pagination', async () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: false,
        active: true,
        slug: 'test-product',
        variants: [],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const request = new NextRequest('http://localhost:3000/api/products?limit=5');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProducts);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: { active: true },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: false,
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: undefined,
      take: 5,
    });
  });

  it('should handle database errors gracefully', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch products');
  });

  it('should handle complex query with multiple parameters', async () => {
    const mockProducts = [
      {
        id: 'product-1',
        name: 'Test Product',
        description: 'Test description',
        price: 12.99,
        images: ['/test-image.jpg'],
        categoryId: 'category-1',
        category: { name: 'Test Category' },
        squareId: 'square-1',
        featured: true,
        active: true,
        slug: 'test-product',
        variants: [],
      },
    ];

    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);

    const request = new NextRequest(
      'http://localhost:3000/api/products?categoryId=category-1&featured=true&search=test&exclude=product-2&includeVariants=true'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockProducts);
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
      where: {
        active: true,
        categoryId: 'category-1',
        featured: true,
        NOT: { id: 'product-2' },
        OR: [
          {
            name: {
              contains: 'test',
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: 'test',
              mode: 'insensitive',
            },
          },
          {
            category: {
              name: {
                contains: 'test',
                mode: 'insensitive',
              },
            },
          },
        ],
      },
      select: expect.objectContaining({
        id: true,
        name: true,
        description: true,
        price: true,
        images: true,
        slug: true,
        categoryId: true,
        featured: true,
        active: true,
        variants: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            price: true,
          }),
        }),
        category: expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            name: true,
            slug: true,
          }),
        }),
      }),
      orderBy: { name: 'asc' },
      skip: undefined,
      take: undefined,
    });
  });

  it('should return empty array when no products found', async () => {
    (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
  });
}); 