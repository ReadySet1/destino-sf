#!/bin/bash

echo "🔍 Testing Rate Limiting Implementation"
echo "======================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test endpoint URL (adjust if running on different port)
BASE_URL="http://localhost:3000"
TEST_ENDPOINT="$BASE_URL/api/test-rate-limit"

echo -e "\n${YELLOW}Testing GET endpoint (5 requests per minute limit)${NC}"
echo "Endpoint: $TEST_ENDPOINT"
echo ""

# Test GET requests (should allow 5, then rate limit)
for i in {1..7}; do
    echo -n "Request $i: "
    
    # Make request and capture response
    response=$(curl -s -w "%{http_code}" -o response.tmp "$TEST_ENDPOINT")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        # Extract rate limit headers
        remaining=$(curl -s -I "$TEST_ENDPOINT" | grep -i "x-ratelimit-remaining" | cut -d' ' -f2 | tr -d '\r')
        echo -e "${GREEN}✓ Success (HTTP $http_code) - Remaining: $remaining${NC}"
    elif [ "$http_code" = "429" ]; then
        # Extract retry-after header
        retry_after=$(curl -s -I "$TEST_ENDPOINT" | grep -i "retry-after" | cut -d' ' -f2 | tr -d '\r')
        echo -e "${RED}✗ Rate Limited (HTTP $http_code) - Retry after: ${retry_after}s${NC}"
    else
        echo -e "${RED}✗ Error (HTTP $http_code)${NC}"
        cat response.tmp
    fi
    
    # Small delay between requests
    sleep 0.5
done

echo -e "\n${YELLOW}Testing POST endpoint (2 requests per minute limit)${NC}"
echo ""

# Test POST requests (should allow 2, then rate limit)
for i in {1..4}; do
    echo -n "POST Request $i: "
    
    # Make POST request with JSON data
    response=$(curl -s -w "%{http_code}" -o response.tmp -X POST \
        -H "Content-Type: application/json" \
        -d '{"test": "data", "requestNumber": '$i'}' \
        "$TEST_ENDPOINT")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        remaining=$(curl -s -I -X POST \
            -H "Content-Type: application/json" \
            -d '{"test": "check"}' \
            "$TEST_ENDPOINT" | grep -i "x-ratelimit-remaining" | cut -d' ' -f2 | tr -d '\r')
        echo -e "${GREEN}✓ Success (HTTP $http_code) - Remaining: $remaining${NC}"
    elif [ "$http_code" = "429" ]; then
        retry_after=$(curl -s -I -X POST \
            -H "Content-Type: application/json" \
            -d '{"test": "check"}' \
            "$TEST_ENDPOINT" | grep -i "retry-after" | cut -d' ' -f2 | tr -d '\r')
        echo -e "${RED}✗ Rate Limited (HTTP $http_code) - Retry after: ${retry_after}s${NC}"
    else
        echo -e "${RED}✗ Error (HTTP $http_code)${NC}"
        cat response.tmp
    fi
    
    sleep 0.5
done

echo -e "\n${YELLOW}Testing rate limit headers${NC}"
echo ""

# Test a single request to check headers
echo "Making a single request to check rate limit headers:"
curl -s -i "$TEST_ENDPOINT" | grep -E "(HTTP|x-ratelimit|retry-after)" | head -5

echo -e "\n${YELLOW}Testing different IP simulation${NC}"
echo ""

# Test with different User-Agent to simulate different client
echo "Request with different User-Agent:"
curl -s -w "%{http_code}\n" \
    -H "User-Agent: RateLimitTester/1.0" \
    "$TEST_ENDPOINT" > /dev/null

echo -e "\n${GREEN}Rate limiting test completed!${NC}"
echo ""
echo "Expected behavior:"
echo "- First 5 GET requests should succeed (HTTP 200)"
echo "- 6th and 7th GET requests should be rate limited (HTTP 429)"
echo "- First 2 POST requests should succeed (HTTP 200)" 
echo "- 3rd and 4th POST requests should be rate limited (HTTP 429)"
echo "- Rate limit headers should be present in responses"

# Cleanup
rm -f response.tmp

echo -e "\n${YELLOW}To test in production with your Redis setup:${NC}"
echo "1. Make sure your .env.local contains:"
echo "   UPSTASH_REDIS_REST_URL=\"https://thorough-deer-37742.upstash.io\""
echo "   UPSTASH_REDIS_REST_TOKEN=\"AZNuAAIjcDFiYzk0OWU5OTRiZGI0ZjJjOGVkZGQ2YjMwYzFmY2NiZnAxMA\""
echo "   BYPASS_RATE_LIMIT=\"false\""
echo ""
echo "2. Run: pnpm dev"
echo "3. Execute: chmod +x test-rate-limiting.sh && ./test-rate-limiting.sh" 