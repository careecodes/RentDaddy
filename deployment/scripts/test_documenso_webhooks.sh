#!/bin/bash

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Initialize
PROJECT_ROOT=$(find_project_root)
init_script "Documenso Webhook Testing Plan" aws

# Load AWS configuration
load_aws_config "$PROJECT_ROOT"

log "=== DOCUMENSO WEBHOOK TESTING PLAN ==="
log ""
log "This test plan will help verify that the backend properly processes Documenso webhooks."
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
log "   - Check backend logs for webhook processing: "
log "     aws logs filter-log-events --log-group-name /ecs/rentdaddy-backend --filter-pattern 'webhook'"
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
log "   - Check backend logs for incoming webhook requests:"
log "     aws logs filter-log-events --log-group-name /ecs/rentdaddy-backend --filter-pattern 'webhook'"
log "   - Confirm webhook URL is correct: https://api.curiousdev.net/webhooks/documenso"
log "   - Verify the webhook is properly configured in Documenso"
log ""
log "=== END OF TEST PLAN ==="