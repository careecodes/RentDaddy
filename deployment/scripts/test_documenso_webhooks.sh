#!/bin/bash
set -e

# Log function for better output
log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to load environment variables from a file
load_env() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    log "Loading environment variables from $env_file"
    set -a # automatically export all variables
    source "$env_file"
    set +a
  else
    log "Warning: Environment file $env_file not found!"
    return 1
  fi
}

# Navigate to the project root
PROJECT_ROOT="/Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy"
cd "$PROJECT_ROOT"

# Load environment variables
load_env "$PROJECT_ROOT/backend/.env.production.local"

log "=== DOCUMENSO WEBHOOK TESTING PLAN ==="
log ""
log "This test plan will help verify that the documenso-worker is properly forwarding webhook events."
log ""
log "1. Test Sending a Lease Agreement:"
log "   - Go to the admin dashboard: https://app.curiousdev.net/admin/leases"
log "   - Create a new lease"
log "   - Send it to a test tenant email"
log "   - Verify the lease status is 'SENT'"
log ""
log "2. Test Lease Signing (Webhook):"
log "   - Access the tenant email and sign the lease"
log "   - Return to the admin dashboard and monitor the lease status"
log "   - The status should automatically update to 'ACTIVE' when the webhook is received"
log "   - Check logs to verify webhook processing: "
log "     aws logs filter-log-events --log-group-name /ecs/rentdaddy-documenso --filter-pattern 'webhook'"
log ""
log "3. Test Lease Amendment (Webhook):"
log "   - Go to an active lease and create an amendment"
log "   - When all parties sign, verify status updates automatically"
log ""
log "4. Test Lease Termination (Webhook):"
log "   - Go to an active lease and initiate termination"
log "   - When all parties sign, verify status updates automatically"
log ""
log "5. Troubleshooting Steps:"
log "   - If webhooks aren't being processed, check documenso-worker logs:"
log "     aws logs filter-log-events --log-group-name /ecs/rentdaddy-documenso --filter-pattern 'documenso-worker'"
log "   - Verify that the worker can connect to the Documenso database"
log "   - Confirm webhook URL is correct: https://api.curiousdev.net/admin/leases/webhooks/documenso"
log "   - Check backend logs for incoming webhook requests"
log ""
log "=== END OF TEST PLAN ==="