#!/bin/bash

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Parse command line arguments
DEBUG_MODE="false"
AUTO_APPROVE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --debug)
      DEBUG_MODE="true"
      shift
      ;;
    --auto-approve)
      AUTO_APPROVE="-auto-approve"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--debug] [--auto-approve]"
      exit 1
      ;;
  esac
done

# Initialize - directly find the project root first
PROJECT_ROOT=$(find_project_root)

# Now initialize the script properly
init_script "RentDaddy Terraform Apply" terraform aws

# Load AWS configuration
load_aws_config "$PROJECT_ROOT"

# Navigate to the Terraform directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOYMENT_DIR="$(cd "$(dirname "$SCRIPT_DIR")" && pwd)"
TERRAFORM_DIR="$DEPLOYMENT_DIR/simplified_terraform"

log "Script directory: $SCRIPT_DIR"
log "Deployment directory: $DEPLOYMENT_DIR"
log "Terraform directory path: $TERRAFORM_DIR"

if [ ! -d "$TERRAFORM_DIR" ]; then
  log "Error: Could not find Terraform directory at $TERRAFORM_DIR"
  exit 1
fi

cd "$TERRAFORM_DIR"
log "Terraform directory: $(pwd)"

# Set a unique deployment version
DEPLOY_VERSION=$(date +%Y%m%d%H%M%S)
log "Setting deploy version: $DEPLOY_VERSION"

# Check internet connectivity
log "Checking internet connectivity..."
if ! ping -c 1 -W 3 8.8.8.8 &>/dev/null; then
  log "ERROR: No internet connectivity detected. Check your network connection."
  exit 1
fi

# Check AWS connectivity
log "Checking AWS connectivity..."
if ! ping -c 1 -W 3 sts.us-east-2.amazonaws.com &>/dev/null; then
  log "ERROR: Cannot reach AWS services. Check your network connection and DNS."
  exit 1
fi

# Initialize Terraform
log "Initializing Terraform..."
if ! terraform init; then
  log "ERROR: Terraform initialization failed."
  exit 1
fi

# Check if terraform.tfvars exists and inform the user
if [ -f "terraform.tfvars" ]; then
  log "Using custom variables from terraform.tfvars"
else
  log "No terraform.tfvars found. Using default values or environment variables."
  log "Consider creating terraform.tfvars from terraform.tfvars.example for customization."
fi

# Apply Terraform with our deploy version
log "Applying Terraform changes..."
if terraform apply -var="deploy_version=$DEPLOY_VERSION" -var="debug_mode=$DEBUG_MODE" $AUTO_APPROVE; then
  log "Terraform apply completed successfully!"
  log "New deployment has been initiated with version: $DEPLOY_VERSION"
  log "Check AWS ECS console for deployment status."
else
  log "ERROR: Terraform apply failed!"
  exit 1
fi

# Return to the original directory if it exists
# Clean up PROJECT_ROOT to remove any newlines
PROJECT_ROOT=$(echo "$PROJECT_ROOT" | tr -d '\n')
if [ -d "$PROJECT_ROOT" ]; then
  cd "$PROJECT_ROOT"
else
  log "Warning: Project root directory '$PROJECT_ROOT' not found, staying in current directory"
fi