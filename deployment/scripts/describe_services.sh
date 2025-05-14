#!/bin/bash
set -e

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Print banner for script start
print_banner "RentDaddy ECS Service Description"

# Find project root directly
PROJECT_ROOT=$(find_project_root)
log "Project root directory: $PROJECT_ROOT"

# Verify AWS CLI is installed
verify_requirements aws

# Set variables
CLUSTER_NAME="rentdaddy-cluster"
BASE_DIR="$PROJECT_ROOT/deployment/simplified_terraform/describe-services"
SERVICES=(
  "rentdaddy-app-service"
  "rentdaddy-documenso-service"
)

# Create the directory if it doesn't exist
mkdir -p "$BASE_DIR"

# Get current date in YYYY-MM-DD format
CURRENT_DATE=$(date +"%Y-%m-%d")

# Function to get service description and save to file
get_service_description() {
  local service=$1
  
  # Get the service description
  log "Fetching details for $service..."
  
  # Get current deployment number, removing any slashes
  DEPLOYMENT_INFO=$(aws ecs describe-services --cluster $CLUSTER_NAME --services $service \
    --query 'services[0].deployments[0].id' --output text)
  
  # Clean up the deployment info to make it safe for filenames
  DEPLOYMENT_NUMBER=$(echo "$DEPLOYMENT_INFO" | tr '/' '_')
  
  # If deployment number retrieval failed, use timestamp instead
  if [[ -z "$DEPLOYMENT_NUMBER" || "$DEPLOYMENT_NUMBER" == "None" ]]; then
    DEPLOYMENT_NUMBER=$(date +"%H%M%S")
  fi
  
  # Create filename with service name, deployment number and date
  FILENAME="${service}_${DEPLOYMENT_NUMBER}_${CURRENT_DATE}.json"
  OUTPUT_PATH="$BASE_DIR/$FILENAME"
  
  # Get the full service description and save to file
  aws ecs describe-services --cluster $CLUSTER_NAME --services $service > "$OUTPUT_PATH"
  
  if [ $? -eq 0 ]; then
    log "Service description saved to $OUTPUT_PATH"
  else
    log "Failed to get description for $service"
  fi
}

# Main execution
log "Starting ECS service description capture for $CLUSTER_NAME"
log "Storing files in $BASE_DIR"

for service in "${SERVICES[@]}"; do
  get_service_description "$service"
done

log "Completed capturing service descriptions"