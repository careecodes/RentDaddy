#!/bin/bash
set -e

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Print banner for script start
print_banner "RentDaddy Documenso Webhook Resend"

# Find project root directly
PROJECT_ROOT=$(find_project_root)
log "Project root directory: $PROJECT_ROOT"

# Verify AWS CLI is installed
verify_requirements aws curl jq

# Get instance id for the target ECS container instance (where the backend is running)
CLUSTER_NAME="rentdaddy-cluster"
TASK_ARN=$(aws ecs list-tasks --cluster $CLUSTER_NAME --family rentdaddy-app --query 'taskArns[0]' --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" == "None" ]; then
  log "Error: No running backend task found in cluster $CLUSTER_NAME"
  exit 1
fi

log "Found backend task: $TASK_ARN"

# Get container instance ARN
CONTAINER_INSTANCE=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASK_ARN --query 'tasks[0].containerInstanceArn' --output text)
log "Container instance ARN: $CONTAINER_INSTANCE"

# Get EC2 instance ID
EC2_INSTANCE=$(aws ecs describe-container-instances --cluster $CLUSTER_NAME --container-instances $CONTAINER_INSTANCE --query 'containerInstances[0].ec2InstanceId' --output text)
log "EC2 instance ID: $EC2_INSTANCE"

# Get IP address
INSTANCE_IP=$(aws ec2 describe-instances --instance-ids $EC2_INSTANCE --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
log "Instance IP: $INSTANCE_IP"

# Verify we can connect to the instance
log "Verifying SSH connectivity to $INSTANCE_IP..."
ssh -o ConnectTimeout=5 -o BatchMode=yes -o StrictHostKeyChecking=accept-new ec2-user@$INSTANCE_IP exit &>/dev/null
if [ $? -ne 0 ]; then
  log "Error: Cannot connect to EC2 instance $INSTANCE_IP via SSH"
  exit 1
fi
log "SSH connection successful"

# Creating the webhook resend script
log "Creating webhook resend script on the instance..."
WEBHOOK_SECRET="4a2357d9ebe0bf092ac90142a5673774f493954632da600bbc675f19fe512bdb"

ssh ec2-user@$INSTANCE_IP "cat > /tmp/resend_webhooks.sh" <<EOF
#!/bin/bash
# Script to resend Documenso webhook events for completed documents
set -e

echo "=== Documenso Webhook Resend Tool ==="

# Get container ID of the backend container
BACKEND_CONTAINER=\$(docker ps --filter name=backend --format "{{.ID}}")
if [ -z "\$BACKEND_CONTAINER" ]; then
  echo "Error: Backend container not found"
  exit 1
fi

echo "Found backend container: \$BACKEND_CONTAINER"

# Determine whether to query database directly or use the backend container
if command -v psql &> /dev/null && [ -n "\$POSTGRES_PASSWORD" ]; then
  echo "Using local psql to query database"
  
  # Query the database for leases with pending_approval status but with external_doc_id
  PENDING_LEASES=\$(psql -h main-postgres -U appuser -d appdb -t -c "
    SELECT id, external_doc_id 
    FROM leases 
    WHERE status = 'pending_approval' 
    AND external_doc_id IS NOT NULL 
    AND external_doc_id != '';
  ")
else
  echo "Using backend container to query database"
  
  # Run the query inside the backend container
  PENDING_LEASES=\$(docker exec \$BACKEND_CONTAINER sh -c '
    echo "SELECT id, external_doc_id FROM leases WHERE status = '\''pending_approval'\'' AND external_doc_id IS NOT NULL AND external_doc_id != '\''';" | 
    PGPASSWORD=\$POSTGRES_PASSWORD psql -h main-postgres -U appuser -d appdb -t
  ')
fi

if [ -z "\$PENDING_LEASES" ]; then
  echo "No pending leases with document IDs found"
  exit 0
fi

# Count how many leases we found
LEASE_COUNT=\$(echo "\$PENDING_LEASES" | grep -v "^$" | wc -l)
echo "Found \$LEASE_COUNT leases with pending documents"

# Process each lease
echo "\$PENDING_LEASES" | grep -v "^$" | while read -r line; do
  LEASE_ID=\$(echo "\$line" | awk '{print \$1}')
  DOC_ID=\$(echo "\$line" | awk '{print \$2}')
  
  if [ -z "\$LEASE_ID" ] || [ -z "\$DOC_ID" ]; then
    echo "Error: Invalid lease or document ID"
    continue
  fi
  
  echo "Processing lease \$LEASE_ID with document \$DOC_ID"
  
  # Create webhook payload
  PAYLOAD="{\"event\":\"DOCUMENT_COMPLETED\",\"payload\":{\"id\":\$DOC_ID}}"
  
  # Send webhook directly to the backend container
  echo "Sending webhook for document \$DOC_ID..."
  curl -s -X POST -H "Content-Type: application/json" -H "X-Documenso-Secret: ${WEBHOOK_SECRET}" \
       -d "\$PAYLOAD" http://localhost:8080/webhooks/documenso
  
  echo "Webhook sent for document \$DOC_ID"
  
  # Wait a moment between requests
  sleep 1
done

echo "Webhook resend process completed"
EOF

# Make script executable
ssh ec2-user@$INSTANCE_IP "chmod +x /tmp/resend_webhooks.sh"

# Execute the script
log "Executing webhook resend script on the instance..."
ssh ec2-user@$INSTANCE_IP "sudo /tmp/resend_webhooks.sh"

log "✅ Webhook resend completed. Check backend logs for processing status."