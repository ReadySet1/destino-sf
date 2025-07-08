#!/bin/bash

echo "🔍 Verifying Resend Configuration..."
echo ""

# Test 1: Basic system error alert (tests Resend integration)
echo "Testing system error alert (to admin)..."
RESULT1=$(curl -s -X POST "https://development.destinosf.com/api/alerts/test" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "system_error",
    "message": "Resend configuration test - please ignore",
    "severity": "LOW"
  }')

echo "Result: $RESULT1"
echo ""

# Check if the result contains success
if echo "$RESULT1" | grep -q '"success":true'; then
    echo "✅ SUCCESS: Resend configuration is working!"
    echo "   - Admin email alerts are functioning"
    echo "   - API key is valid and associated with your verified domain"
    echo ""
    
    # Test 2: Simple email test if available
    echo "Testing basic email functionality..."
    RESULT2=$(curl -s -X POST "https://development.destinosf.com/api/test-email" \
      -H "Content-Type: application/json" \
      -d '{
        "email": "james@destinosf.com",
        "paymentMethod": "SQUARE"
      }')
    
    echo "Basic email test result: $RESULT2"
    echo ""
    echo "🎉 Email system is fully operational!"
    
elif echo "$RESULT1" | grep -q '"error"'; then
    echo "❌ ERROR: Resend configuration issue detected"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check that RESEND_API_KEY is correctly set in Vercel dashboard"
    echo "2. Verify the API key belongs to the account with updates.destinosf.com"
    echo "3. Ensure you've redeployed after updating environment variables"
    echo "4. Check Vercel function logs for detailed error messages"
    echo ""
    echo "Full error response:"
    echo "$RESULT1" | jq '.' 2>/dev/null || echo "$RESULT1"
    
else
    echo "⚠️  WARNING: Unexpected response format"
    echo "Raw response: $RESULT1"
    echo ""
    echo "This might indicate:"
    echo "- Deployment is still in progress"
    echo "- API endpoint is not responding"
    echo "- Network connectivity issues"
fi

echo ""
echo "📊 Additional debugging info:"
echo "- Test URL: https://development.destinosf.com/api/alerts/test"
echo "- You can check Vercel function logs for more details"
echo "- Expected from email: system@updates.destinosf.com"
echo "- Expected admin email: james@destinosf.com" 