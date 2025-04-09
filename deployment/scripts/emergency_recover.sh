#!/bin/bash
set -e

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Print banner for script start
print_banner "RentDaddy Emergency Recovery"

# Find project root directly
PROJECT_ROOT=$(find_project_root)
log "Project root directory: $PROJECT_ROOT"

# Verify AWS CLI is installed
verify_requirements aws

# Load AWS configuration
load_aws_config "$PROJECT_ROOT"

# Set variables
CLUSTER_NAME="rentdaddy-cluster"
APP_SERVICE="rentdaddy-app-service"
DOCUMENSO_SERVICE="rentdaddy-documenso-service"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEPLOY_DIR="$PROJECT_ROOT/deployment/simplified_terraform/ecs_recovery_$TIMESTAMP"

mkdir -p "$DEPLOY_DIR"
log "Created recovery directory: $DEPLOY_DIR"

# Step 1: Apply terraform changes
log "Step 1: Applying terraform changes..."
cd "$PROJECT_ROOT/deployment/simplified_terraform"

# Apply terraform changes
terraform apply -auto-approve
if [ $? -ne 0 ]; then
  log "Error: Terraform apply failed."
  exit 1
fi
log "Terraform applied successfully."

# Step 2: Force new deployment with increased task memory
log "Step 2: Forcing new deployments with increased memory allocation..."

# Force new deployment of documenso service
log "Updating documenso service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $DOCUMENSO_SERVICE \
  --force-new-deployment \
  > "$DEPLOY_DIR/${DOCUMENSO_SERVICE}_$(date +%H%M%S).json"

log "Updating app service..."
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $APP_SERVICE \
  --force-new-deployment \
  > "$DEPLOY_DIR/${APP_SERVICE}_$(date +%H%M%S).json"

# Step 3: Monitor health
log "Step 3: Monitoring health (will check every 30 seconds for up to 10 minutes)..."

# Define endpoints to monitor
endpoints=(
  "https://app.curiousdev.net"
  "https://docs.curiousdev.net" 
  "https://api.curiousdev.net"
)

# Check health for up to 10 minutes
max_checks=20
for ((i=1; i<=$max_checks; i++)); do
  log "Health check attempt $i of $max_checks..."
  
  # Wait 30 seconds between checks
  sleep 30
  
  # Check each endpoint
  all_healthy=true
  for endpoint in "${endpoints[@]}"; do
    status_code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "$endpoint" || echo "Failed")
    
    if [[ "$status_code" == "2"* ]]; then
      log "✅ $endpoint is healthy (HTTP $status_code)"
    else
      log "❌ $endpoint is not healthy (HTTP $status_code)"
      all_healthy=false
    fi
  done
  
  # If all are healthy, we're done
  if $all_healthy; then
    log "🎉 All services are healthy!"
    break
  fi
  
  # If not all healthy and we've reached max attempts, show service status
  if [ $i -eq $max_checks ]; then
    log "📋 Some services are still unhealthy after $max_checks attempts."
    log "📋 Getting service details..."
    
    # Describe services 
    aws ecs describe-services \
      --cluster $CLUSTER_NAME \
      --services $APP_SERVICE $DOCUMENSO_SERVICE \
      > "$DEPLOY_DIR/services_final_status.json"
      
    # Get task details
    TASKS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --output text --query taskArns)
    if [ -n "$TASKS" ]; then
      aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASKS > "$DEPLOY_DIR/tasks_final_status.json"
    fi
    
    log "Service details saved to $DEPLOY_DIR"
  fi
done

log "Recovery process complete. Check $DEPLOY_DIR for logs."