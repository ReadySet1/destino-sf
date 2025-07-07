#!/bin/bash

# Catering Test Runner Script for Destino SF
# Usage: ./scripts/test-catering.sh [option]

echo "🎭 Destino SF - Catering Test Runner"
echo "======================================"

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first."
    exit 1
fi

# Function to run tests with specific options
run_test() {
    local test_command="$1"
    local description="$2"
    
    echo ""
    echo "🚀 $description"
    echo "Command: $test_command"
    echo "---------------------------------------"
    
    eval "$test_command"
    
    if [ $? -eq 0 ]; then
        echo "✅ Test completed successfully!"
    else
        echo "❌ Test failed!"
        exit 1
    fi
}

# Parse command line arguments
case "${1:-enhanced}" in
    "enhanced"|"new")
        run_test "pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts" "Running Enhanced Catering Inquiry Tests"
        ;;
    
    "original"|"old")
        run_test "pnpm exec playwright test tests/e2e/04-catering-inquiry.spec.ts" "Running Original Catering Tests"
        ;;
    
    "both"|"all")
        run_test "pnpm exec playwright test --grep \"catering\"" "Running All Catering Tests"
        ;;
    
    "ui"|"debug")
        run_test "pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts --ui" "Running Enhanced Tests with UI"
        ;;
    
    "headed"|"visible")
        run_test "pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts --headed" "Running Enhanced Tests in Headed Mode"
        ;;
    
    "single"|"main")
        run_test "pnpm exec playwright test -g \"should complete full catering inquiry flow\"" "Running Main Catering Flow Test"
        ;;
    
    "auth"|"login")
        run_test "pnpm exec playwright test -g \"should handle catering inquiry with user authentication\"" "Running Authentication Test"
        ;;
    
    "validation"|"forms")
        run_test "pnpm exec playwright test -g \"should validate catering form fields\"" "Running Form Validation Test"
        ;;
    
    "trace")
        run_test "pnpm exec playwright test tests/e2e/06-catering-inquiry-enhanced.spec.ts --trace on-first-retry" "Running Enhanced Tests with Trace"
        ;;
    
    "help"|"-h"|"--help")
        echo ""
        echo "📖 Available Options:"
        echo ""
        echo "  enhanced (default)  - Run enhanced catering inquiry tests"
        echo "  original           - Run original catering tests"
        echo "  both               - Run all catering tests"
        echo "  ui                 - Run with Playwright UI"
        echo "  headed             - Run in headed mode (visible browser)"
        echo "  single             - Run only the main catering flow test"
        echo "  auth               - Run only authentication test"
        echo "  validation         - Run only form validation test"
        echo "  trace              - Run with trace on failure"
        echo "  help               - Show this help message"
        echo ""
        echo "📝 Examples:"
        echo "  ./scripts/test-catering.sh enhanced"
        echo "  ./scripts/test-catering.sh ui"
        echo "  ./scripts/test-catering.sh both"
        echo ""
        exit 0
        ;;
    
    *)
        echo "❌ Unknown option: $1"
        echo "💡 Use './scripts/test-catering.sh help' to see available options"
        exit 1
        ;;
esac

echo ""
echo "🎉 Catering test execution completed!"
echo "📋 View results in test-results/ directory"
echo "📖 See docs/testing/CATERING_TESTING_GUIDE.md for more info" 