#!/bin/bash
set -e

# Load utility functions
source "$(dirname "$0")/utils.sh"

# Initialize
PROJECT_ROOT=$(find_project_root)
log "Project root directory: $PROJECT_ROOT"

# Set up output directory
OUTPUT_DIR="$PROJECT_ROOT/deployment/simplified_terraform/target_check"
mkdir -p "$OUTPUT_DIR"
log "Output directory: $OUTPUT_DIR"

# Get all target groups
log "Getting all target groups..."
aws elbv2 describe-target-groups --output json > "$OUTPUT_DIR/all_target_groups.json"

# Extract each target group ARN
FRONTEND_TG=$(jq -r '.TargetGroups[] | select(.TargetGroupName == "frontend-tg") | .TargetGroupArn' "$OUTPUT_DIR/all_target_groups.json")
BACKEND_TG=$(jq -r '.TargetGroups[] | select(.TargetGroupName == "backend-tg") | .TargetGroupArn' "$OUTPUT_DIR/all_target_groups.json")
DOCUMENSO_TG=$(jq -r '.TargetGroups[] | select(.TargetGroupName == "documenso-tg") | .TargetGroupArn' "$OUTPUT_DIR/all_target_groups.json")

log "Frontend TG: $FRONTEND_TG"
log "Backend TG: $BACKEND_TG"
log "Documenso TG: $DOCUMENSO_TG"

# Check health of each target group
log "Getting frontend target health..."
aws elbv2 describe-target-health --target-group-arn "$FRONTEND_TG" > "$OUTPUT_DIR/frontend_targets.json"

log "Getting backend target health..."
aws elbv2 describe-target-health --target-group-arn "$BACKEND_TG" > "$OUTPUT_DIR/backend_targets.json"

log "Getting documenso target health..."
aws elbv2 describe-target-health --target-group-arn "$DOCUMENSO_TG" > "$OUTPUT_DIR/documenso_targets.json"

log "Target health info saved to $OUTPUT_DIR"

# Print a summary
log "===== FRONTEND TARGETS ====="
jq -r '.TargetHealthDescriptions[] | "\(.Target.Id):\(.Target.Port) - \(.TargetHealth.State) (\(.TargetHealth.Reason // "No reason"))"' "$OUTPUT_DIR/frontend_targets.json"

log "===== BACKEND TARGETS ====="
jq -r '.TargetHealthDescriptions[] | "\(.Target.Id):\(.Target.Port) - \(.TargetHealth.State) (\(.TargetHealth.Reason // "No reason"))"' "$OUTPUT_DIR/backend_targets.json"

log "===== DOCUMENSO TARGETS ====="
jq -r '.TargetHealthDescriptions[] | "\(.Target.Id):\(.Target.Port) - \(.TargetHealth.State) (\(.TargetHealth.Reason // "No reason"))"' "$OUTPUT_DIR/documenso_targets.json"

# Also check the instances running the tasks
log "===== INSTANCE INFO ====="
aws ec2 describe-instances --instance-ids $(jq -r '.TargetHealthDescriptions[].Target.Id' "$OUTPUT_DIR/frontend_targets.json" "$OUTPUT_DIR/backend_targets.json" "$OUTPUT_DIR/documenso_targets.json" | sort | uniq) > "$OUTPUT_DIR/instances.json"

# Extract instance types
jq -r '.Reservations[].Instances[] | "\(.InstanceId) - \(.InstanceType) - \(.State.Name)"' "$OUTPUT_DIR/instances.json"

log "Done checking target health"