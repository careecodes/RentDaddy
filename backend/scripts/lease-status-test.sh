#!/bin/bash
# This script tests the lease status update functionality
# Save this as test-lease-status.sh and make executable with chmod +x test-lease-status.sh

# Load variables from .env file with support for variable interpolation
if [ -f .env ]; then
    # First load the raw variables
    export $(grep -v '^#' .env | xargs)
    
    # Handle interpolated variables like DOCUMENSO_API_URL
    # This processes variables that reference other variables
    eval "API_BASE=\"${DOMAIN_URL}:${PORT}\""
    AUTH_TOKEN="$BEARER_TOKEN"
else
    echo "Warning: .env file not found. Using default values."
    API_BASE="http://localhost:8080"
    AUTH_TOKEN="default_token_placeholder"
fi

echo "Using API_BASE: $API_BASE"
echo "Using AUTH_TOKEN: ${AUTH_TOKEN:0:10}..." # Show first 10 chars for verification

echo "==================== LEASE STATUS UPDATE TEST ===================="
echo "1. Getting current lease statuses..."
curl -s -X GET "${API_BASE}/admin/tenants/leases/" | jq '.' > before_update.json
echo "Current lease statuses saved to before_update.json"

echo ""
echo "2. Running lease status update..."
curl -s -X POST "${API_BASE}/admin/tenants/leases/update-statuses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}"
echo ""

echo "3. Getting updated lease statuses..."
sleep 1  # Brief pause to ensure updates are processed
curl -s -X GET "${API_BASE}/admin/tenants/leases/" | jq '.' > ./after_update.json
echo "Updated lease statuses saved to after_update.json"

echo ""
echo "4. Comparing statuses before and after update..."
echo "Leases that changed status:"
diff -y <(jq -r '.[] | "\(.id): \(.status)"' before_update.json) <(jq -r '.[] | "\(.id): \(.status)"' after_update.json)

echo ""
echo "==================== LEASE STATUS UPDATE TEST COMPLETED ===================="