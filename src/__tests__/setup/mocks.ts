/**
 * Common mocks for external services used in testing
 */

// Square API Mocks
export const mockSquareApi = () => {
  const mockSquareClient = {
    paymentsApi: {
      createPayment: jest.fn().mockResolvedValue({
        result: {
          payment: {
            id: 'mock-payment-id',
            status: 'COMPLETED',
            amountMoney: {
              amount: 1999n,
              currency: 'USD',
            },
            sourceType: 'CARD',
          },
        },
      }),
      getPayment: jest.fn().mockResolvedValue({
        result: {
          payment: {
            id: 'mock-payment-id',
            status: 'COMPLETED',
            amountMoney: {
              amount: 1999n,
              currency: 'USD',
            },
          },
        },
      }),
    },
    ordersApi: {
      createOrder: jest.fn().mockResolvedValue({
        result: {
          order: {
            id: 'mock-square-order-id',
            locationId: 'mock-location-id',
            lineItems: [],
            totalMoney: {
              amount: 1999n,
              currency: 'USD',
            },
            state: 'OPEN',
          },
        },
      }),
      updateOrder: jest.fn().mockResolvedValue({
        result: {
          order: {
            id: 'mock-square-order-id',
            state: 'COMPLETED',
          },
        },
      }),
    },
    catalogApi: {
      listCatalog: jest.fn().mockResolvedValue({
        result: {
          objects: [
            {
              type: 'ITEM',
              id: 'mock-item-id',
              itemData: {
                name: 'Test Product',
                description: 'Test product description',
                variations: [
                  {
                    type: 'ITEM_VARIATION',
                    id: 'mock-variation-id',
                    itemVariationData: {
                      name: 'Regular',
                      priceMoney: {
                        amount: 1299n,
                        currency: 'USD',
                      },
                    },
                  },
                ],
              },
            },
          ],
        },
      }),
      searchCatalogObjects: jest.fn().mockResolvedValue({
        result: {
          objects: [],
        },
      }),
    },
    locationsApi: {
      listLocations: jest.fn().mockResolvedValue({
        result: {
          locations: [
            {
              id: 'mock-location-id',
              name: 'Test Location',
              address: {
                addressLine1: '123 Test St',
                locality: 'San Francisco',
                administrativeDistrictLevel1: 'CA',
                postalCode: '94102',
                country: 'US',
              },
            },
          ],
        },
      }),
    },
  };

  // Mock the entire Square module
  jest.mock('square', () => ({
    Client: jest.fn(() => mockSquareClient),
    Environment: {
      Sandbox: 'sandbox',
      Production: 'production',
    },
  }));

  return mockSquareClient;
};

// Supabase Auth Mocks
export const mockSupabaseAuth = () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      name: 'Test User',
    },
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2023-01-01T00:00:00Z',
  };

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: mockUser,
  };

  const mockAuthClient = {
    getSession: jest.fn().mockResolvedValue({
      data: { session: mockSession },
      error: null,
    }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({
      error: null,
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    }),
  };

  const mockSupabaseClient = {
    auth: mockAuthClient,
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      then: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    }),
  };

  jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockSupabaseClient),
  }));

  return { mockSupabaseClient, mockUser, mockSession };
};

// Sanity Client Mocks
export const mockSanityClient = () => {
  const mockSanityData = {
    products: [
      {
        _id: 'product-1',
        name: 'Test Alfajores',
        description: 'Delicious test alfajores',
        price: 12.99,
        images: [
          {
            asset: {
              url: 'https://example.com/alfajores.jpg',
            },
          },
        ],
        category: {
          _id: 'cat-1',
          name: 'Alfajores',
        },
      },
    ],
    categories: [
      {
        _id: 'cat-1',
        name: 'Alfajores',
        description: 'Our alfajores are buttery shortbread cookies filled with rich, velvety dulce de leche — a beloved Latin American treat made the DESTINO way. We offer a variety of flavors including classic, chocolate, gluten-free, lemon, and seasonal specialties. Each cookie is handcrafted in small batches using a family-honored recipe and premium ingredients for that perfect melt-in-your-mouth texture. Whether you\'re gifting, sharing, or treating yourself, our alfajores bring comfort, flavor, and a touch of tradition to every bite.',
      },
    ],
  };

  const mockSanityClient = {
    fetch: jest.fn().mockImplementation((query: string) => {
      if (query.includes('products')) {
        return Promise.resolve(mockSanityData.products);
      }
      if (query.includes('categories')) {
        return Promise.resolve(mockSanityData.categories);
      }
      return Promise.resolve([]);
    }),
    create: jest.fn().mockResolvedValue({
      _id: 'new-doc-id',
      _type: 'document',
    }),
    createOrReplace: jest.fn().mockResolvedValue({
      _id: 'doc-id',
      _type: 'document',
    }),
    patch: jest.fn().mockReturnValue({
      set: jest.fn().mockReturnThis(),
      commit: jest.fn().mockResolvedValue({
        _id: 'doc-id',
        _type: 'document',
      }),
    }),
    delete: jest.fn().mockResolvedValue({
      _id: 'doc-id',
    }),
  };

  jest.mock('@sanity/client', () => ({
    createClient: jest.fn(() => mockSanityClient),
  }));

  return { mockSanityClient, mockSanityData };
};

// Google Maps API Mocks
export const mockGoogleMapsApi = () => {
  const mockGoogleMaps = {
    places: {
      PlacesService: jest.fn().mockImplementation(() => ({
        findPlaceFromQuery: jest.fn((request, callback) => {
          callback(
            [
              {
                place_id: 'test-place-id',
                name: 'Test Address',
                formatted_address: '123 Test St, San Francisco, CA 94102, USA',
                geometry: {
                  location: {
                    lat: () => 37.7749,
                    lng: () => -122.4194,
                  },
                },
              },
            ],
            'OK'
          );
        }),
        getDetails: jest.fn((request, callback) => {
          callback(
            {
              place_id: 'test-place-id',
              formatted_address: '123 Test St, San Francisco, CA 94102, USA',
              geometry: {
                location: {
                  lat: () => 37.7749,
                  lng: () => -122.4194,
                },
              },
              address_components: [
                { long_name: '123', types: ['street_number'] },
                { long_name: 'Test St', types: ['route'] },
                { long_name: 'San Francisco', types: ['locality'] },
                { long_name: 'CA', types: ['administrative_area_level_1'] },
                { long_name: '94102', types: ['postal_code'] },
                { long_name: 'US', types: ['country'] },
              ],
            },
            'OK'
          );
        }),
      })),
    },
    geometry: {
      spherical: {
        computeDistanceBetween: jest.fn().mockReturnValue(1000), // 1km
      },
    },
    DistanceMatrixService: jest.fn().mockImplementation(() => ({
      getDistanceMatrix: jest.fn((request, callback) => {
        callback(
          {
            rows: [
              {
                elements: [
                  {
                    distance: { text: '1.0 km', value: 1000 },
                    duration: { text: '5 mins', value: 300 },
                    status: 'OK',
                  },
                ],
              },
            ],
          },
          'OK'
        );
      }),
    })),
  };

  // Mock Google Maps loader
  jest.mock('@googlemaps/js-api-loader', () => ({
    Loader: jest.fn().mockImplementation(() => ({
      load: jest.fn().mockResolvedValue(mockGoogleMaps),
    })),
  }));

  return mockGoogleMaps;
};

// Email Service Mocks (Resend)
export const mockEmailService = () => {
  const mockResend = {
    emails: {
      send: jest.fn().mockResolvedValue({
        id: 'mock-email-id',
        from: 'noreply@destino-sf.com',
        to: ['customer@example.com'],
        subject: 'Order Confirmation',
        created_at: new Date().toISOString(),
      }),
    },
  };

  jest.mock('resend', () => ({
    Resend: jest.fn(() => mockResend),
  }));

  return mockResend;
};

// Next.js Router Mocks
export const mockNextRouter = () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    reload: jest.fn(),
    route: '/',
    pathname: '/',
    query: {},
    asPath: '/',
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
  };

  jest.mock('next/router', () => ({
    useRouter: () => mockRouter,
  }));

  jest.mock('next/navigation', () => ({
    useRouter: () => mockRouter,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
    useParams: () => ({}),
  }));

  return mockRouter;
};

// Comprehensive mock setup for all services
export const setupAllMocks = () => {
  const square = mockSquareApi();
  const supabase = mockSupabaseAuth();
  const sanity = mockSanityClient();
  const maps = mockGoogleMapsApi();
  const email = mockEmailService();
  const router = mockNextRouter();

  return {
    square,
    supabase,
    sanity,
    maps,
    email,
    router,
  };
}; 