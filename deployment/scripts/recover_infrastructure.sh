#!/bin/bash
set -e

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Print banner
print_banner "RentDaddy Infrastructure Recovery"

# Set project root explicitly
PROJECT_ROOT="/Users/reemmokhtar/Library/CloudStorage/OneDrive-Personal/Documents/DevOps/CYC_Prototype_Apartment/RentDaddy_Production/RentDaddy"
log "Project root directory: $PROJECT_ROOT"

# Verify required tools are installed
verify_requirements aws terraform

# Set AWS region from CLAUDE.md and account ID directly
export AWS_REGION="us-east-2"
export AWS_ACCOUNT_ID="168356498770"
log "Set AWS region to $AWS_REGION and account ID to $AWS_ACCOUNT_ID"

# Check that AWS CLI credentials are configured
if [ -f "$HOME/.aws/credentials" ]; then
  log "Found AWS CLI credentials at ~/.aws/credentials"
else
  log "Warning: AWS CLI credentials not found at ~/.aws/credentials"
  log "Make sure your AWS CLI is configured correctly"
fi

log "Starting infrastructure recovery process..."

# Step 1: Apply terraform changes
log "Step 1: Applying terraform changes to fix memory allocation and placement issues..."
cd "$PROJECT_ROOT/deployment/simplified_terraform"

# Terraform init and apply
log "Running terraform init..."
terraform init

log "Running terraform apply..."
terraform apply -auto-approve
if [ $? -ne 0 ]; then
  log "Error: Terraform apply failed. Check the error message above."
  exit 1
fi
log "Terraform changes applied successfully."

# Step 2: Build and push the latest backend image 
log "Step 2: Building and pushing latest backend image..."
cd "$PROJECT_ROOT/deployment/scripts"
./build_and_deploy_latest.sh
if [ $? -ne 0 ]; then
  log "Error: Build and deploy failed. Check the error message above."
  exit 1
fi
log "Build and deployment completed successfully."

# Step 3: Force a new deployment of all services
log "Step 3: Forcing new deployment of all services..."
./force_new_deployment_all.sh
if [ $? -ne 0 ]; then
  log "Error: Force new deployment failed. Check the error message above."
  exit 1
fi
log "Services redeployed successfully."

# Step 4: Monitor service health
log "Step 4: Monitoring service health (will check every 30 seconds for up to 10 minutes)..."

# Define endpoints to monitor
endpoints=(
  "https://app.curiousdev.net"
  "https://docs.curiousdev.net" 
  "https://api.curiousdev.net"
)

CLUSTER_NAME="rentdaddy-cluster"
APP_SERVICE="rentdaddy-app-service"
DOCUMENSO_SERVICE="rentdaddy-documenso-service"

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
    
    # Describe services for verification
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    LOG_DIR="$PROJECT_ROOT/deployment/simplified_terraform/service_status_$TIMESTAMP"
    mkdir -p "$LOG_DIR"
    
    log "Saving service details to $LOG_DIR"
    aws ecs describe-services \
      --cluster $CLUSTER_NAME \
      --services $APP_SERVICE $DOCUMENSO_SERVICE \
      > "$LOG_DIR/services_status.json"
      
    # Get tasks
    TASKS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --output text --query taskArns)
    if [ -n "$TASKS" ]; then
      aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASKS > "$LOG_DIR/tasks_status.json"
    fi
    
    break
  fi
  
  # If not all healthy and we've reached max attempts, show service status
  if [ $i -eq $max_checks ]; then
    log "📋 Some services are still unhealthy after $max_checks attempts."
    log "📋 Getting service details..."
    
    # Describe services 
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    LOG_DIR="$PROJECT_ROOT/deployment/simplified_terraform/service_status_$TIMESTAMP"
    mkdir -p "$LOG_DIR"
    
    aws ecs describe-services \
      --cluster $CLUSTER_NAME \
      --services $APP_SERVICE $DOCUMENSO_SERVICE \
      > "$LOG_DIR/services_status.json"
      
    # Get tasks
    TASKS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --output text --query taskArns)
    if [ -n "$TASKS" ]; then
      aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASKS > "$LOG_DIR/tasks_status.json"
    fi
    
    log "Service details saved to $LOG_DIR"
    log "Recovery process completed with some unhealthy endpoints. Manual intervention may be required."
    exit 1
  fi
done

log "🚀 Infrastructure recovery completed successfully!"