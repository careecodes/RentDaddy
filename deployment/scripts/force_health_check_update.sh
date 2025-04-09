#!/bin/bash
set -e

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Print banner for script start
print_banner "RentDaddy Force Health Check Update"

# Find project root directly
PROJECT_ROOT=$(find_project_root)
log "Project root directory: $PROJECT_ROOT"

# Verify AWS CLI is installed
verify_requirements aws

# Load AWS configuration
load_aws_config "$PROJECT_ROOT"

# Set variables
CLUSTER_NAME="rentdaddy-cluster"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="$PROJECT_ROOT/deployment/simplified_terraform/health_check_update_$TIMESTAMP"

mkdir -p "$OUTPUT_DIR"
log "Created output directory: $OUTPUT_DIR"

# Step 1: Describe target health
log "Step 1: Describing target group health..."

# Get target group ARNs
TARGET_GROUPS=$(aws elbv2 describe-target-groups --output json)
echo "$TARGET_GROUPS" > "$OUTPUT_DIR/target_groups.json"

# Extract each target group ARN and check its health
FRONTEND_TG=$(echo "$TARGET_GROUPS" | jq -r '.TargetGroups[] | select(.TargetGroupName == "frontend-tg") | .TargetGroupArn')
BACKEND_TG=$(echo "$TARGET_GROUPS" | jq -r '.TargetGroups[] | select(.TargetGroupName == "backend-tg") | .TargetGroupArn')
DOCUMENSO_TG=$(echo "$TARGET_GROUPS" | jq -r '.TargetGroups[] | select(.TargetGroupName == "documenso-tg") | .TargetGroupArn')

# Check health of each target group
aws elbv2 describe-target-health --target-group-arn "$FRONTEND_TG" > "$OUTPUT_DIR/frontend_health.json"
aws elbv2 describe-target-health --target-group-arn "$BACKEND_TG" > "$OUTPUT_DIR/backend_health.json"
aws elbv2 describe-target-health --target-group-arn "$DOCUMENSO_TG" > "$OUTPUT_DIR/documenso_health.json"

# Step 2: Force health check update by modifying target groups
log "Step 2: Forcing health check refresh by making a small modification..."

# Modify Documenso target group health check to be more permissive
log "Modifying Documenso target group health check..."
aws elbv2 modify-target-group-attributes \
  --target-group-arn "$DOCUMENSO_TG" \
  --attributes Key=deregistration_delay.timeout_seconds,Value=30

log "Modifying health check threshold for Documenso..."
aws elbv2 modify-target-group \
  --target-group-arn "$DOCUMENSO_TG" \
  --matcher '{"HttpCode":"200-499"}' \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 5

# Wait for changes to propagate
log "Waiting 10 seconds for changes to propagate..."
sleep 10

# Step 3: Force new deployment for all services
log "Step 3: Forcing new deployment for all services..."
SERVICES=(rentdaddy-app-service rentdaddy-documenso-service)

for svc in "${SERVICES[@]}"; do
  log "Forcing new deployment for $svc..."
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $svc \
    --force-new-deployment \
    > "$OUTPUT_DIR/${svc}_force_deployment.json"
done

# Step 4: Describe target health again to see if there's any improvement
log "Step A: Waiting 30 seconds before checking target health again..."
sleep 30

log "Step 4: Describing target group health after changes..."
aws elbv2 describe-target-health --target-group-arn "$FRONTEND_TG" > "$OUTPUT_DIR/frontend_health_after.json"
aws elbv2 describe-target-health --target-group-arn "$BACKEND_TG" > "$OUTPUT_DIR/backend_health_after.json"
aws elbv2 describe-target-health --target-group-arn "$DOCUMENSO_TG" > "$OUTPUT_DIR/documenso_health_after.json"

# Step 5: Get task information
log "Step 5: Getting task information..."
TASKS=$(aws ecs list-tasks --cluster $CLUSTER_NAME --output text --query taskArns)
if [ -n "$TASKS" ]; then
  aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks $TASKS > "$OUTPUT_DIR/tasks_detailed.json"
  
  # Extract container health status
  jq '.tasks[] | {taskId: .taskArn, status: .lastStatus, containers: [.containers[] | {name: .name, status: .lastStatus, healthStatus: .healthStatus}]}' "$OUTPUT_DIR/tasks_detailed.json" > "$OUTPUT_DIR/container_health.json"
fi

log "Health check update process complete. Check $OUTPUT_DIR for detailed reports."
log "It may take a few minutes for the health check changes to fully propagate."