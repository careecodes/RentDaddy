#!/bin/bash
set -e

# Print banner
echo "================================================================================"
echo "  Testing connectivity to RentDaddy endpoints"
echo "================================================================================"

# Define endpoints to test
ENDPOINTS=(
  "https://docs.curiousdev.net"
  "https://docs.curiousdev.net/api/healthcheck"
  "https://app.curiousdev.net"
  "https://app.curiousdev.net/healthz"
  "https://api.curiousdev.net"
  "https://api.curiousdev.net/healthz"
  "https://rentdaddy-alb-815446394.us-east-2.elb.amazonaws.com"
)

# Function to test connectivity to an endpoint
test_endpoint() {
  local url=$1
  local start_time=$(date +%s)
  
  # Try to get HTTP status code
  echo "Testing connectivity to $url..."
  status_code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 $url || echo "Failed")
  
  if [[ "$status_code" == "200" ]]; then
    echo "✅ $url is UP (HTTP 200)"
    return 0
  elif [[ "$status_code" == "Failed" ]]; then
    echo "❌ $url is unreachable (connection failed)"
    return 1
  else
    echo "⚠️  $url returned HTTP $status_code"
    return 1
  fi
}

# Test all endpoints in a loop until they're all available
max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
  echo "Attempt $attempt of $max_attempts:"
  
  failures=0
  for endpoint in "${ENDPOINTS[@]}"; do
    if ! test_endpoint "$endpoint"; then
      failures=$((failures + 1))
    fi
  done
  
  if [ $failures -eq 0 ]; then
    echo "🎉 All endpoints are UP!"
    exit 0
  fi
  
  # Wait before next attempt
  if [ $attempt -lt $max_attempts ]; then
    sleep_time=$((attempt * 5))
    echo "Waiting $sleep_time seconds before next attempt..."
    sleep $sleep_time
  fi
  
  attempt=$((attempt + 1))
done

echo "❌ Some endpoints are still down after $max_attempts attempts."
exit 1