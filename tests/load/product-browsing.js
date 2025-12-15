import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const productListDuration = new Trend('product_list_duration');
const categoryListDuration = new Trend('category_list_duration');
const productByCategoryDuration = new Trend('product_by_category_duration');

// Test configuration per DES-64 requirements:
// - 100 concurrent users
// - Average response time < 500ms
// - 95th percentile < 1000ms
// - Error rate < 1%
export let options = {
  stages: [
    { duration: '30s', target: 25 },   // Ramp up to 25 users
    { duration: '1m', target: 50 },    // Ramp up to 50 users
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '3m', target: 100 },   // Stay at 100 users for 3 minutes
    { duration: '1m', target: 50 },    // Ramp down to 50 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['avg<500', 'p(95)<1000'], // Average < 500ms, 95th percentile < 1000ms
    http_req_failed: ['rate<0.01'],               // Error rate < 1%
    errors: ['rate<0.01'],                        // Custom error rate < 1%
    http_reqs: ['rate>50'],                       // Must handle more than 50 requests per second
    product_list_duration: ['avg<500', 'p(95)<1000'],
    category_list_duration: ['avg<300', 'p(95)<500'],
    product_by_category_duration: ['avg<500', 'p(95)<1000'],
  },
};

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Simulated category IDs - these will be populated during setup
let categoryIds = [];

export function setup() {
  console.log(`Starting product browsing load test against ${BASE_URL}`);

  // Fetch categories to use in tests
  const categoriesResponse = http.get(`${BASE_URL}/api/categories`);

  if (categoriesResponse.status === 200) {
    try {
      const data = JSON.parse(categoriesResponse.body);
      // Handle both array response and { categories: [...] } response
      const categories = Array.isArray(data) ? data : (data.categories || []);
      categoryIds = categories.map(cat => cat.id).filter(Boolean);
      console.log(`Found ${categoryIds.length} categories for testing`);
    } catch (e) {
      console.log('Could not parse categories response, using fallback IDs');
      categoryIds = [];
    }
  } else {
    console.log(`Categories endpoint returned ${categoriesResponse.status}, tests will skip category-specific requests`);
  }

  return { categoryIds };
}

export default function productBrowsingTest(data) {
  const { categoryIds } = data;

  group('Product Browsing Flow', function () {
    // Scenario 1: Browse all products (most common action)
    group('Browse All Products', function () {
      const productsResponse = http.get(`${BASE_URL}/api/products`, {
        tags: { name: 'GET /api/products' },
      });

      const success = check(productsResponse, {
        'products status is 200': r => r.status === 200,
        'products response time < 500ms': r => r.timings.duration < 500,
        'products returns array or object': r => {
          try {
            const body = JSON.parse(r.body);
            return Array.isArray(body) || (body && typeof body === 'object');
          } catch {
            return false;
          }
        },
      });

      errorRate.add(!success);
      productListDuration.add(productsResponse.timings.duration);
    });

    // Scenario 2: Browse products with variants (15% of requests)
    if (Math.random() < 0.15) {
      group('Browse Products with Variants', function () {
        const response = http.get(`${BASE_URL}/api/products?includeVariants=true`, {
          tags: { name: 'GET /api/products?includeVariants=true' },
        });

        const success = check(response, {
          'products with variants status is 200': r => r.status === 200,
          'products with variants response time < 600ms': r => r.timings.duration < 600,
        });

        errorRate.add(!success);
        productListDuration.add(response.timings.duration);
      });
    }

    // Scenario 3: Get categories (20% of requests)
    if (Math.random() < 0.2) {
      group('Browse Categories', function () {
        const categoriesResponse = http.get(`${BASE_URL}/api/categories`, {
          tags: { name: 'GET /api/categories' },
        });

        const success = check(categoriesResponse, {
          'categories status is 200': r => r.status === 200,
          'categories response time < 300ms': r => r.timings.duration < 300,
          'categories returns data': r => {
            try {
              const body = JSON.parse(r.body);
              return Array.isArray(body) || (body && body.categories);
            } catch {
              return false;
            }
          },
        });

        errorRate.add(!success);
        categoryListDuration.add(categoriesResponse.timings.duration);
      });
    }

    // Scenario 4: Browse products by category (25% of requests, if categories available)
    if (Math.random() < 0.25 && categoryIds.length > 0) {
      group('Browse Products by Category', function () {
        // Pick a random category
        const randomCategoryId = categoryIds[Math.floor(Math.random() * categoryIds.length)];

        const response = http.get(`${BASE_URL}/api/products?categoryId=${randomCategoryId}`, {
          tags: { name: 'GET /api/products?categoryId' },
        });

        const success = check(response, {
          'products by category status is 200': r => r.status === 200,
          'products by category response time < 500ms': r => r.timings.duration < 500,
        });

        errorRate.add(!success);
        productByCategoryDuration.add(response.timings.duration);
      });
    }

    // Scenario 5: Search products (10% of requests)
    if (Math.random() < 0.1) {
      group('Search Products', function () {
        const searchTerms = ['empanada', 'alfajor', 'dulce', 'catering'];
        const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

        const response = http.get(`${BASE_URL}/api/products?search=${searchTerm}`, {
          tags: { name: 'GET /api/products?search' },
        });

        const success = check(response, {
          'search status is 200': r => r.status === 200,
          'search response time < 500ms': r => r.timings.duration < 500,
        });

        errorRate.add(!success);
        productListDuration.add(response.timings.duration);
      });
    }

    // Scenario 6: Paginated browsing (10% of requests)
    if (Math.random() < 0.1) {
      group('Paginated Product Browsing', function () {
        const page = Math.floor(Math.random() * 3) + 1; // Pages 1-3
        const limit = 12;

        const response = http.get(`${BASE_URL}/api/products?page=${page}&limit=${limit}`, {
          tags: { name: 'GET /api/products?page&limit' },
        });

        const success = check(response, {
          'paginated status is 200': r => r.status === 200,
          'paginated response time < 500ms': r => r.timings.duration < 500,
        });

        errorRate.add(!success);
        productListDuration.add(response.timings.duration);
      });
    }

    // Scenario 7: Browse catering products (15% of requests)
    if (Math.random() < 0.15) {
      group('Browse Catering Products', function () {
        const cateringEndpoints = [
          '/api/catering/lunch',
          '/api/catering/appetizers',
          '/api/catering/buffet',
          '/api/catering/boxed-lunches',
        ];
        const endpoint = cateringEndpoints[Math.floor(Math.random() * cateringEndpoints.length)];

        const response = http.get(`${BASE_URL}${endpoint}`, {
          tags: { name: `GET ${endpoint}` },
        });

        const success = check(response, {
          'catering status is 200': r => r.status === 200,
          'catering response time < 500ms': r => r.timings.duration < 500,
        });

        errorRate.add(!success);
        productListDuration.add(response.timings.duration);
      });
    }
  });

  // Simulate user think time between actions (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('Product browsing load test completed');
  console.log(`Tested with ${data.categoryIds.length} categories`);
}
