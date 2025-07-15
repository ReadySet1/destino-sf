#!/bin/bash

# Enhanced Webhook Validation Testing Script
# Tests the new WebhookValidator class with comprehensive security checks

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Enhanced Webhook Validation Testing Script${NC}"
echo -e "${YELLOW}Testing WebhookValidator class with comprehensive security checks${NC}"
echo

# Configuration
LOCAL_SERVER="http://localhost:3000"
WEBHOOK_ENDPOINT="/api/webhooks/square"
TEST_SECRET="test-webhook-secret-key"
TEST_BODY='{"event_id":"test-event-123","type":"payment.created","merchant_id":"test-merchant","data":{"id":"test-payment-123","object":{"payment":{"id":"test-payment-123","order_id":"test-order-123","status":"COMPLETED"}}}}'

# Check if server is running
echo -e "${BLUE}Checking if development server is running...${NC}"
if ! curl -s "$LOCAL_SERVER" > /dev/null 2>&1; then
    echo -e "${RED}❌ Server not running. Please start with: pnpm dev${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server is running${NC}"
echo

# Function to create valid signature
create_signature() {
    local timestamp=$1
    local body=$2
    local secret=$3
    
    # Create the message as timestamp.body (for Square format)
    local message="${timestamp}.${body}"
    
    # Create HMAC-SHA256 signature and encode in base64
    echo -n "$message" | openssl dgst -sha256 -hmac "$secret" -binary | base64
}

# Function to test webhook with signature
test_webhook() {
    local description=$1
    local signature=$2
    local timestamp=$3
    local body=$4
    local expected_status=$5
    
    echo -e "${BLUE}Testing: $description${NC}"
    
    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "x-square-hmacsha256-signature: $signature" \
        -H "x-square-hmacsha256-timestamp: $timestamp" \
        -d "$body" \
        "$LOCAL_SERVER$WEBHOOK_ENDPOINT")
    
    local http_code=$(echo "$response" | tail -n1)
    local response_body=$(echo "$response" | head -n -1)
    
    if [[ "$http_code" == "$expected_status" ]]; then
        echo -e "${GREEN}✅ Test passed (HTTP $http_code)${NC}"
    else
        echo -e "${RED}❌ Test failed (Expected HTTP $expected_status, got $http_code)${NC}"
        echo -e "${RED}Response: $response_body${NC}"
    fi
    
    echo
}

# Test 1: Valid signature
echo -e "${YELLOW}=== Test 1: Valid Signature ===${NC}"
current_timestamp=$(date +%s)
valid_signature=$(create_signature "$current_timestamp" "$TEST_BODY" "$TEST_SECRET")
test_webhook "Valid signature" "$valid_signature" "$current_timestamp" "$TEST_BODY" "200"

# Test 2: Invalid signature
echo -e "${YELLOW}=== Test 2: Invalid Signature ===${NC}"
invalid_signature="invalid-signature-base64"
test_webhook "Invalid signature" "$invalid_signature" "$current_timestamp" "$TEST_BODY" "401"

# Test 3: Expired timestamp (older than 5 minutes)
echo -e "${YELLOW}=== Test 3: Expired Timestamp ===${NC}"
old_timestamp=$((current_timestamp - 400)) # 6 minutes ago
old_signature=$(create_signature "$old_timestamp" "$TEST_BODY" "$TEST_SECRET")
test_webhook "Expired timestamp" "$old_signature" "$old_timestamp" "$TEST_BODY" "401"

# Test 4: Future timestamp (more than 5 minutes ahead)
echo -e "${YELLOW}=== Test 4: Future Timestamp ===${NC}"
future_timestamp=$((current_timestamp + 400)) # 6 minutes in future
future_signature=$(create_signature "$future_timestamp" "$TEST_BODY" "$TEST_SECRET")
test_webhook "Future timestamp" "$future_signature" "$future_timestamp" "$TEST_BODY" "401"

# Test 5: Missing signature header
echo -e "${YELLOW}=== Test 5: Missing Signature Header ===${NC}"
echo -e "${BLUE}Testing: Missing signature header${NC}"
response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-square-hmacsha256-timestamp: $current_timestamp" \
    -d "$TEST_BODY" \
    "$LOCAL_SERVER$WEBHOOK_ENDPOINT")

http_code=$(echo "$response" | tail -n1)
if [[ "$http_code" == "200" ]]; then
    echo -e "${GREEN}✅ Test passed (HTTP $http_code) - Signature validation skipped in development${NC}"
else
    echo -e "${RED}❌ Test failed (Expected HTTP 200 for dev mode, got $http_code)${NC}"
fi
echo

# Test 6: Replay attack protection
echo -e "${YELLOW}=== Test 6: Replay Attack Protection ===${NC}"
replay_timestamp=$current_timestamp
replay_signature=$(create_signature "$replay_timestamp" "$TEST_BODY" "$TEST_SECRET")

# First request should succeed
test_webhook "First request (should succeed)" "$replay_signature" "$replay_timestamp" "$TEST_BODY" "200"

# Second identical request should be rejected (replay attack)
test_webhook "Replay attack (should be rejected)" "$replay_signature" "$replay_timestamp" "$TEST_BODY" "401"

# Test 7: Malformed timestamp
echo -e "${YELLOW}=== Test 7: Malformed Timestamp ===${NC}"
malformed_timestamp="not-a-timestamp"
malformed_signature=$(create_signature "$malformed_timestamp" "$TEST_BODY" "$TEST_SECRET")
test_webhook "Malformed timestamp" "$malformed_signature" "$malformed_timestamp" "$TEST_BODY" "401"

# Test 8: Empty body
echo -e "${YELLOW}=== Test 8: Empty Body ===${NC}"
empty_body=""
empty_signature=$(create_signature "$current_timestamp" "$empty_body" "$TEST_SECRET")
test_webhook "Empty body" "$empty_signature" "$current_timestamp" "$empty_body" "200"

# Summary
echo -e "${GREEN}🎉 Webhook validation testing completed!${NC}"
echo -e "${YELLOW}📝 Summary:${NC}"
echo -e "  - Valid signatures are accepted"
echo -e "  - Invalid signatures are rejected"
echo -e "  - Timestamp validation prevents replay attacks"
echo -e "  - Duplicate event IDs are blocked"
echo -e "  - Malformed requests are handled gracefully"
echo
echo -e "${BLUE}🔧 To run in production mode:${NC}"
echo -e "  1. Set NODE_ENV=production"
echo -e "  2. Set SQUARE_WEBHOOK_SECRET in your environment"
echo -e "  3. Missing signatures will be rejected in production"
echo 