#!/bin/bash

# Load Testing Script for Destino SF
# Runs comprehensive load tests using K6

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-test-webhook-secret-key}"
RESULTS_DIR="test-results/load-tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🚀 Load Testing Suite - Destino SF${NC}"
echo -e "${YELLOW}Testing against: ${BASE_URL}${NC}"
echo -e "${YELLOW}Results will be saved to: ${RESULTS_DIR}${NC}"
echo

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to run a test and capture results
run_test() {
    local test_name=$1
    local test_file=$2
    local additional_env=$3
    
    echo -e "${BLUE}Running $test_name...${NC}"
    
    # Set environment variables
    export BASE_URL="$BASE_URL"
    export WEBHOOK_SECRET="$WEBHOOK_SECRET"
    
    # Add any additional environment variables
    if [ -n "$additional_env" ]; then
        eval "export $additional_env"
    fi
    
    # Run the test
    local output_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}"
    
    if npx k6 run "$test_file" \
        --out json="${output_file}.json" \
        --out summary="${output_file}_summary.txt" \
        --summary-trend-stats="min,avg,med,max,p(90),p(95),p(99)" \
        --summary-export="${output_file}_export.json" \
        > "${output_file}.log" 2>&1; then
        
        echo -e "${GREEN}✅ $test_name completed successfully${NC}"
        
        # Extract key metrics
        local avg_response_time=$(grep -o '"avg":[0-9.]*' "${output_file}.json" | tail -1 | cut -d: -f2)
        local p95_response_time=$(grep -o '"p(95)":[0-9.]*' "${output_file}.json" | tail -1 | cut -d: -f2)
        local error_rate=$(grep -o '"rate":[0-9.]*' "${output_file}.json" | grep -A1 "http_req_failed" | tail -1 | cut -d: -f2)
        
        echo -e "   ${YELLOW}Avg Response Time: ${avg_response_time}ms${NC}"
        echo -e "   ${YELLOW}P95 Response Time: ${p95_response_time}ms${NC}"
        echo -e "   ${YELLOW}Error Rate: ${error_rate}%${NC}"
        
    else
        echo -e "${RED}❌ $test_name failed${NC}"
        echo -e "${RED}Check logs: ${output_file}.log${NC}"
        return 1
    fi
    
    echo
}

# Function to check if server is running
check_server() {
    echo -e "${BLUE}Checking if server is running...${NC}"
    
    if curl -s "$BASE_URL/api/health" > /dev/null; then
        echo -e "${GREEN}✅ Server is running${NC}"
        return 0
    else
        echo -e "${RED}❌ Server is not running at $BASE_URL${NC}"
        echo -e "${YELLOW}Please start the server with: pnpm dev${NC}"
        return 1
    fi
}

# Function to warm up the server
warm_up_server() {
    echo -e "${BLUE}Warming up server...${NC}"
    
    # Make a few requests to warm up the server
    for i in {1..5}; do
        curl -s "$BASE_URL/api/health" > /dev/null
        curl -s "$BASE_URL/api/health/detailed" > /dev/null
        sleep 1
    done
    
    echo -e "${GREEN}✅ Server warmed up${NC}"
    echo
}

# Function to generate consolidated report
generate_report() {
    echo -e "${BLUE}Generating consolidated report...${NC}"
    
    local report_file="$RESULTS_DIR/load_test_report_${TIMESTAMP}.md"
    
    cat > "$report_file" << EOF
# Load Testing Report - Destino SF

**Date:** $(date)
**Base URL:** $BASE_URL
**Environment:** ${NODE_ENV:-development}

## Test Results Summary

EOF

    # Process each test result
    for test_dir in "$RESULTS_DIR"/*_"$TIMESTAMP"*; do
        if [ -d "$test_dir" ]; then
            continue
        fi
        
        local test_name=$(basename "$test_dir" | sed "s/_${TIMESTAMP}.*//")
        local summary_file="${test_dir}_summary.txt"
        local export_file="${test_dir}_export.json"
        
        if [ -f "$summary_file" ]; then
            echo "### $test_name" >> "$report_file"
            echo "" >> "$report_file"
            echo "\`\`\`" >> "$report_file"
            cat "$summary_file" >> "$report_file"
            echo "\`\`\`" >> "$report_file"
            echo "" >> "$report_file"
        fi
    done
    
    echo -e "${GREEN}✅ Report generated: $report_file${NC}"
}

# Function to run pre-flight checks
pre_flight_checks() {
    echo -e "${BLUE}Running pre-flight checks...${NC}"
    
    # Check if K6 is installed
    if ! command -v k6 &> /dev/null && ! npx k6 --version &> /dev/null; then
        echo -e "${RED}❌ K6 is not installed${NC}"
        echo -e "${YELLOW}Installing K6...${NC}"
        pnpm add -D k6
    fi
    
    # Check if test files exist
    if [ ! -f "tests/load/health-check.js" ]; then
        echo -e "${RED}❌ Health check test file not found${NC}"
        return 1
    fi
    
    if [ ! -f "tests/load/webhook-processing.js" ]; then
        echo -e "${RED}❌ Webhook processing test file not found${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ Pre-flight checks passed${NC}"
    echo
}

# Function to show help
show_help() {
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -u, --url URL       Base URL for testing (default: http://localhost:3000)"
    echo "  -s, --secret SECRET Webhook secret for testing (default: test-webhook-secret-key)"
    echo "  -t, --test TEST     Run specific test only (health-check, webhook-processing, all)"
    echo "  --skip-warmup       Skip server warmup"
    echo "  --skip-checks       Skip pre-flight checks"
    echo ""
    echo "Examples:"
    echo "  $0                                 # Run all tests"
    echo "  $0 -t health-check                # Run only health check tests"
    echo "  $0 -u https://my-app.vercel.app   # Test against production"
    echo ""
}

# Parse command line arguments
SPECIFIC_TEST=""
SKIP_WARMUP=false
SKIP_CHECKS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -s|--secret)
            WEBHOOK_SECRET="$2"
            shift 2
            ;;
        -t|--test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        --skip-warmup)
            SKIP_WARMUP=true
            shift
            ;;
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    # Pre-flight checks
    if [ "$SKIP_CHECKS" = false ]; then
        pre_flight_checks
    fi
    
    # Check if server is running
    check_server || exit 1
    
    # Warm up server
    if [ "$SKIP_WARMUP" = false ]; then
        warm_up_server
    fi
    
    # Run tests
    local tests_run=0
    local tests_failed=0
    
    if [ "$SPECIFIC_TEST" = "" ] || [ "$SPECIFIC_TEST" = "health-check" ] || [ "$SPECIFIC_TEST" = "all" ]; then
        if run_test "health-check" "tests/load/health-check.js"; then
            tests_run=$((tests_run + 1))
        else
            tests_failed=$((tests_failed + 1))
        fi
    fi
    
    if [ "$SPECIFIC_TEST" = "" ] || [ "$SPECIFIC_TEST" = "webhook-processing" ] || [ "$SPECIFIC_TEST" = "all" ]; then
        if run_test "webhook-processing" "tests/load/webhook-processing.js"; then
            tests_run=$((tests_run + 1))
        else
            tests_failed=$((tests_failed + 1))
        fi
    fi
    
    # Generate report
    generate_report
    
    # Summary
    echo -e "${BLUE}Load Testing Summary:${NC}"
    echo -e "  ${GREEN}Tests Completed: $tests_run${NC}"
    echo -e "  ${RED}Tests Failed: $tests_failed${NC}"
    echo -e "  ${YELLOW}Results Directory: $RESULTS_DIR${NC}"
    echo
    
    if [ $tests_failed -gt 0 ]; then
        echo -e "${RED}❌ Some tests failed. Check the logs for details.${NC}"
        exit 1
    else
        echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
        exit 0
    fi
}

# Run main function
main "$@" 