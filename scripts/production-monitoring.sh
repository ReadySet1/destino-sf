#!/bin/bash

# Production Monitoring Script - 48 Hour Intensive Monitoring
# Week 6, Day 2-3: Production Monitoring

echo "🚨 Starting 48-Hour Production Monitoring - $(date)"
echo "📊 Production URL: https://destino-467b47ljb-ready-sets-projects.vercel.app"
echo "============================================================"

# Configuration
PROD_URL="https://destino-467b47ljb-ready-sets-projects.vercel.app"
MONITORING_INTERVAL=300  # 5 minutes for first 2 hours
LOG_FILE="production-monitoring-$(date +%Y%m%d).log"

# Health Check Function
health_check() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Basic health check
    local health_response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$PROD_URL/api/health")
    local health_status=$(echo $health_response | cut -d',' -f1)
    local health_time=$(echo $health_response | cut -d',' -f2)
    
    # Detailed health check
    local detailed_response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$PROD_URL/api/health/detailed")
    local detailed_status=$(echo $detailed_response | cut -d',' -f1)
    local detailed_time=$(echo $detailed_response | cut -d',' -f2)
    
    # Homepage check
    local homepage_response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$PROD_URL/")
    local homepage_status=$(echo $homepage_response | cut -d',' -f1)
    local homepage_time=$(echo $homepage_response | cut -d',' -f2)
    
    # Log results
    echo "[$timestamp] Health: $health_status (${health_time}s) | Detailed: $detailed_status (${detailed_time}s) | Homepage: $homepage_status (${homepage_time}s)" | tee -a "$LOG_FILE"
    
    # Alert if response time > 1s or status != 200
    if (( $(echo "$health_time > 1.0" | bc -l) )) || [ "$health_status" != "200" ]; then
        echo "🚨 ALERT: Health check issue - Status: $health_status, Time: ${health_time}s" | tee -a "$LOG_FILE"
    fi
    
    if (( $(echo "$detailed_time > 2.0" | bc -l) )) || [ "$detailed_status" != "200" ]; then
        echo "🚨 ALERT: Detailed health check issue - Status: $detailed_status, Time: ${detailed_time}s" | tee -a "$LOG_FILE"
    fi
    
    if (( $(echo "$homepage_time > 3.0" | bc -l) )) || [ "$homepage_status" != "200" ]; then
        echo "🚨 ALERT: Homepage issue - Status: $homepage_status, Time: ${homepage_time}s" | tee -a "$LOG_FILE"
    fi
}

# Performance Test Function
performance_test() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] Running performance test..." | tee -a "$LOG_FILE"
    
    # Run lightweight performance test
    k6 run tests/load/health-check.js --env BASE_URL="$PROD_URL" --duration 30s --vus 5 --quiet >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "[$timestamp] ✅ Performance test completed successfully" | tee -a "$LOG_FILE"
    else
        echo "[$timestamp] ⚠️ Performance test had issues" | tee -a "$LOG_FILE"
    fi
}

# Business Metrics Check
business_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] Checking business metrics..." | tee -a "$LOG_FILE"
    
    # Check products page
    local products_response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$PROD_URL/products")
    local products_status=$(echo $products_response | cut -d',' -f1)
    local products_time=$(echo $products_response | cut -d',' -f2)
    
    # Check cart functionality
    local cart_response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$PROD_URL/cart")
    local cart_status=$(echo $cart_response | cut -d',' -f1)
    local cart_time=$(echo $cart_response | cut -d',' -f2)
    
    # Check catering page
    local catering_response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" "$PROD_URL/catering")
    local catering_status=$(echo $catering_response | cut -d',' -f1)
    local catering_time=$(echo $catering_response | cut -d',' -f2)
    
    echo "[$timestamp] Products: $products_status (${products_time}s) | Cart: $cart_status (${cart_time}s) | Catering: $catering_status (${catering_time}s)" | tee -a "$LOG_FILE"
}

# Initial deployment validation
echo "🔍 Initial Production Validation - $(date)" | tee -a "$LOG_FILE"
health_check
business_metrics
performance_test

echo ""
echo "📈 Starting continuous monitoring..."
echo "🕐 Monitoring interval: $MONITORING_INTERVAL seconds (5 minutes)"
echo "📋 Log file: $LOG_FILE"
echo "🛑 Press Ctrl+C to stop monitoring"
echo ""

# Continuous monitoring loop
monitor_count=0
while true; do
    monitor_count=$((monitor_count + 1))
    
    echo "🔄 Monitor cycle $monitor_count - $(date)"
    health_check
    
    # Every 6th cycle (30 minutes), run business metrics
    if [ $((monitor_count % 6)) -eq 0 ]; then
        business_metrics
    fi
    
    # Every 12th cycle (1 hour), run performance test
    if [ $((monitor_count % 12)) -eq 0 ]; then
        performance_test
    fi
    
    # Adjust monitoring interval based on time since deployment
    if [ $monitor_count -gt 24 ]; then  # After 2 hours
        MONITORING_INTERVAL=1800  # 30 minutes
        echo "🕐 Switching to 30-minute monitoring interval"
    fi
    
    if [ $monitor_count -gt 48 ]; then  # After 24 hours
        MONITORING_INTERVAL=3600  # 1 hour
        echo "🕐 Switching to 1-hour monitoring interval"
    fi
    
    sleep $MONITORING_INTERVAL
done 