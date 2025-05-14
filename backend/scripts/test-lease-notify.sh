#!/bin/bash
# This script tests the lease expiration notification functionality
# Save this as test-lease-notify.sh and make executable with chmod +x test-lease-notify.sh

# Load variables from .env file with support for variable interpolation
if [ -f .env ]; then
    # First load the raw variables
    export $(grep -v '^#' .env | xargs)
    
    # Handle interpolated variables
    eval "API_BASE=\"${DOMAIN_URL}:${PORT}\""
    AUTH_TOKEN="$BEARER_TOKEN"
else
    echo "Warning: .env file not found. Using default values."
    API_BASE="http://localhost:8080"
    AUTH_TOKEN="default_token_placeholder"
fi

echo "==================== LEASE EXPIRATION NOTIFICATION TEST ===================="
echo "Checking for leases expiring soon and sending notifications..."

if [ -n "${CRON_SECRET_TOKEN}" ]; then
  # Use cron endpoint if CRON_SECRET_TOKEN is set
  curl -s -X POST "${API_BASE}/cron/leases/notify-expiring" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${CRON_SECRET_TOKEN}" | jq '.'
else
  # Fallback to authenticated admin endpoint
  curl -s -X POST "${API_BASE}/admin/leases/notify-expiring" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" | jq '.'
fi

echo ""
echo "==================== LEASE NOTIFICATION TEST COMPLETED ===================="