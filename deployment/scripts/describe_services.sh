#!/bin/bash

# Set variables
CLUSTER_NAME="rentdaddy-cluster"
BASE_DIR="../simplified_terraform/describe-services"
SERVICES=(
  # "rentdaddy-main-postgres-service"
  # "rentdaddy-documenso-postgres-service"
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
  echo "Fetching details for $service..."
  
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
    echo "Service description saved to $OUTPUT_PATH"
  else
    echo "Failed to get description for $service"
  fi
}

# Main execution
echo "Starting ECS service description capture for $CLUSTER_NAME"
echo "Storing files in $BASE_DIR"

for service in "${SERVICES[@]}"; do
  get_service_description "$service"
done

echo "Completed capturing service descriptions"