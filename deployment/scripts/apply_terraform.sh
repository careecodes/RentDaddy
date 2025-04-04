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

# Navigate to the Terraform directory
cd "$PROJECT_ROOT/deployment/simplified_terraform"

# Set a unique deployment version
DEPLOY_VERSION=$(date +%Y%m%d%H%M%S)
log "Setting deploy version: $DEPLOY_VERSION"

# Initialize Terraform
log "Initializing Terraform..."
terraform init

# Apply Terraform with our deploy version
log "Applying Terraform changes..."
terraform apply -var="deploy_version=$DEPLOY_VERSION" -var="debug_mode=false" -auto-approve

log "Terraform apply completed successfully!"
log "New deployment has been initiated with version: $DEPLOY_VERSION"
log "Check AWS ECS console for deployment status."

# Return to the original directory
cd "$PROJECT_ROOT"