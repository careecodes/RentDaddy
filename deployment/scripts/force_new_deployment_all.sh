#!/bin/bash
set -e

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Print banner for script start
print_banner "RentDaddy Force New Deployment"

# Find project root directly
PROJECT_ROOT=$(find_project_root)
log "Project root directory: $PROJECT_ROOT"

# Verify AWS CLI is installed
verify_requirements aws

# Load AWS configuration
load_aws_config "$PROJECT_ROOT"

# Define the ECS cluster name
CLUSTER_NAME="rentdaddy-cluster"

# Create a directory to store deployment information
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
NEW_DEPLOYMENT_DIR="$PROJECT_ROOT/deployment/simplified_terraform/ecs_deployment_$TIMESTAMP"
mkdir -p "$NEW_DEPLOYMENT_DIR"
log "Deployment logs will be saved to: $NEW_DEPLOYMENT_DIR"

# Force new deployment for all services in the cluster
log "Forcing new deployment for all services in $CLUSTER_NAME..."
for svc_arn in $(aws ecs list-services --cluster $CLUSTER_NAME --query "serviceArns[]" --output text); do
  svc_name=$(basename "$svc_arn")
  log "📦 Forcing new deployment for $svc_name..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service "$svc_name" \
    --force-new-deployment \
    > "$NEW_DEPLOYMENT_DIR/${svc_name}.json"
done

log "All deployments have been initiated. Check AWS ECS console for status."
log "Deployment logs saved to: $NEW_DEPLOYMENT_DIR"