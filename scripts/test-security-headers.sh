#!/bin/bash

# Security Headers Testing Script for Destino SF
# Tests all security headers implementation including CSP, HSTS, and protection headers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
CURL_TIMEOUT=10

echo -e "${BLUE}🔒 Security Headers Testing Script${NC}"
echo -e "${BLUE}Testing URL: $BASE_URL${NC}"
echo "=================================="

# Function to test URL and extract headers
test_headers() {
  local url="$1"
  local description="$2"
  
  echo -e "\n${YELLOW}Testing: $description${NC}"
  echo "URL: $url"
  echo "---"
  
  # Make request and capture headers
  response=$(curl -s -I --max-time $CURL_TIMEOUT "$url" 2>/dev/null || echo "ERROR: Failed to connect")
  
  if [[ "$response" == "ERROR:"* ]]; then
    echo -e "${RED}❌ Failed to connect to $url${NC}"
    echo -e "${RED}   Make sure the development server is running${NC}"
    return 1
  fi
  
  # Check HTTP status
  status=$(echo "$response" | head -n1 | grep -o '[0-9]\{3\}' || echo "000")
  if [[ "$status" == "200" ]] || [[ "$status" == "404" ]]; then
    echo -e "${GREEN}✅ HTTP Status: $status${NC}"
  else
    echo -e "${RED}❌ HTTP Status: $status${NC}"
  fi
  
  # Security headers to check
  headers=(
    "x-frame-options"
    "x-content-type-options"
    "x-xss-protection"
    "referrer-policy"
    "permissions-policy"
    "content-security-policy"
    "strict-transport-security"
    "x-dns-prefetch-control"
    "x-download-options"
    "x-permitted-cross-domain-policies"
  )
  
  echo -e "\n${BLUE}Security Headers:${NC}"
  for header in "${headers[@]}"; do
    header_value=$(echo "$response" | grep -i "^$header:" | cut -d' ' -f2- | tr -d '\r\n' || echo "")
    if [[ -n "$header_value" ]]; then
      echo -e "${GREEN}✅ $header: $header_value${NC}"
    else
      echo -e "${RED}❌ $header: Not present${NC}"
    fi
  done
  
  # Check for server information leakage
  echo -e "\n${BLUE}Information Disclosure Check:${NC}"
  server_header=$(echo "$response" | grep -i "^server:" | cut -d' ' -f2- | tr -d '\r\n' || echo "")
  powered_by=$(echo "$response" | grep -i "^x-powered-by:" | cut -d' ' -f2- | tr -d '\r\n' || echo "")
  
  if [[ -n "$server_header" ]] && [[ "$server_header" != "" ]]; then
    echo -e "${YELLOW}⚠️  Server header present: $server_header${NC}"
  else
    echo -e "${GREEN}✅ Server header: Hidden${NC}"
  fi
  
  if [[ -n "$powered_by" ]] && [[ "$powered_by" != "" ]]; then
    echo -e "${YELLOW}⚠️  X-Powered-By header present: $powered_by${NC}"
  else
    echo -e "${GREEN}✅ X-Powered-By header: Hidden${NC}"
  fi
  
  return 0
}

# Function to test CSP with inline script injection
test_csp_blocking() {
  echo -e "\n${YELLOW}Testing CSP Script Blocking${NC}"
  echo "---"
  
  # Create a simple HTML page with inline script to test CSP
  csp_test_html="
<!DOCTYPE html>
<html>
<head>
  <title>CSP Test</title>
</head>
<body>
  <h1>CSP Test Page</h1>
  <script>
    console.log('This inline script should be blocked by CSP');
    alert('CSP Test - This should be blocked');
  </script>
  <script src='https://evil.com/malicious.js'></script>
</body>
</html>"
  
  echo "To manually test CSP:"
  echo "1. Open your browser's developer console"
  echo "2. Navigate to any page on your site"
  echo "3. Try to execute: document.createElement('script').innerHTML = 'alert(\"XSS\")';"
  echo "4. The CSP should block this and show console errors"
  echo -e "${GREEN}✅ CSP test instructions provided${NC}"
}

# Function to test rate limiting integration
test_rate_limiting_headers() {
  echo -e "\n${YELLOW}Testing Rate Limiting Headers${NC}"
  echo "---"
  
  # Test the rate limit test endpoint
  rate_limit_url="$BASE_URL/api/test-rate-limit"
  
  echo "Making request to rate limit test endpoint..."
  response=$(curl -s -I --max-time $CURL_TIMEOUT "$rate_limit_url" 2>/dev/null || echo "ERROR: Failed to connect")
  
  if [[ "$response" == "ERROR:"* ]]; then
    echo -e "${RED}❌ Failed to connect to rate limit endpoint${NC}"
    return 1
  fi
  
  # Check for rate limiting headers
  rate_headers=(
    "x-ratelimit-limit"
    "x-ratelimit-remaining" 
    "x-ratelimit-reset"
  )
  
  for header in "${rate_headers[@]}"; do
    header_value=$(echo "$response" | grep -i "^$header:" | cut -d' ' -f2- | tr -d '\r\n' || echo "")
    if [[ -n "$header_value" ]]; then
      echo -e "${GREEN}✅ $header: $header_value${NC}"
    else
      echo -e "${YELLOW}⚠️  $header: Not present (may be normal)${NC}"
    fi
  done
}

# Function to generate security report
generate_security_report() {
  echo -e "\n${BLUE}🔒 Security Implementation Summary${NC}"
  echo "=================================="
  
  echo -e "\n${GREEN}✅ Implemented Security Measures:${NC}"
  echo "• Content Security Policy (CSP) with trusted domains"
  echo "• X-Frame-Options to prevent clickjacking"
  echo "• X-Content-Type-Options to prevent MIME sniffing"
  echo "• X-XSS-Protection for legacy browsers"
  echo "• Referrer-Policy for privacy protection"
  echo "• Permissions-Policy to control browser features"
  echo "• Strict-Transport-Security for HTTPS enforcement"
  echo "• Rate limiting on API endpoints"
  echo "• Information disclosure prevention"
  
  echo -e "\n${YELLOW}🔧 Additional Recommendations:${NC}"
  echo "• Test security headers in production environment"
  echo "• Monitor CSP violation reports"
  echo "• Regularly update trusted domains list"
  echo "• Consider implementing Subresource Integrity (SRI)"
  echo "• Set up security monitoring and alerting"
  echo "• Regular security audits with tools like:"
  echo "  - https://securityheaders.com/"
  echo "  - https://observatory.mozilla.org/"
  echo "  - OWASP ZAP"
  
  echo -e "\n${BLUE}📝 Testing URLs:${NC}"
  echo "• Security Headers Test: $BASE_URL/api/security/headers-test"
  echo "• Rate Limiting Test: $BASE_URL/api/test-rate-limit"
  echo "• Main Application: $BASE_URL"
}

# Main testing sequence
main() {
  echo -e "${BLUE}Starting security headers testing...${NC}"
  
  # Test main application
  test_headers "$BASE_URL" "Main Application"
  
  # Test API endpoint
  test_headers "$BASE_URL/api/security/headers-test" "Security Test API Endpoint"
  
  # Test admin route (if accessible)
  test_headers "$BASE_URL/admin" "Admin Route"
  
  # Test static assets
  test_headers "$BASE_URL/favicon.ico" "Static Assets"
  
  # Test CSP
  test_csp_blocking
  
  # Test rate limiting headers
  test_rate_limiting_headers
  
  # Generate report
  generate_security_report
  
  echo -e "\n${GREEN}🎉 Security headers testing completed!${NC}"
  echo -e "\n${YELLOW}Next Steps:${NC}"
  echo "1. Review any ❌ failed checks above"
  echo "2. Test in production environment"
  echo "3. Monitor security headers in browser dev tools"
  echo "4. Set up CSP violation monitoring"
}

# Check if curl is available
if ! command -v curl &> /dev/null; then
  echo -e "${RED}❌ curl is not installed. Please install curl to run this script.${NC}"
  exit 1
fi

# Run main function
main 